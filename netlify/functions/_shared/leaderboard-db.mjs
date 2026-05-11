import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash, randomUUID } from 'node:crypto';
import initSqlJs from 'sql.js';

export const LEADERBOARD_MODES = ['easy', 'medium', 'hard'];

const DB_KEY = 'leaderboard.sqlite';
const MAX_NAME_LENGTH = 16;
const MAX_LIMIT = 25;
const RATE_WINDOW_MS = 60_000;
const SESSION_TTL_MS = 45 * 60_000;
const MAX_DB_ENTRIES_PER_MODE = 600;

const MODE_LIMITS = {
    easy: { maxMetersPerSecond: 255, softMetersPerSecond: 215 },
    medium: { maxMetersPerSecond: 270, softMetersPerSecond: 225 },
    hard: { maxMetersPerSecond: 295, softMetersPerSecond: 245 }
};

let sqlPromise = null;

function resolveSqlWasmPath() {
    const require = createRequire(import.meta.url);
    const currentDir = dirname(fileURLToPath(import.meta.url));
    const candidates = [];

    try {
        candidates.push(require.resolve('sql.js/dist/sql-wasm.wasm'));
    } catch {
        // Bundlers may not expose package resolution at runtime.
    }

    candidates.push(
        join(process.cwd(), 'node_modules/sql.js/dist/sql-wasm.wasm'),
        join(currentDir, 'sql-wasm.wasm'),
        join(currentDir, '../sql-wasm.wasm')
    );

    return candidates.find(candidate => existsSync(candidate)) || 'sql-wasm.wasm';
}

function getSql() {
    if (!sqlPromise) {
        sqlPromise = initSqlJs({
            locateFile: () => resolveSqlWasmPath()
        });
    }

    return sqlPromise;
}

function hashValue(value, secret = 'aetheris-leaderboard') {
    return createHash('sha256')
        .update(String(secret))
        .update(':')
        .update(String(value || 'unknown'))
        .digest('hex');
}

function normalizeMode(mode) {
    return LEADERBOARD_MODES.includes(mode) ? mode : 'medium';
}

function normalizeName(name) {
    const cleaned = String(name || 'RUNNER')
        .normalize('NFKD')
        .replace(/[^\w -]/g, '')
        .trim()
        .replace(/\s+/g, ' ')
        .slice(0, MAX_NAME_LENGTH);

    return cleaned || 'RUNNER';
}

function normalizePositiveInt(value, fallback = 0) {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function nowIso(now) {
    return new Date(now).toISOString();
}

function readJson(value, fallback = []) {
    try {
        return JSON.parse(value);
    } catch {
        return fallback;
    }
}

function migrate(db) {
    db.run(`
        PRAGMA journal_mode = MEMORY;
        CREATE TABLE IF NOT EXISTS leaderboard_sessions (
            token TEXT PRIMARY KEY,
            mode TEXT NOT NULL,
            issued_at INTEGER NOT NULL,
            ip_hash TEXT NOT NULL,
            ua_hash TEXT NOT NULL,
            used INTEGER NOT NULL DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS leaderboard_entries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            mode TEXT NOT NULL,
            player_name TEXT NOT NULL,
            distance_m INTEGER NOT NULL,
            distance_px INTEGER NOT NULL,
            duration_ms INTEGER NOT NULL,
            submitted_at TEXT NOT NULL,
            client_run_id TEXT NOT NULL UNIQUE,
            session_token TEXT NOT NULL,
            ip_hash TEXT NOT NULL,
            ua_hash TEXT NOT NULL,
            integrity_score INTEGER NOT NULL,
            flags TEXT NOT NULL DEFAULT '[]',
            verified INTEGER NOT NULL DEFAULT 1
        );

        CREATE TABLE IF NOT EXISTS rejected_submissions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            mode TEXT NOT NULL,
            player_name TEXT NOT NULL,
            distance_m INTEGER NOT NULL,
            duration_ms INTEGER NOT NULL,
            submitted_at TEXT NOT NULL,
            client_run_id TEXT,
            session_token TEXT,
            ip_hash TEXT NOT NULL,
            flags TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS rate_limits (
            bucket TEXT PRIMARY KEY,
            window_start INTEGER NOT NULL,
            count INTEGER NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_entries_mode_rank
            ON leaderboard_entries(mode, verified, distance_m DESC, duration_ms ASC, submitted_at ASC);
        CREATE INDEX IF NOT EXISTS idx_sessions_issued_at
            ON leaderboard_sessions(issued_at);
        CREATE INDEX IF NOT EXISTS idx_rejected_submitted_at
            ON rejected_submissions(submitted_at);
    `);
}

function selectOne(db, sql, params = []) {
    const stmt = db.prepare(sql);

    try {
        stmt.bind(params);
        if (!stmt.step()) return null;
        return stmt.getAsObject();
    } finally {
        stmt.free();
    }
}

function selectAll(db, sql, params = []) {
    const stmt = db.prepare(sql);
    const rows = [];

    try {
        stmt.bind(params);
        while (stmt.step()) {
            rows.push(stmt.getAsObject());
        }
    } finally {
        stmt.free();
    }

    return rows;
}

function checkRateLimit(db, bucket, now, maxCount) {
    const row = selectOne(db, 'SELECT window_start, count FROM rate_limits WHERE bucket = ?', [bucket]);

    if (!row || now - row.window_start >= RATE_WINDOW_MS) {
        db.run(
            'INSERT OR REPLACE INTO rate_limits(bucket, window_start, count) VALUES (?, ?, ?)',
            [bucket, now, 1]
        );
        return { allowed: true, remaining: maxCount - 1 };
    }

    const nextCount = Number(row.count) + 1;
    db.run('UPDATE rate_limits SET count = ? WHERE bucket = ?', [nextCount, bucket]);

    return {
        allowed: nextCount <= maxCount,
        remaining: Math.max(0, maxCount - nextCount)
    };
}

function pruneDatabase(db, now) {
    db.run('DELETE FROM leaderboard_sessions WHERE used = 1 OR issued_at < ?', [now - SESSION_TTL_MS]);
    db.run('DELETE FROM rate_limits WHERE window_start < ?', [now - (RATE_WINDOW_MS * 3)]);
    db.run('DELETE FROM rejected_submissions WHERE submitted_at < ?', [nowIso(now - (14 * 24 * 60 * 60_000))]);

    LEADERBOARD_MODES.forEach(mode => {
        db.run(`
            DELETE FROM leaderboard_entries
            WHERE mode = ?
              AND id NOT IN (
                SELECT id
                FROM leaderboard_entries
                WHERE mode = ?
                ORDER BY verified DESC, distance_m DESC, duration_ms ASC, submitted_at ASC
                LIMIT ?
              )
        `, [mode, mode, MAX_DB_ENTRIES_PER_MODE]);
    });
}

async function withDatabase(storage, operation) {
    const SQL = await getSql();
    const bytes = await storage.getDatabaseBytes();
    const db = bytes ? new SQL.Database(bytes) : new SQL.Database();

    migrate(db);

    try {
        const result = await operation(db);
        const exported = db.export();
        await storage.setDatabaseBytes(exported);
        return result;
    } finally {
        db.close();
    }
}

export function createBlobStorage(store) {
    return {
        async getDatabaseBytes() {
            const data = await store.get(DB_KEY, { type: 'arrayBuffer' });
            return data ? new Uint8Array(data) : null;
        },

        async setDatabaseBytes(bytes) {
            await store.set(DB_KEY, Buffer.from(bytes), {
                metadata: {
                    contentType: 'application/x-sqlite3',
                    updatedAt: new Date().toISOString()
                }
            });
        }
    };
}

export function createMemoryStorage(initialBytes = null) {
    let current = initialBytes ? new Uint8Array(initialBytes) : null;

    return {
        async getDatabaseBytes() {
            return current ? new Uint8Array(current) : null;
        },

        async setDatabaseBytes(bytes) {
            current = new Uint8Array(bytes);
        }
    };
}

export async function createLeaderboardSession({ storage, mode, client, now = Date.now(), secret }) {
    const safeMode = normalizeMode(mode);
    const ipHash = hashValue(client.ip, secret);
    const uaHash = hashValue(client.userAgent, secret);

    return withDatabase(storage, async db => {
        pruneDatabase(db, now);

        const rate = checkRateLimit(db, `session:${ipHash}`, now, 30);
        if (!rate.allowed) {
            return {
                ok: false,
                error: 'rate_limited',
                retryAfterMs: RATE_WINDOW_MS
            };
        }

        const token = randomUUID();
        db.run(
            'INSERT INTO leaderboard_sessions(token, mode, issued_at, ip_hash, ua_hash, used) VALUES (?, ?, ?, ?, ?, 0)',
            [token, safeMode, now, ipHash, uaHash]
        );

        return {
            ok: true,
            token,
            mode: safeMode,
            issuedAt: now,
            expiresAt: now + SESSION_TTL_MS
        };
    });
}

function evaluateSubmission({ payload, session, now }) {
    const flags = [];
    const mode = normalizeMode(payload.mode);
    const distancePx = normalizePositiveInt(payload.distancePx, 0);
    const distanceM = normalizePositiveInt(payload.distanceM, Math.floor(distancePx / 10));
    const durationMs = normalizePositiveInt(payload.durationMs, 0);
    const limits = MODE_LIMITS[mode] || MODE_LIMITS.medium;
    let integrityScore = 100;

    if (!session) {
        flags.push('missing_session');
        integrityScore -= 55;
    } else {
        if (session.mode !== mode) {
            flags.push('mode_mismatch');
            integrityScore -= 45;
        }
        if (Number(session.used) === 1) {
            flags.push('session_reuse');
            integrityScore -= 60;
        }
        if (now - Number(session.issued_at) > SESSION_TTL_MS) {
            flags.push('expired_session');
            integrityScore -= 35;
        }
        if (durationMs > 0 && durationMs > (now - Number(session.issued_at)) + 12_000) {
            flags.push('duration_ahead_of_server_clock');
            integrityScore -= 30;
        }
    }

    if (distanceM <= 0 || distancePx <= 0) {
        flags.push('empty_score');
        integrityScore -= 70;
    }

    if (distanceM > 1_000_000 || distancePx > 10_000_000) {
        flags.push('score_overflow');
        integrityScore -= 90;
    }

    if (durationMs < 1_500 && distanceM > 25) {
        flags.push('impossible_burst');
        integrityScore -= 80;
    }

    const seconds = Math.max(durationMs / 1000, 0.001);
    const metersPerSecond = distanceM / seconds;
    if (metersPerSecond > limits.maxMetersPerSecond) {
        flags.push('impossible_velocity');
        integrityScore -= 85;
    } else if (metersPerSecond > limits.softMetersPerSecond) {
        flags.push('velocity_review');
        integrityScore -= 25;
    }

    const hardRejectFlags = new Set([
        'missing_session',
        'session_reuse',
        'expired_session',
        'mode_mismatch',
        'empty_score',
        'score_overflow',
        'impossible_burst',
        'impossible_velocity'
    ]);
    const accepted = !flags.some(flag => hardRejectFlags.has(flag)) && integrityScore >= 70;

    return {
        accepted,
        verified: accepted && flags.length === 0,
        integrityScore: Math.max(0, Math.min(100, integrityScore)),
        flags,
        distanceM,
        distancePx,
        durationMs,
        metersPerSecond
    };
}

export async function submitLeaderboardScore({ storage, payload, client, now = Date.now(), secret }) {
    const mode = normalizeMode(payload.mode);
    const playerName = normalizeName(payload.playerName);
    const sessionToken = String(payload.sessionToken || '');
    const clientRunId = String(payload.clientRunId || '').slice(0, 80);
    const ipHash = hashValue(client.ip, secret);
    const uaHash = hashValue(client.userAgent, secret);

    return withDatabase(storage, async db => {
        pruneDatabase(db, now);

        const rate = checkRateLimit(db, `submit:${ipHash}`, now, 10);
        if (!rate.allowed) {
            return {
                ok: false,
                accepted: false,
                error: 'rate_limited',
                retryAfterMs: RATE_WINDOW_MS
            };
        }

        if (!clientRunId) {
            return {
                ok: false,
                accepted: false,
                error: 'missing_run_id'
            };
        }

        const duplicate = selectOne(
            db,
            'SELECT id FROM leaderboard_entries WHERE client_run_id = ?',
            [clientRunId]
        );
        if (duplicate) {
            return {
                ok: true,
                accepted: false,
                error: 'duplicate_run',
                flags: ['duplicate_run']
            };
        }

        const session = sessionToken
            ? selectOne(db, 'SELECT * FROM leaderboard_sessions WHERE token = ?', [sessionToken])
            : null;
        const evaluation = evaluateSubmission({ payload, session, now });
        const flagsJson = JSON.stringify(evaluation.flags);

        if (!evaluation.accepted) {
            db.run(`
                INSERT INTO rejected_submissions(
                    mode, player_name, distance_m, duration_ms, submitted_at,
                    client_run_id, session_token, ip_hash, flags
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                mode,
                playerName,
                evaluation.distanceM,
                evaluation.durationMs,
                nowIso(now),
                clientRunId,
                sessionToken,
                ipHash,
                flagsJson
            ]);

            if (session) {
                db.run('UPDATE leaderboard_sessions SET used = 1 WHERE token = ?', [sessionToken]);
            }

            return {
                ok: true,
                accepted: false,
                error: 'integrity_rejected',
                integrityScore: evaluation.integrityScore,
                flags: evaluation.flags
            };
        }

        db.run(`
            INSERT INTO leaderboard_entries(
                mode, player_name, distance_m, distance_px, duration_ms,
                submitted_at, client_run_id, session_token, ip_hash,
                ua_hash, integrity_score, flags, verified
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            mode,
            playerName,
            evaluation.distanceM,
            evaluation.distancePx,
            evaluation.durationMs,
            nowIso(now),
            clientRunId,
            sessionToken,
            ipHash,
            uaHash,
            evaluation.integrityScore,
            flagsJson,
            evaluation.verified ? 1 : 0
        ]);

        if (session) {
            db.run('UPDATE leaderboard_sessions SET used = 1 WHERE token = ?', [sessionToken]);
        }

        const rankRow = selectOne(db, `
            SELECT COUNT(*) + 1 AS rank
            FROM leaderboard_entries
            WHERE mode = ?
              AND verified = 1
              AND (
                distance_m > ?
                OR (distance_m = ? AND duration_ms < ?)
                OR (distance_m = ? AND duration_ms = ? AND submitted_at < ?)
              )
        `, [
            mode,
            evaluation.distanceM,
            evaluation.distanceM,
            evaluation.durationMs,
            evaluation.distanceM,
            evaluation.durationMs,
            nowIso(now)
        ]);

        return {
            ok: true,
            accepted: true,
            verified: evaluation.verified,
            rank: Number(rankRow?.rank || 1),
            integrityScore: evaluation.integrityScore,
            flags: evaluation.flags
        };
    });
}

export async function listLeaderboard({ storage, mode, limit = 10, now = Date.now() }) {
    const safeMode = normalizeMode(mode);
    const safeLimit = Math.max(1, Math.min(MAX_LIMIT, normalizePositiveInt(limit, 10)));

    return withDatabase(storage, async db => {
        pruneDatabase(db, now);

        const rows = selectAll(db, `
            SELECT
                player_name AS playerName,
                distance_m AS distanceM,
                duration_ms AS durationMs,
                submitted_at AS submittedAt,
                integrity_score AS integrityScore,
                flags,
                verified
            FROM leaderboard_entries
            WHERE mode = ?
              AND verified = 1
            ORDER BY distance_m DESC, duration_ms ASC, submitted_at ASC
            LIMIT ?
        `, [safeMode, safeLimit]);

        return {
            ok: true,
            mode: safeMode,
            entries: rows.map((row, index) => ({
                rank: index + 1,
                playerName: row.playerName,
                distanceM: Number(row.distanceM),
                durationMs: Number(row.durationMs),
                submittedAt: row.submittedAt,
                integrityScore: Number(row.integrityScore),
                flags: readJson(row.flags, []),
                verified: Boolean(row.verified)
            }))
        };
    });
}
