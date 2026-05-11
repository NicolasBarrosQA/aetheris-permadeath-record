import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import {
    createAccount,
    createLeaderboardSession,
    createMemoryStorage,
    listLeaderboard,
    submitLeaderboardScore
} from '../../../netlify/functions/_shared/leaderboard-db.mjs';
import initSqlJs from 'sql.js';

const client = { ip: '127.0.0.1', userAgent: 'integration' };
const secret = 'integration-secret';

async function createLegacyStorage() {
    const require = createRequire(import.meta.url);
    const wasmPath = require.resolve('sql.js/dist/sql-wasm.wasm');
    const SQL = await initSqlJs({
        locateFile: file => (file.endsWith('.wasm') && existsSync(wasmPath) ? wasmPath : file)
    });
    const db = new SQL.Database();

    db.run(`
        CREATE TABLE leaderboard_sessions (
            token TEXT PRIMARY KEY,
            mode TEXT NOT NULL,
            issued_at INTEGER NOT NULL,
            ip_hash TEXT NOT NULL,
            ua_hash TEXT NOT NULL,
            used INTEGER NOT NULL DEFAULT 0
        );
        CREATE TABLE leaderboard_entries (
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
        CREATE TABLE rejected_submissions (
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
        CREATE TABLE rate_limits (
            bucket TEXT PRIMARY KEY,
            window_start INTEGER NOT NULL,
            count INTEGER NOT NULL
        );
        INSERT INTO leaderboard_entries(
            mode, player_name, distance_m, distance_px, duration_ms,
            submitted_at, client_run_id, session_token, ip_hash,
            ua_hash, integrity_score, flags, verified
        )
        VALUES (
            'hard', 'Legacy Runner', 321, 3210, 12000,
            '2026-01-01T00:00:00.000Z', 'legacy-run', 'legacy-token', 'ip',
            'ua', 100, '[]', 1
        );
    `);

    const bytes = db.export();
    db.close();
    return createMemoryStorage(bytes);
}

test('ranking aceita convidado e conta, usando callsign da conta quando autenticado', async () => {
    const storage = createMemoryStorage();

    const account = await createAccount({
        storage,
        username: 'athenaqa',
        displayName: 'Athena QA',
        password: 'SenhaForte123',
        client,
        secret,
        now: 10_000
    });
    assert.equal(account.ok, true);

    const guestSession = await createLeaderboardSession({ storage, mode: 'medium', client, secret, now: 20_000 });
    const guestScore = await submitLeaderboardScore({
        storage,
        payload: {
            playerName: 'Guest Name',
            mode: 'medium',
            distancePx: 1000,
            distanceM: 100,
            durationMs: 5000,
            clientRunId: 'guest-run',
            sessionToken: guestSession.token
        },
        client,
        secret,
        now: 26_000
    });
    assert.equal(guestScore.accepted, true);

    const accountSession = await createLeaderboardSession({ storage, mode: 'medium', client, secret, now: 30_000 });
    const accountScore = await submitLeaderboardScore({
        storage,
        account: account.account,
        payload: {
            playerName: 'Tampered Name',
            mode: 'medium',
            distancePx: 2000,
            distanceM: 200,
            durationMs: 6000,
            clientRunId: 'account-run',
            sessionToken: accountSession.token
        },
        client,
        secret,
        now: 37_000
    });
    assert.equal(accountScore.accepted, true);

    const ranking = await listLeaderboard({ storage, mode: 'medium', now: 38_000 });
    assert.equal(ranking.entries.length, 2);
    assert.equal(ranking.entries[0].playerName, 'Athena QA');
    assert.equal(ranking.entries[1].playerName, 'Guest Name');
});

test('migra banco legado sem account_id antes de criar indice de contas', async () => {
    const storage = await createLegacyStorage();

    const ranking = await listLeaderboard({ storage, mode: 'hard', now: 50_000 });
    assert.equal(ranking.entries.length, 1);
    assert.equal(ranking.entries[0].playerName, 'Legacy Runner');

    const account = await createAccount({
        storage,
        username: 'legacyqa',
        displayName: 'Legacy QA',
        password: 'SenhaForte123',
        client,
        secret,
        now: 60_000
    });
    assert.equal(account.ok, true);
});
