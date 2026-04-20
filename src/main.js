/*
 * Arquivo de entrada do jogo.
 * Conecta DOM, input, resize e ciclo principal sem carregar logica de jogo.
 */

import state from './core/state.js';
import { initGame, loopGame, resetGame } from './core/engine.js';
import { VIRTUAL_WIDTH, VIRTUAL_HEIGHT } from './config.js';
import { toggleShop } from './systems/ui.js';
import { resumeAudioContext, tryStartAudio } from './core/audio.js';
import { spawnText } from './systems/particles.js';
import { loadSkinSprites } from './core/sprites.js';
import { validateGameConfig } from './core/validation.js';

const ACTION_KEYS = new Set([
    ' ',
    'arrowup',
    'arrowdown',
    'arrowleft',
    'arrowright',
    'escape',
    'shift',
    'a',
    'c',
    'd',
    'f',
    'r',
    's',
    't',
    'w',
    'z'
]);

window.resetGame = resetGame;

validateGameConfig();

loadSkinSprites();

function getRequiredElement(id) {
    const element = document.getElementById(id);

    if (!element) {
        throw new Error(`Elemento obrigatorio nao encontrado: #${id}`);
    }

    return element;
}

function resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const scale = Math.min(vw / VIRTUAL_WIDTH, vh / VIRTUAL_HEIGHT);
    const scaledW = VIRTUAL_WIDTH * scale;
    const scaledH = VIRTUAL_HEIGHT * scale;
    const offsetX = (vw - scaledW) / 2;
    let offsetY = (vh - scaledH) / 2;
    const isPortrait = vh > vw;
    if (isPortrait) {
        const preferredTop = Math.max(10, vh * 0.11);
        offsetY = preferredTop;
        if ((offsetY + scaledH) > (vh - 10)) {
            offsetY = Math.max(10, vh - scaledH - 10);
        }
    }

    state.view.scale = scale;
    state.view.offsetX = offsetX;
    state.view.offsetY = offsetY;
    state.view.dpr = dpr;
    state.view.width = scaledW;
    state.view.height = scaledH;

    state.canvas.width = Math.round(VIRTUAL_WIDTH * dpr);
    state.canvas.height = Math.round(VIRTUAL_HEIGHT * dpr);
    state.canvas.style.width = `${VIRTUAL_WIDTH}px`;
    state.canvas.style.height = `${VIRTUAL_HEIGHT}px`;

    state.container.style.position = 'absolute';
    state.container.style.left = '0px';
    state.container.style.top = '0px';
    state.container.style.width = `${VIRTUAL_WIDTH}px`;
    state.container.style.height = `${VIRTUAL_HEIGHT}px`;
    state.container.style.transformOrigin = 'top left';
    state.container.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${scale})`;
}

function bootstrap() {
    state.container = getRequiredElement('game-container');
    state.canvas = getRequiredElement('gameCanvas');
    state.ctx = state.canvas.getContext('2d');
    state.overlay = getRequiredElement('overlay-screen');
    state.overlayTitle = getRequiredElement('overlay-title');
    state.overlayMsg = getRequiredElement('overlay-msg');
    state.shopModal = getRequiredElement('shop-modal');
    state.skinsGrid = getRequiredElement('skins-grid');
    state.startHint = getRequiredElement('start-hint');
    state.bgm = getRequiredElement('bgm');
    state.uiLayer = getRequiredElement('ui-layer');
    state.uiDist = getRequiredElement('ui-dist');
    state.uiBest = getRequiredElement('ui-best');
    state.uiCoins = getRequiredElement('ui-coins');
    state.hpBarFill = getRequiredElement('hp-bar-fill');
    state.shopBalance = getRequiredElement('shop-balance');

    resizeCanvas();

    window.addEventListener('resize', resizeCanvas);
    window.addEventListener('orientationchange', resizeCanvas);

    initGame();
    loopGame();
}

function shouldPreventDefault(key, code) {
    return ACTION_KEYS.has(key) || code === 'Space';
}

function setupInput() {
    window.addEventListener('keydown', event => {
        const key = event.key.toLowerCase();
        const wasPressed = Boolean(state.keys[key]);

        state.keys[key] = true;

        if (shouldPreventDefault(key, event.code)) {
            event.preventDefault();
        }

        if (state.keys.r && state.keys.f && state.keys.t && !state.keys.cheatlock) {
            state.cheatFlight = !state.cheatFlight;
            state.keys.cheatlock = true;

            if (state.player) {
                if (state.cheatFlight) {
                    state.player.invul = 9999;
                    spawnText('CHEAT VOAR ON', state.player.x, state.player.y - 40, '#0ff');
                } else {
                    state.player.invul = 0;
                    state.player.vy = 0;
                    spawnText('CHEAT VOAR OFF', state.player.x, state.player.y - 40, '#ff3355');
                }
            }
        }

        if (!wasPressed) {
            if (event.code === 'Space' || key === 'w' || key === 'arrowup') {
                state.keys.spacepress = true;
            }

            if (key === 's') {
                toggleShop();
            }

            if (key === 'escape' && state.game.shopOpen) {
                toggleShop();
            }

            if (ACTION_KEYS.has(key) || event.code === 'Space') {
                resumeAudioContext();

                if (state.game.running || !state.game.started) {
                    tryStartAudio();
                }
            }
        }
    });

    window.addEventListener('keyup', event => {
        const key = event.key.toLowerCase();

        state.keys[key] = false;

        if (shouldPreventDefault(key, event.code)) {
            event.preventDefault();
        }

        if (key === 'r' || key === 'f' || key === 't') {
            state.keys.cheatlock = false;
        }
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        bootstrap();
        setupInput();
    });
} else {
    bootstrap();
    setupInput();
}
