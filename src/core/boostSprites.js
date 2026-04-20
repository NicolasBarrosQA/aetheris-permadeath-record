import { BOOST_TYPES } from '../config.js';

const spriteCache = {};
const loadingSet = new Set();

function beginLoad(boostId) {
    const boost = BOOST_TYPES[boostId];
    if (!boost || !boost.icon) return;
    if (spriteCache[boostId] || loadingSet.has(boostId)) return;

    const img = new Image();
    loadingSet.add(boostId);

    spriteCache[boostId] = {
        img,
        loaded: false
    };

    img.onload = () => {
        if (spriteCache[boostId]) spriteCache[boostId].loaded = true;
        loadingSet.delete(boostId);
    };

    img.onerror = () => {
        loadingSet.delete(boostId);
        delete spriteCache[boostId];
        console.warn(`Falha ao carregar sprite do boost ${boostId}: ${img.src}`);
    };

    img.decoding = 'async';
    img.src = `../assets/img/boosts/${boost.icon}`;
}

export function loadBoostSprites() {
    Object.keys(BOOST_TYPES).forEach(beginLoad);
}

export function getBoostSprite(boostId) {
    beginLoad(boostId);
    return spriteCache[boostId] || null;
}
