import type { Config, Context } from '@netlify/functions';
import { getStore } from '@netlify/blobs';
import {
    createAccount,
    createBlobStorage,
    getAccountBySessionToken,
    loginAccount,
    logoutAccount
} from './_shared/leaderboard-db.mjs';
import {
    accountCookie,
    clearAccountCookie,
    emptyResponse,
    getAccountToken,
    getClient,
    getHashSecret,
    LEADERBOARD_CORS_HEADERS,
    jsonResponse,
    readJson
} from './_shared/http.mjs';

function storage() {
    return createBlobStorage(getStore({ name: 'aetheris-leaderboard', consistency: 'strong' }));
}

export default async (req: Request, context: Context) => {
    const url = new URL(req.url);
    const client = getClient(req, context);
    const secret = getHashSecret();
    const corsHeaders = LEADERBOARD_CORS_HEADERS;

    if (req.method === 'OPTIONS') {
        return emptyResponse(204, corsHeaders);
    }

    try {
        if (url.pathname === '/api/account' && req.method === 'GET') {
            const current = await getAccountBySessionToken({
                storage: storage(),
                token: getAccountToken(req),
                secret
            });

            return jsonResponse({
                ok: true,
                account: current.account
            }, 200, corsHeaders);
        }

        if (url.pathname === '/api/account/signup' && req.method === 'POST') {
            const body = await readJson(req);
            const result = await createAccount({
                storage: storage(),
                username: body.username,
                displayName: body.displayName,
                password: body.password,
                client,
                secret
            });

            if (!result.ok) return jsonResponse(result, result.error === 'rate_limited' ? 429 : 400, corsHeaders);

            return jsonResponse(
                {
                    ok: true,
                    account: result.account,
                    sessionToken: result.session.token,
                    sessionExpiresAt: result.session.expiresAt
                },
                200,
                { ...corsHeaders, 'Set-Cookie': accountCookie(result.session.token, result.session.expiresAt) }
            );
        }

        if (url.pathname === '/api/account/login' && req.method === 'POST') {
            const body = await readJson(req);
            const result = await loginAccount({
                storage: storage(),
                username: body.username,
                password: body.password,
                client,
                secret
            });

            if (!result.ok) return jsonResponse(result, result.error === 'rate_limited' ? 429 : 401, corsHeaders);

            return jsonResponse(
                {
                    ok: true,
                    account: result.account,
                    sessionToken: result.session.token,
                    sessionExpiresAt: result.session.expiresAt
                },
                200,
                { ...corsHeaders, 'Set-Cookie': accountCookie(result.session.token, result.session.expiresAt) }
            );
        }

        if (url.pathname === '/api/account/logout' && req.method === 'POST') {
            await logoutAccount({
                storage: storage(),
                token: getAccountToken(req),
                secret
            });

            return jsonResponse({ ok: true }, 200, { ...corsHeaders, 'Set-Cookie': clearAccountCookie() });
        }

        return jsonResponse({ ok: false, error: 'not_found' }, 404, corsHeaders);
    } catch (error) {
        console.error('account_error', error);
        return jsonResponse({ ok: false, error: 'account_unavailable' }, 500, corsHeaders);
    }
};

export const config: Config = {
    path: ['/api/account', '/api/account/signup', '/api/account/login', '/api/account/logout'],
    method: ['GET', 'POST', 'OPTIONS']
};
