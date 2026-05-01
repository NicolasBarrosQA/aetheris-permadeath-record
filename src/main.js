/*
 * Arquivo de entrada do jogo.
 * Conecta DOM, input, resize e ciclo principal sem carregar logica de jogo.
 */

import state from './core/state.js';
import { initGame, loopGame, resetGame, togglePause } from './core/engine.js';
import { VIRTUAL_WIDTH, VIRTUAL_HEIGHT, VIEWPORT } from './config.js';
import { toggleShop, setDifficultyMode, syncDifficultyUI } from './systems/ui.js';
import { resumeAudioContext, tryStartAudio } from './core/audio.js';
import { spawnText } from './systems/particles.js';
import { loadBoostSprites } from './core/boostSprites.js';
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
    'k',
    'p',
    'r',
    's',
    't',
    'w'
]);

window.resetGame = resetGame;

validateGameConfig();

loadSkinSprites();
loadBoostSprites();

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
    const baseAspect = VIRTUAL_WIDTH / VIRTUAL_HEIGHT;
    const aspect = vw / Math.max(1, vh);

    let worldWidth = VIRTUAL_WIDTH;
    let worldHeight = VIRTUAL_HEIGHT;
    let scale = 1;

    if (aspect >= baseAspect) {
        scale = vh / VIRTUAL_HEIGHT;
        worldWidth = vw / scale;
    } else {
        scale = vw / VIRTUAL_WIDTH;
        worldHeight = vh / scale;
    }

    const extraW = Math.max(0, worldWidth - VIRTUAL_WIDTH);
    const extraH = Math.max(0, worldHeight - VIRTUAL_HEIGHT);

    state.view.scale = scale;
    state.view.scaleX = scale;
    state.view.scaleY = scale;
    state.view.offsetX = extraW * VIEWPORT.CAMERA_OFFSET_X_RATIO;
    state.view.offsetY = extraH * VIEWPORT.CAMERA_OFFSET_Y_RATIO;
    state.view.dpr = dpr;
    state.view.width = vw;
    state.view.height = vh;
    state.view.worldWidth = worldWidth;
    state.view.worldHeight = worldHeight;
    state.view.screenWidth = vw;
    state.view.screenHeight = vh;

    const buildingHeight = Math.max(600, worldHeight) + 140;
    [state.bgLayer1, state.bgLayer2, state.bgLayer3].forEach(layer => {
        layer.forEach(building => {
            building.h = buildingHeight;
        });
    });

    state.canvas.width = Math.round(vw * dpr);
    state.canvas.height = Math.round(vh * dpr);
    state.canvas.style.position = 'absolute';
    state.canvas.style.left = '0px';
    state.canvas.style.top = '0px';
    state.canvas.style.width = `${vw}px`;
    state.canvas.style.height = `${vh}px`;

    state.container.style.position = 'fixed';
    state.container.style.left = '0px';
    state.container.style.top = '0px';
    state.container.style.width = `${vw}px`;
    state.container.style.height = `${vh}px`;
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
    state.difficultyPicker = document.getElementById('difficulty-picker');
    state.difficultyShortcuts = document.getElementById('difficulty-shortcuts');
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
    state.uiBoost = getRequiredElement('boost-hud');
    state.uiBoostIcon = getRequiredElement('boost-icon');
    state.uiBoostName = getRequiredElement('boost-name');
    state.uiBoostTime = getRequiredElement('boost-time');
    state.uiBoostFill = getRequiredElement('boost-fill');
    state.pauseScreen = document.getElementById('pause-screen');
    const pauseResumeBtn = document.getElementById('pause-resume-btn');
    if (pauseResumeBtn) {
        pauseResumeBtn.addEventListener('click', event => {
            event.preventDefault();
            event.stopPropagation();
            togglePause();
            window.focus();
        });
    }
    state.difficultyButtons = [...document.querySelectorAll('[data-difficulty]')];

    state.difficultyButtons.forEach(button => {
        const applyDifficulty = event => {
            event.preventDefault();
            event.stopPropagation();
            if (!state.game.started) {
                setDifficultyMode(button.dataset.difficulty);
                if (state.difficultyPicker) state.difficultyPicker.style.display = 'none';
                if (state.difficultyShortcuts) state.difficultyShortcuts.style.display = 'none';
            }
            button.blur();
            window.focus();
        };
        button.addEventListener('pointerdown', applyDifficulty);
        button.addEventListener('click', applyDifficulty);
    });

    state.container.addEventListener('pointerdown', () => {
        window.focus();
    });

    resizeCanvas();

    window.addEventListener('resize', resizeCanvas);
    window.addEventListener('orientationchange', resizeCanvas);

    initGame();
    syncDifficultyUI();
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
            // TEMP MOD (screenshot): toggle de camera lenta para capturar frame.
            // Tecla: K. Remover este bloco quando nao for mais necessario.
            if (key === 'k') {
                const currentlySlow = Number.isFinite(state.game.debugTimeScaleOverride);
                state.game.debugTimeScaleOverride = currentlySlow ? null : 0.18;
                if (state.player) {
                    spawnText(
                        currentlySlow ? 'CAMERA LENTA OFF' : 'CAMERA LENTA ON',
                        state.player.x,
                        state.player.y - 48,
                        currentlySlow ? '#ff7a8a' : '#6bd7ff'
                    );
                }
            }

            if (event.code === 'Space' || key === 'w' || key === 'arrowup') {
                state.keys.spacepress = true;
            }

            if (key === 's') {
                toggleShop();
            }

            if (!state.game.started && (key === '1' || key === '2' || key === '3')) {
                const nextMode = key === '1' ? 'easy' : (key === '2' ? 'medium' : 'hard');
                setDifficultyMode(nextMode);
                if (state.difficultyPicker) state.difficultyPicker.style.display = 'none';
                if (state.difficultyShortcuts) state.difficultyShortcuts.style.display = 'none';
            }

            if (!state.game.started && key === 'q') {
                if (state.difficultyPicker) state.difficultyPicker.style.display = 'grid';
                if (state.difficultyShortcuts) state.difficultyShortcuts.style.display = 'block';
            }

            if (key === 'p' && state.game.started && !state.game.isGameOver && !state.game.shopOpen) {
                togglePause();
            }

            if (key === 'escape') {
                if (state.game.shopOpen) {
                    toggleShop();
                } else if (state.game.started && !state.game.isGameOver) {
                    togglePause();
                }
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
