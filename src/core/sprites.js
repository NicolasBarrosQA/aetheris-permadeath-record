// Sprite loading focused on startup smoothness:
// 1) load equipped skin first
// 2) preload others gradually in background

import { SKINS_DB } from '../config.js';
import { storage } from './storage.js';

const spriteCache = {};
const loadingSet = new Set();
const spriteSkins = SKINS_DB.filter(skin => Boolean(skin.sprite));
const spriteById = new Map(spriteSkins.map(skin => [skin.id, skin]));
let preloadStarted = false;

function beginLoad(skinId) {
    const skin = spriteById.get(skinId);
    if (!skin) return;
    if (spriteCache[skinId] || loadingSet.has(skinId)) return;

    const img = new Image();
    loadingSet.add(skinId);

    spriteCache[skinId] = {
        img,
        loaded: false
    };

    img.onload = () => {
        if (spriteCache[skinId]) spriteCache[skinId].loaded = true;
        loadingSet.delete(skinId);
    };

    img.onerror = () => {
        loadingSet.delete(skinId);
        delete spriteCache[skinId];
        console.warn(`Falha ao carregar sprite da skin ${skinId}: ${img.src}`);
    };

    img.decoding = 'async';
    img.src = `../assets/img/skins/${skin.sprite}`;
}

function preloadInBackground() {
    if (preloadStarted) return;
    preloadStarted = true;

    const queue = spriteSkins
        .map(skin => skin.id)
        .filter(id => id !== storage.currentSkinId);

    let idx = 0;
    const step = () => {
        if (idx >= queue.length) return;
        beginLoad(queue[idx]);
        idx++;
        setTimeout(step, 180);
    };

    const kickoff = () => setTimeout(step, 900);
    if (typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function') {
        window.requestIdleCallback(kickoff, { timeout: 1500 });
    } else {
        setTimeout(kickoff, 1200);
    }
}

export function loadSkinSprites() {
    beginLoad(storage.currentSkinId);
    preloadInBackground();
}

// Returns { img, loaded } or null; triggers on-demand loading if needed.
export function getSkinSprite(skinId) {
    beginLoad(skinId);
    return spriteCache[skinId] || null;
}
