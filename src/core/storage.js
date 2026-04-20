/*
 * Persistencia simples usando localStorage.
 * Le e saneia moedas, skins desbloqueadas, skin equipada e recorde
 * para evitar que dados corrompidos derrubem o jogo.
 */

import { SKINS_DB } from '../config.js';

const STORAGE_KEYS = {
    totalCoins: 'nexus_coins_v8',
    unlockedSkins: 'nexus_skins_v8',
    currentSkinId: 'nexus_current_skin_v8',
    highScore: 'nexus_highscore',
    difficultyMode: 'nexus_difficulty_mode_v1'
};

const validSkinIds = new Set(SKINS_DB.map(skin => skin.id));

function readItem(key) {
    try {
        return localStorage.getItem(key);
    } catch (error) {
        console.warn(`Falha ao ler ${key} do localStorage.`, error);
        return null;
    }
}

function writeItem(key, value) {
    try {
        localStorage.setItem(key, value);
    } catch (error) {
        console.warn(`Falha ao salvar ${key} no localStorage.`, error);
    }
}

function parseIntSafe(value, fallback = 0) {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function parseUnlockedSkins(rawValue) {
    if (!rawValue) return [0];

    try {
        const parsed = JSON.parse(rawValue);

        if (!Array.isArray(parsed)) {
            return [0];
        }

        const normalized = [...new Set(
            parsed
                .map(value => Number.parseInt(value, 10))
                .filter(value => validSkinIds.has(value))
        )];

        return normalized.length > 0 ? normalized : [0];
    } catch (error) {
        console.warn('Falha ao interpretar skins desbloqueadas.', error);
        return [0];
    }
}

const unlockedSkins = parseUnlockedSkins(readItem(STORAGE_KEYS.unlockedSkins));
const currentSkinId = parseIntSafe(readItem(STORAGE_KEYS.currentSkinId), 0);
const safeCurrentSkinId = unlockedSkins.includes(currentSkinId) ? currentSkinId : unlockedSkins[0];

export const storage = {
    totalCoins: Math.max(0, parseIntSafe(readItem(STORAGE_KEYS.totalCoins), 0)),
    unlockedSkins,
    currentSkinId: safeCurrentSkinId,
    highScore: Math.max(0, parseIntSafe(readItem(STORAGE_KEYS.highScore), 0)),
    difficultyMode: readItem(STORAGE_KEYS.difficultyMode) || 'medium',
    initialHighScore: null
};

export function save() {
    writeItem(STORAGE_KEYS.totalCoins, String(storage.totalCoins));
    writeItem(STORAGE_KEYS.unlockedSkins, JSON.stringify(storage.unlockedSkins));
    writeItem(STORAGE_KEYS.currentSkinId, String(storage.currentSkinId));
    writeItem(STORAGE_KEYS.highScore, String(storage.highScore));
    writeItem(STORAGE_KEYS.difficultyMode, storage.difficultyMode);
}

storage.initialHighScore = storage.highScore;
