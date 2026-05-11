import type { Config, Context } from '@netlify/functions';
import { getStore } from '@netlify/blobs';
import {
    createBlobStorage,
    createLeaderboardSession,
    getAccountBySessionToken,
    listLeaderboard,
    submitLeaderboardScore
} from './_shared/leaderboard-db.mjs';
import { getAccountCookie, getClient, getHashSecret, jsonResponse, readJson } from './_shared/http.mjs';

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
            const current = await getAccountBySessionToken({
                storage,
                token: getAccountCookie(req),
                secret
            });
            const result = await submitLeaderboardScore({
                storage,
                payload: body,
                account: current.account,
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
