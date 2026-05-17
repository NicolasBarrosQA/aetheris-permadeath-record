import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { cwd } from 'node:process';
import {
    createAccount,
    createLeaderboardSession,
    createMemoryStorage,
    getAccountBySessionToken,
    listLeaderboard,
    loginAccount,
    logoutAccount,
    submitLeaderboardScore
} from '../netlify/functions/_shared/leaderboard-db.mjs';

const root = cwd();
const port = Number(process.env.PORT || 4173);
const storage = createMemoryStorage();
const secret = 'e2e-local-secret';
const types = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.webmanifest': 'application/manifest+json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.mp3': 'audio/mpeg',
    '.wasm': 'application/wasm'
};

function sendJson(res, body, status = 200, headers = {}) {
    res.writeHead(status, {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'no-store',
        ...headers
    });
    res.end(JSON.stringify(body));
}

async function readJson(req) {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    if (!chunks.length) return {};

    try {
        return JSON.parse(Buffer.concat(chunks).toString('utf8'));
    } catch {
        return {};
    }
}

function parseCookies(req) {
    const cookies = {};
    (req.headers.cookie || '').split(';').forEach(part => {
        const [rawKey, ...rawValue] = part.trim().split('=');
        if (!rawKey) return;
        cookies[rawKey] = decodeURIComponent(rawValue.join('=') || '');
    });
    return cookies;
}

function getBearerToken(req) {
    const header = req.headers.authorization || '';
    const match = header.match(/^Bearer\s+(.+)$/i);
    return match ? match[1].trim() : '';
}

function getAccountToken(req) {
    return getBearerToken(req) || parseCookies(req).aetheris_account;
}

function accountCookie(token, expiresAt) {
    const maxAge = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
    return `aetheris_account=${encodeURIComponent(token)}; Path=/; Max-Age=${maxAge}; HttpOnly; SameSite=Strict`;
}

function clearAccountCookie() {
    return 'aetheris_account=; Path=/; Max-Age=0; HttpOnly; SameSite=Strict';
}

function clientFrom(req) {
    return {
        ip: req.socket.remoteAddress || '127.0.0.1',
        userAgent: req.headers['user-agent'] || 'e2e'
    };
}

async function handleApi(req, res, url) {
    const client = clientFrom(req);

    if (url.pathname === '/api/leaderboard' && req.method === 'GET') {
        const result = await listLeaderboard({
            storage,
            mode: url.searchParams.get('mode') || 'medium',
            limit: Number(url.searchParams.get('limit') || 10),
            now: Date.now()
        });
        sendJson(res, result);
        return true;
    }

    if (url.pathname === '/api/leaderboard/session' && req.method === 'POST') {
        const body = await readJson(req);
        const result = await createLeaderboardSession({
            storage,
            mode: String(body.mode || 'medium'),
            client,
            secret,
            now: Date.now()
        });
        sendJson(res, result, result.ok ? 200 : 429);
        return true;
    }

    if (url.pathname === '/api/leaderboard' && req.method === 'POST') {
        const body = await readJson(req);
        const current = await getAccountBySessionToken({
            storage,
            token: getAccountToken(req),
            secret,
            now: Date.now()
        });
        const result = await submitLeaderboardScore({
            storage,
            payload: body,
            account: current.account,
            client,
            secret,
            now: Date.now()
        });
        sendJson(res, result, result.ok ? 200 : 400);
        return true;
    }

    if (url.pathname === '/api/account' && req.method === 'GET') {
        const current = await getAccountBySessionToken({
            storage,
            token: getAccountToken(req),
            secret,
            now: Date.now()
        });
        sendJson(res, { ok: true, account: current.account });
        return true;
    }

    if (url.pathname === '/api/account/signup' && req.method === 'POST') {
        const body = await readJson(req);
        const result = await createAccount({
            storage,
            username: body.username,
            displayName: body.displayName,
            password: body.password,
            client,
            secret,
            now: Date.now()
        });
        const status = result.ok ? 200 : (result.error === 'rate_limited' ? 429 : 400);
        const headers = result.ok ? { 'Set-Cookie': accountCookie(result.session.token, result.session.expiresAt) } : {};
        sendJson(
            res,
            result.ok
                ? {
                    ok: true,
                    account: result.account,
                    sessionToken: result.session.token,
                    sessionExpiresAt: result.session.expiresAt
                }
                : result,
            status,
            headers
        );
        return true;
    }

    if (url.pathname === '/api/account/login' && req.method === 'POST') {
        const body = await readJson(req);
        const result = await loginAccount({
            storage,
            username: body.username,
            password: body.password,
            client,
            secret,
            now: Date.now()
        });
        const status = result.ok ? 200 : (result.error === 'rate_limited' ? 429 : 401);
        const headers = result.ok ? { 'Set-Cookie': accountCookie(result.session.token, result.session.expiresAt) } : {};
        sendJson(
            res,
            result.ok
                ? {
                    ok: true,
                    account: result.account,
                    sessionToken: result.session.token,
                    sessionExpiresAt: result.session.expiresAt
                }
                : result,
            status,
            headers
        );
        return true;
    }

    if (url.pathname === '/api/account/logout' && req.method === 'POST') {
        await logoutAccount({
            storage,
            token: getAccountToken(req),
            secret,
            now: Date.now()
        });
        sendJson(res, { ok: true }, 200, { 'Set-Cookie': clearAccountCookie() });
        return true;
    }

    return false;
}

const server = http.createServer(async (req, res) => {
    const url = new URL(req.url || '/', `http://127.0.0.1:${port}`);

    try {
        if (await handleApi(req, res, url)) return;
    } catch (error) {
        console.error('test_server_api_error', error);
        sendJson(res, { ok: false, error: 'test_api_unavailable' }, 500);
        return;
    }

    const rawPath = url.pathname === '/' ? '/public/index.html' : decodeURIComponent(url.pathname);
    const filePath = normalize(join(root, rawPath));

    if (!filePath.startsWith(root)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
    }

    try {
        const data = await readFile(filePath);
        res.writeHead(200, { 'content-type': types[extname(filePath)] || 'application/octet-stream' });
        res.end(data);
    } catch {
        res.writeHead(404);
        res.end('Not found');
    }
});

server.listen(port, '127.0.0.1', () => {
    console.log(`AETHERIS test server http://127.0.0.1:${port}`);
});
