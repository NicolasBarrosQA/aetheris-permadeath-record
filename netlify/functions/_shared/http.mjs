export const ACCOUNT_COOKIE = 'aetheris_account';
export const LEADERBOARD_CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400'
};

export function jsonResponse(body, status = 200, extraHeaders = {}) {
    return new Response(JSON.stringify(body), {
        status,
        headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Cache-Control': 'no-store',
            ...extraHeaders
        }
    });
}

export function emptyResponse(status = 204, extraHeaders = {}) {
    return new Response(null, {
        status,
        headers: {
            'Cache-Control': 'no-store',
            ...extraHeaders
        }
    });
}

export async function readJson(req) {
    try {
        return await req.json();
    } catch {
        return {};
    }
}

export function getClient(req, context) {
    return {
        ip: context.ip || req.headers.get('x-nf-client-connection-ip') || req.headers.get('x-forwarded-for') || '0.0.0.0',
        userAgent: req.headers.get('user-agent') || 'unknown'
    };
}

export function getHashSecret() {
    return globalThis.Netlify?.env?.get('AETHERIS_AUTH_SECRET') ||
        globalThis.Netlify?.env?.get('LEADERBOARD_HASH_SECRET') ||
        'aetheris-dev-secret-change-in-netlify';
}

export function parseCookies(req) {
    const cookieHeader = req.headers.get('cookie') || '';
    const cookies = {};

    cookieHeader.split(';').forEach(part => {
        const [rawKey, ...rawValue] = part.trim().split('=');
        if (!rawKey) return;
        try {
            cookies[rawKey] = decodeURIComponent(rawValue.join('=') || '');
        } catch {
            cookies[rawKey] = '';
        }
    });

    return cookies;
}

export function getAccountCookie(req) {
    return parseCookies(req)[ACCOUNT_COOKIE] || '';
}

export function getBearerToken(req) {
    const header = req.headers.get('authorization') || '';
    const match = header.match(/^Bearer\s+(.+)$/i);
    return match ? match[1].trim() : '';
}

export function getAccountToken(req) {
    return getBearerToken(req) || getAccountCookie(req);
}

export function accountCookie(token, expiresAt) {
    const maxAge = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
    return [
        `${ACCOUNT_COOKIE}=${encodeURIComponent(token)}`,
        'Path=/',
        `Max-Age=${maxAge}`,
        'HttpOnly',
        'Secure',
        'SameSite=Strict'
    ].join('; ');
}

export function clearAccountCookie() {
    return [
        `${ACCOUNT_COOKIE}=`,
        'Path=/',
        'Max-Age=0',
        'HttpOnly',
        'Secure',
        'SameSite=Strict'
    ].join('; ');
}
