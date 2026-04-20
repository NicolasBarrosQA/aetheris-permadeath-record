// Base do sistema de sprites (não muda nada no jogo ainda)

import { SKINS_DB } from '../config.js';

// Cache simples: { [skinId]: { img: Image, loaded: boolean } }
const spriteCache = {};

// Carrega sprites definidos no SKINS_DB (campos "sprite")
export function loadSkinSprites() {
    SKINS_DB.forEach(skin => {
        if (!skin.sprite) return; // skins sem sprite continuam normais

        // Evita recarregar se já estiver no cache
        if (spriteCache[skin.id]) return;

        const img = new Image();

        spriteCache[skin.id] = {
            img,
            loaded: false
        };

        img.onload = () => {
            spriteCache[skin.id].loaded = true;
        };

        img.onerror = () => {
            delete spriteCache[skin.id]; // ignora sprite com erro
            console.warn(`Falha ao carregar sprite da skin ${skin.id}: ${img.src}`);
        };

        img.decoding = 'async';
        img.src = `../assets/img/skins/${skin.sprite}`;
    });
}

// Retorna { img, loaded } ou null se não existir sprite
export function getSkinSprite(skinId) {
    return spriteCache[skinId] || null;
}
