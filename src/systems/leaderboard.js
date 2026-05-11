/*
 * Cliente do leaderboard global. A API roda em Netlify Functions e usa
 * sessoes curtas para reduzir submissoes fabricadas pelo cliente.
 */

import state from '../core/state.js';
import { DIFFICULTY_MODES } from '../config.js';
import { storage } from '../core/storage.js';

const API_URL = '/api/leaderboard';
const SESSION_URL = '/api/leaderboard/session';
const PLAYER_NAME_KEY = 'aetheris_leaderboard_name_v1';
const MODE_IDS = Object.keys(DIFFICULTY_MODES);

const leaderboardState = {
    modeId: storage.difficultyMode || 'medium',
    activeRun: null,
    lastSubmittedRunId: null,
    loading: false,
    entries: []
};

let elements = null;

function readLocalValue(key, fallback = '') {
    try {
        return localStorage.getItem(key) || fallback;
    } catch {
        return fallback;
    }
}

function writeLocalValue(key, value) {
    try {
        localStorage.setItem(key, value);
    } catch {
        // Storage privado ou bloqueado: o placar segue funcionando nesta sessao.
    }
}

function normalizeMode(modeId) {
    return MODE_IDS.includes(modeId) ? modeId : 'medium';
}

function normalizeName(name) {
    const cleaned = String(name || 'RUNNER')
        .normalize('NFKD')
        .replace(/[^\w -]/g, '')
        .trim()
        .replace(/\s+/g, ' ')
        .slice(0, 16);

    return cleaned || 'RUNNER';
}

function formatDuration(ms) {
    const seconds = Math.max(0, Math.floor(ms / 1000));
    const min = Math.floor(seconds / 60);
    const sec = String(seconds % 60).padStart(2, '0');
    return `${min}:${sec}`;
}

function setStatus(text, tone = 'idle') {
    if (!elements?.status) return;
    elements.status.innerText = text;
    elements.status.dataset.tone = tone;
}

async function fetchJson(url, options = {}) {
    const response = await fetch(url, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...(options.headers || {})
        }
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        const error = new Error(data.error || 'leaderboard_request_failed');
        error.payload = data;
        throw error;
    }

    return data;
}

function syncTabs() {
    if (!elements?.tabs?.length) return;
    elements.tabs.forEach(button => {
        const selected = button.dataset.leaderboardMode === leaderboardState.modeId;
        button.classList.toggle('selected', selected);
        button.setAttribute('aria-selected', selected ? 'true' : 'false');
    });
}

function renderEntries() {
    if (!elements?.list) return;

    elements.list.innerHTML = '';

    if (!leaderboardState.entries.length) {
        const item = document.createElement('li');
        item.className = 'leaderboard-empty';
        item.innerText = leaderboardState.loading ? 'SINCRONIZANDO...' : 'SEM REGISTROS';
        elements.list.appendChild(item);
        return;
    }

    const fragment = document.createDocumentFragment();
    leaderboardState.entries.forEach(entry => {
        const item = document.createElement('li');
        const rank = document.createElement('span');
        const name = document.createElement('span');
        const score = document.createElement('span');
        const meta = document.createElement('span');

        item.className = 'leaderboard-row';
        rank.className = 'leaderboard-rank';
        name.className = 'leaderboard-name';
        score.className = 'leaderboard-score';
        meta.className = 'leaderboard-meta';

        rank.innerText = `#${entry.rank}`;
        name.innerText = entry.playerName;
        score.innerText = `${entry.distanceM}m`;
        meta.innerText = formatDuration(entry.durationMs);

        item.append(rank, name, score, meta);
        fragment.appendChild(item);
    });

    elements.list.appendChild(fragment);
}

export async function refreshLeaderboard(modeId = leaderboardState.modeId) {
    leaderboardState.modeId = normalizeMode(modeId);
    leaderboardState.loading = true;
    syncTabs();
    renderEntries();
    setStatus('SYNC', 'idle');

    try {
        const data = await fetchJson(`${API_URL}?mode=${leaderboardState.modeId}&limit=10`);
        leaderboardState.entries = Array.isArray(data.entries) ? data.entries : [];
        setStatus('ONLINE', 'ready');
    } catch {
        leaderboardState.entries = [];
        setStatus('OFFLINE', 'warn');
    } finally {
        leaderboardState.loading = false;
        renderEntries();
    }
}

export function syncLeaderboardMode(modeId) {
    const nextMode = normalizeMode(modeId);
    if (leaderboardState.modeId === nextMode) {
        syncTabs();
        return;
    }

    leaderboardState.modeId = nextMode;
    refreshLeaderboard(nextMode);
}

export function resetLeaderboardRun() {
    leaderboardState.activeRun = null;
    leaderboardState.lastSubmittedRunId = null;
    if (elements?.panel) elements.panel.classList.remove('running');
}

export async function startLeaderboardRun(modeId) {
    const safeMode = normalizeMode(modeId);
    const clientRunId = globalThis.crypto?.randomUUID
        ? globalThis.crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    leaderboardState.activeRun = {
        modeId: safeMode,
        clientRunId,
        startedAt: performance.now(),
        sessionToken: null
    };
    leaderboardState.lastSubmittedRunId = null;
    if (elements?.panel) elements.panel.classList.add('running');
    setStatus('ARMADO', 'idle');

    try {
        const session = await fetchJson(SESSION_URL, {
            method: 'POST',
            body: JSON.stringify({ mode: safeMode })
        });

        if (leaderboardState.activeRun?.clientRunId === clientRunId && session.ok && session.token) {
            leaderboardState.activeRun.sessionToken = session.token;
            setStatus('VALIDADO', 'ready');
        }
    } catch {
        if (leaderboardState.activeRun?.clientRunId === clientRunId) {
            setStatus('SEM SESSAO', 'warn');
        }
    }
}

export async function submitLeaderboardScore() {
    const run = leaderboardState.activeRun;
    if (!run || leaderboardState.lastSubmittedRunId === run.clientRunId) return;

    leaderboardState.lastSubmittedRunId = run.clientRunId;
    if (elements?.panel) elements.panel.classList.remove('running');

    const distancePx = Math.floor(state.game.dist || 0);
    const distanceM = Math.floor(distancePx / 10);
    const durationMs = Math.max(1, Math.round(performance.now() - run.startedAt));

    if (distanceM <= 0 || !run.sessionToken) {
        setStatus(run.sessionToken ? 'SEM SCORE' : 'OFFLINE', 'warn');
        return;
    }

    const playerName = normalizeName(elements?.nameInput?.value || readLocalValue(PLAYER_NAME_KEY, 'RUNNER'));
    if (elements?.nameInput) elements.nameInput.value = playerName;
    writeLocalValue(PLAYER_NAME_KEY, playerName);

    setStatus('ENVIANDO', 'idle');

    try {
        const result = await fetchJson(API_URL, {
            method: 'POST',
            body: JSON.stringify({
                playerName,
                mode: run.modeId,
                distancePx,
                distanceM,
                durationMs,
                clientRunId: run.clientRunId,
                sessionToken: run.sessionToken
            })
        });

        if (result.accepted) {
            setStatus(result.verified ? `#${result.rank}` : 'REVISAO', result.verified ? 'ready' : 'warn');
            await refreshLeaderboard(run.modeId);
        } else {
            setStatus('RECUSADO', 'warn');
        }
    } catch {
        setStatus('FALHA', 'warn');
    }
}

export function initLeaderboardUI() {
    const panel = document.getElementById('leaderboard-panel');
    if (!panel) return;

    elements = {
        panel,
        status: document.getElementById('leaderboard-status'),
        nameInput: document.getElementById('leaderboard-name-input'),
        list: document.getElementById('leaderboard-list'),
        tabs: [...document.querySelectorAll('[data-leaderboard-mode]')]
    };

    if (elements.nameInput) {
        elements.nameInput.value = normalizeName(readLocalValue(PLAYER_NAME_KEY, 'RUNNER'));
        elements.nameInput.addEventListener('change', () => {
            const safeName = normalizeName(elements.nameInput.value);
            elements.nameInput.value = safeName;
            writeLocalValue(PLAYER_NAME_KEY, safeName);
        });
    }

    elements.tabs.forEach(button => {
        button.addEventListener('click', event => {
            event.preventDefault();
            syncLeaderboardMode(button.dataset.leaderboardMode);
            button.blur();
            window.focus();
        });
    });

    refreshLeaderboard(leaderboardState.modeId);
}
