const NETLIFY_API_ORIGIN = 'https://aetheris-permadeath-record.netlify.app';

function forcedPlatform() {
    return globalThis.AETHERIS_PLATFORM || new URLSearchParams(globalThis.location?.search || '').get('platform');
}

function hostname() {
    return globalThis.location?.hostname || '';
}

function isItchRuntime(name = hostname()) {
    return forcedPlatform() === 'itch' || name.endsWith('itch.zone') || name.endsWith('itch.io');
}

export const platform = {
    isItch: isItchRuntime(),
    apiOrigin: isItchRuntime() ? NETLIFY_API_ORIGIN : '',
    accountEnabled: true
};

export function apiUrl(path) {
    return `${platform.apiOrigin}${path}`;
}

export function shouldOmitCredentials(url) {
    return Boolean(platform.apiOrigin && url.startsWith(platform.apiOrigin));
}
