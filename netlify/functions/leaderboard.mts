import type { Config, Context } from '@netlify/functions';
import { getStore } from '@netlify/blobs';
import {
    createBlobStorage,
    createLeaderboardSession,
    listLeaderboard,
    submitLeaderboardScore
} from './_shared/leaderboard-db.mjs';

function jsonResponse(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Cache-Control': 'no-store'
        }
    });
}

async function readJson(req: Request) {
    try {
        return await req.json();
    } catch {
        return {};
    }
}

function getClient(req: Request, context: Context) {
    return {
        ip: context.ip || req.headers.get('x-nf-client-connection-ip') || req.headers.get('x-forwarded-for') || '0.0.0.0',
        userAgent: req.headers.get('user-agent') || 'unknown'
    };
}

function getHashSecret() {
    return globalThis.Netlify?.env?.get('LEADERBOARD_HASH_SECRET') || 'aetheris-leaderboard-default-secret';
}

export default async (req: Request, context: Context) => {
    const url = new URL(req.url);
    const store = getStore({ name: 'aetheris-leaderboard', consistency: 'strong' });
    const storage = createBlobStorage(store);
    const client = getClient(req, context);
    const secret = getHashSecret();

    try {
        if (url.pathname === '/api/leaderboard/session' && req.method === 'POST') {
            const body = await readJson(req);
            const result = await createLeaderboardSession({
                storage,
                mode: String(body.mode || 'medium'),
                client,
                secret
            });

            return jsonResponse(result, result.ok ? 200 : 429);
        }

        if (url.pathname === '/api/leaderboard' && req.method === 'GET') {
            const result = await listLeaderboard({
                storage,
                mode: url.searchParams.get('mode') || 'medium',
                limit: Number(url.searchParams.get('limit') || 10)
            });

            return jsonResponse(result);
        }

        if (url.pathname === '/api/leaderboard' && req.method === 'POST') {
            const body = await readJson(req);
            const result = await submitLeaderboardScore({
                storage,
                payload: body,
                client,
                secret
            });

            return jsonResponse(result, result.ok ? 200 : 400);
        }

        return jsonResponse({ ok: false, error: 'not_found' }, 404);
    } catch (error) {
        console.error('leaderboard_error', error);
        return jsonResponse({ ok: false, error: 'leaderboard_unavailable' }, 500);
    }
};

export const config: Config = {
    path: ['/api/leaderboard', '/api/leaderboard/session'],
    method: ['GET', 'POST']
};
