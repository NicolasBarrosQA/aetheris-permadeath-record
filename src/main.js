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
    'a',
    'c',
    'd',
    'f',
    'r',
    's',
    't',
    'w'
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
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const pixelArea = vw * vh;
    const dprCap = pixelArea > 2200000 ? 1.2 : (pixelArea > 1400000 ? 1.35 : 1.6);
    const dpr = Math.min(window.devicePixelRatio || 1, dprCap);
    const scaleX = vw / VIRTUAL_WIDTH;
    const scaleY = vh / VIRTUAL_HEIGHT;
    // Preenche toda a viewport sem distorcer; o excesso fica fora da tela.
    const scale = Math.max(scaleX, scaleY);
    const contentW = Math.max(1, Math.round(VIRTUAL_WIDTH * scale));
    const contentH = Math.max(1, Math.round(VIRTUAL_HEIGHT * scale));
    const offsetX = Math.floor((vw - contentW) * 0.5);
    const offsetY = Math.floor((vh - contentH) * 0.5);

    state.view.scale = scale;
    state.view.scaleX = scale;
    state.view.scaleY = scale;
    state.view.offsetX = offsetX;
    state.view.offsetY = offsetY;
    state.view.dpr = dpr;
    state.view.width = contentW;
    state.view.height = contentH;

    state.canvas.width = Math.round(VIRTUAL_WIDTH * dpr);
    state.canvas.height = Math.round(VIRTUAL_HEIGHT * dpr);
    state.canvas.style.width = `${contentW}px`;
    state.canvas.style.height = `${contentH}px`;

    state.container.style.position = 'fixed';
    state.container.style.left = `${offsetX}px`;
    state.container.style.top = `${offsetY}px`;
    state.container.style.width = `${contentW}px`;
    state.container.style.height = `${contentH}px`;
    state.container.style.transform = 'none';
}

function bootstrap() {
    state.container = getRequiredElement('game-container');
    state.canvas = getRequiredElement('gameCanvas');
    state.ctx = state.canvas.getContext('2d', {
        alpha: false,
        desynchronized: true
    }) || state.canvas.getContext('2d');
    state.ctx.imageSmoothingEnabled = true;
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
    state.uiDash = getRequiredElement('ui-dash');
    state.uiAttack = getRequiredElement('ui-attack');
    state.uiWeather = getRequiredElement('ui-weather');
    state.uiState = getRequiredElement('ui-state');

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
