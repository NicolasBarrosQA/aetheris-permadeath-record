import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { cwd } from 'node:process';

const root = cwd();
const port = Number(process.env.PORT || 4173);
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

function json(res, body, status = 200, headers = {}) {
    res.writeHead(status, {
        'content-type': 'application/json; charset=utf-8',
        ...headers
    });
    res.end(JSON.stringify(body));
}

function hasAccountCookie(req) {
    return (req.headers.cookie || '').split(';').some(part => part.trim().startsWith('aetheris_account='));
}

const server = http.createServer(async (req, res) => {
    const url = new URL(req.url || '/', `http://127.0.0.1:${port}`);

    if (url.pathname === '/api/leaderboard' && req.method === 'GET') {
        json(res, {
            ok: true,
            mode: url.searchParams.get('mode') || 'medium',
            entries: [
                { rank: 1, playerName: 'QA RUNNER', distanceM: 123, durationMs: 32100, verified: true }
            ]
        });
        return;
    }

    if (url.pathname === '/api/leaderboard/session' && req.method === 'POST') {
        json(res, { ok: true, token: `session-${Date.now()}`, mode: 'medium', expiresAt: Date.now() + 60000 });
        return;
    }

    if (url.pathname === '/api/leaderboard' && req.method === 'POST') {
        json(res, { ok: true, accepted: true, verified: true, rank: 1 });
        return;
    }

    if (url.pathname === '/api/account' && req.method === 'GET') {
        json(res, {
            ok: true,
            account: hasAccountCookie(req) ? { id: 'e2e', username: 'e2e', displayName: 'E2E' } : null
        });
        return;
    }

    if ((url.pathname === '/api/account/login' || url.pathname === '/api/account/signup') && req.method === 'POST') {
        json(res, { ok: true, account: { id: 'e2e', username: 'e2e', displayName: 'E2E' } }, 200, {
            'Set-Cookie': 'aetheris_account=e2e; Path=/; SameSite=Strict'
        });
        return;
    }

    if (url.pathname === '/api/account/logout' && req.method === 'POST') {
        json(res, { ok: true }, 200, {
            'Set-Cookie': 'aetheris_account=; Path=/; Max-Age=0; SameSite=Strict'
        });
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
