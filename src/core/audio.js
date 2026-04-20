/*
 * Sistema de audio sintetizado.
 * Centraliza o AudioContext, os efeitos sonoros e o controle da musica.
 */

import state from './state.js';

const AudioContextCtor = window.AudioContext || window.webkitAudioContext;

export const audioCtx = AudioContextCtor ? new AudioContextCtor() : null;

function withAudioNodes(configure, durationSeconds) {
    if (!audioCtx) return;

    if (audioCtx.state === 'suspended') {
        audioCtx.resume().catch(() => {});
    }

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    configure(osc, gain);

    osc.start();
    osc.stop(audioCtx.currentTime + durationSeconds);
}

export function resumeAudioContext() {
    if (!audioCtx || audioCtx.state !== 'suspended') {
        return Promise.resolve();
    }

    return audioCtx.resume().catch(() => {});
}

export const SFX = {
    jump: () => withAudioNodes((osc, gain) => {
        osc.type = 'square';
        osc.frequency.setValueAtTime(150, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(400, audioCtx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
    }, 0.1),

    coin: () => withAudioNodes((osc, gain) => {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1200, audioCtx.currentTime);
        osc.frequency.setValueAtTime(1800, audioCtx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
    }, 0.2),

    swoosh: () => withAudioNodes((osc, gain) => {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(600, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
    }, 0.15),

    dash: () => withAudioNodes((osc, gain) => {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(300, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(50, audioCtx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
    }, 0.3),

    hit: () => withAudioNodes((osc, gain) => {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, audioCtx.currentTime);
        osc.frequency.linearRampToValueAtTime(100, audioCtx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
    }, 0.2),

    gameover: () => withAudioNodes((osc, gain) => {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(300, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(50, audioCtx.currentTime + 1.0);
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 1.0);
    }, 1.0),

    record: () => withAudioNodes((osc, gain) => {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, audioCtx.currentTime);
        osc.frequency.linearRampToValueAtTime(1500, audioCtx.currentTime + 0.2);
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
    }, 0.5)
};

export function tryStartAudio() {
    if (state.game.audioStarted || state.game.isGameOver || !state.bgm) {
        return;
    }

    state.bgm.volume = 0.4;
    state.bgm.currentTime = 0;

    const playAttempt = state.bgm.play();

    if (playAttempt && typeof playAttempt.then === 'function') {
        playAttempt
            .then(() => {
                state.game.audioStarted = true;
            })
            .catch(() => {});
    }

    resumeAudioContext();
}

export function stopAudio() {
    if (!state.bgm) return;

    state.bgm.pause();
    state.bgm.currentTime = 0;
    state.game.audioStarted = false;
}
