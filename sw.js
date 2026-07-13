/*
 * AETHERIS service worker.
 * Precaches the app shell so the game boots offline and stays fast as an
 * installed PWA. Leaderboard/account API calls are never cached.
 */

const VERSION = 'aetheris-v1';
const SHELL_CACHE = `${VERSION}-shell`;
const RUNTIME_CACHE = `${VERSION}-runtime`;

const SHELL_ASSETS = [
    '/',
    '/public/index.html',
    '/manifest.webmanifest',
    '/styles/main.css',
    '/src/main.js',
    '/src/pwa.js',
    '/src/platform.js',
    '/src/i18n.js',
    '/src/config.js',
    '/src/core/audio.js',
    '/src/core/boostSprites.js',
    '/src/core/engine.js',
    '/src/core/sprites.js',
    '/src/core/state.js',
    '/src/core/storage.js',
    '/src/core/utils.js',
    '/src/core/validation.js',
    '/src/systems/background.js',
    '/src/systems/leaderboard.js',
    '/src/systems/particles.js',
    '/src/systems/ui.js',
    '/src/systems/vfx.js',
    '/src/systems/virus.js',
    '/src/systems/worldgen.js',
    '/src/entities/enemy.js',
    '/src/entities/player.js',
    '/assets/img/app/aetheris-icon.svg',
    '/assets/img/app/favicon-32.png',
    '/assets/img/app/apple-touch-icon.png',
    '/assets/img/app/icon-192.png',
    '/assets/img/app/icon-512.png',
    '/assets/img/boosts/airdash.svg',
    '/assets/img/boosts/repair.svg',
    '/assets/img/boosts/slow.svg',
    '/assets/img/boosts/triple.svg',
    '/assets/img/skins/goku.png',
    '/assets/img/skins/karateca.png',
    '/assets/img/skins/luffy.png',
    '/assets/img/skins/naruto.png',
    '/assets/img/skins/naruto_shipuden.png'
];

function isApiRequest(url) {
    return url.pathname.startsWith('/api/') || url.pathname.startsWith('/.netlify/');
}

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(SHELL_CACHE).then(cache =>
            // Um asset quebrado nao pode impedir o SW de instalar.
            Promise.allSettled(SHELL_ASSETS.map(asset => cache.add(asset)))
        ).then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys()
            .then(keys => Promise.all(
                keys
                    .filter(key => !key.startsWith(VERSION))
                    .map(key => caches.delete(key))
            ))
            .then(() => self.clients.claim())
    );
});

async function networkFirstNavigation(request) {
    try {
        const response = await fetch(request);
        const cache = await caches.open(SHELL_CACHE);
        cache.put('/public/index.html', response.clone());
        return response;
    } catch {
        const cached = await caches.match('/public/index.html');
        if (cached) return cached;
        throw new Error('offline_without_shell');
    }
}

async function staleWhileRevalidate(request) {
    const cached = await caches.match(request, { ignoreSearch: true });
    const refresh = fetch(request)
        .then(async response => {
            if (response && response.ok) {
                const cache = await caches.open(RUNTIME_CACHE);
                cache.put(request, response.clone());
            }
            return response;
        })
        .catch(() => null);

    if (cached) {
        return cached;
    }

    const fresh = await refresh;
    if (fresh) return fresh;
    return Response.error();
}

async function cacheFirst(request) {
    const cached = await caches.match(request);
    if (cached) return cached;

    const response = await fetch(request);
    if (response && (response.ok || response.type === 'opaque')) {
        const cache = await caches.open(RUNTIME_CACHE);
        cache.put(request, response.clone());
    }
    return response;
}

self.addEventListener('fetch', event => {
    const { request } = event;
    if (request.method !== 'GET') return;

    const url = new URL(request.url);

    if (url.origin === self.location.origin) {
        if (isApiRequest(url)) return;

        if (request.mode === 'navigate') {
            event.respondWith(networkFirstNavigation(request));
            return;
        }

        event.respondWith(staleWhileRevalidate(request));
        return;
    }

    // Google Fonts e outros estaticos de terceiros: cache-first opaco.
    if (url.hostname.endsWith('gstatic.com') || url.hostname.endsWith('googleapis.com')) {
        event.respondWith(cacheFirst(request));
    }
});
