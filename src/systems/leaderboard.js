import state from '../core/state.js';
import { DIFFICULTY_MODES } from '../config.js';
import { storage } from '../core/storage.js';

const API_URL = '/api/leaderboard';
const SESSION_URL = '/api/leaderboard/session';
const ACCOUNT_URL = '/api/account';
const PLAYER_NAME_KEY = 'aetheris_leaderboard_name_v1';
const MODE_IDS = Object.keys(DIFFICULTY_MODES);
const MODE_LABELS = {
    easy: 'FACIL',
    medium: 'MEDIO',
    hard: 'DIFICIL'
};

const leaderboardState = {
    modeId: storage.difficultyMode || 'medium',
    activeRun: null,
    lastSubmittedRunId: null,
    loading: false,
    entries: [],
    authMode: 'login',
    account: null,
    authReady: false,
    authGateOpen: false,
    leaderboardOpen: false
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
        // Navegadores em modo privado podem bloquear storage; convidado segue na sessao.
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

function normalizeUsername(username) {
    return String(username || '')
        .normalize('NFKD')
        .replace(/[^\w-]/g, '')
        .trim()
        .slice(0, 20);
}

function formatDuration(ms) {
    const seconds = Math.max(0, Math.floor(ms / 1000));
    const min = Math.floor(seconds / 60);
    const sec = String(seconds % 60).padStart(2, '0');
    return `${min}:${sec}`;
}

function updateBodyModalState() {
    document.body.classList.toggle(
        'modal-open',
        leaderboardState.authGateOpen || leaderboardState.leaderboardOpen
    );
}

function setStatus(text, tone = 'idle') {
    if (!elements?.status) return;
    elements.status.innerText = text;
    elements.status.dataset.tone = tone;
}

function setAccountMessage(text, tone = 'idle') {
    if (!elements?.accountMessage) return;
    elements.accountMessage.innerText = text;
    elements.accountMessage.dataset.tone = tone;
}

async function fetchJson(url, options = {}) {
    const response = await fetch(url, {
        ...options,
        credentials: 'same-origin',
        headers: {
            'Content-Type': 'application/json',
            ...(options.headers || {})
        }
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        const error = new Error(data.error || 'request_failed');
        error.payload = data;
        throw error;
    }

    return data;
}

function getCurrentPlayerName() {
    if (leaderboardState.account) {
        return normalizeName(leaderboardState.account.displayName || leaderboardState.account.username);
    }

    return normalizeName(elements?.nameInput?.value || readLocalValue(PLAYER_NAME_KEY, 'RUNNER'));
}

function syncDialogVisibility() {
    if (elements?.authGate) {
        elements.authGate.classList.toggle('hidden', !leaderboardState.authGateOpen);
    }
    if (elements?.leaderboardModal) {
        elements.leaderboardModal.classList.toggle('hidden', !leaderboardState.leaderboardOpen);
    }
    updateBodyModalState();
}

function closeAuthGate() {
    leaderboardState.authGateOpen = false;
    syncDialogVisibility();
    window.focus();
}

function showAuthGate() {
    leaderboardState.authGateOpen = true;
    syncDialogVisibility();
    window.setTimeout(() => elements?.accountUsername?.focus(), 0);
}

export function openAccountDialog() {
    if (!elements) return;
    leaderboardState.authGateOpen = true;
    leaderboardState.leaderboardOpen = false;
    syncDialogVisibility();
    window.setTimeout(() => {
        if (leaderboardState.account) {
            elements.guestContinue?.focus();
        } else {
            elements.accountUsername?.focus();
        }
    }, 0);
}

export function openLeaderboardDialog() {
    if (!elements || state.game.started || state.game.isGameOver) return;
    leaderboardState.leaderboardOpen = true;
    leaderboardState.authGateOpen = false;
    syncDialogVisibility();
    refreshLeaderboard(leaderboardState.modeId);
    window.setTimeout(() => elements.leaderboardClose?.focus(), 0);
}

export function closeSystemDialogs() {
    const hadOpenDialog = leaderboardState.authGateOpen || leaderboardState.leaderboardOpen;
    leaderboardState.authGateOpen = false;
    leaderboardState.leaderboardOpen = false;
    syncDialogVisibility();
    if (hadOpenDialog) window.focus();
    return hadOpenDialog;
}

export function isInterfaceBlockingGame() {
    return leaderboardState.authGateOpen || leaderboardState.leaderboardOpen;
}

function syncTabs() {
    if (!elements?.tabs?.length) return;
    elements.tabs.forEach(button => {
        const selected = button.dataset.leaderboardMode === leaderboardState.modeId;
        button.classList.toggle('selected', selected);
        button.setAttribute('aria-selected', selected ? 'true' : 'false');
    });
    if (elements.modeLabel) {
        elements.modeLabel.innerText = MODE_LABELS[leaderboardState.modeId] || 'MEDIO';
    }
}

function syncAuthMode() {
    if (!elements?.authModeButtons?.length) return;

    elements.authModeButtons.forEach(button => {
        const selected = button.dataset.authMode === leaderboardState.authMode;
        button.classList.toggle('selected', selected);
        button.setAttribute('aria-pressed', selected ? 'true' : 'false');
    });

    const isLogged = Boolean(leaderboardState.account);
    const isSignup = leaderboardState.authMode === 'signup';
    if (elements.accountDisplay) {
        elements.accountDisplay.style.display = isLogged ? 'none' : (isSignup ? 'block' : 'none');
    }
    if (elements.accountPassword) {
        elements.accountPassword.autocomplete = isSignup ? 'new-password' : 'current-password';
    }
    if (elements.accountSubmit) {
        elements.accountSubmit.innerText = isSignup ? 'CRIAR CONTA' : 'ENTRAR';
    }
}

function syncAccountUI() {
    if (!elements) return;
    const account = leaderboardState.account;
    const isLogged = Boolean(account);
    const displayName = account
        ? normalizeName(account.displayName || account.username)
        : normalizeName(readLocalValue(PLAYER_NAME_KEY, 'RUNNER'));

    if (elements.accountMode) elements.accountMode.innerText = isLogged ? 'CONTA' : 'CONVIDADO';
    if (elements.accountName) elements.accountName.innerText = displayName;
    if (elements.pilotMode) elements.pilotMode.innerText = isLogged ? 'CONTA' : 'CONVIDADO';
    if (elements.pilotName) elements.pilotName.innerText = displayName;
    if (elements.playerLabel) elements.playerLabel.innerText = displayName;
    if (elements.accountOpen) elements.accountOpen.innerText = isLogged ? 'PERFIL' : 'CONTA';
    if (elements.authClose) elements.authClose.style.display = isLogged ? 'block' : 'none';
    if (elements.guestContinue) {
        elements.guestContinue.innerText = isLogged ? 'FECHAR' : 'JOGAR COMO CONVIDADO';
    }
    if (elements.nameInput) {
        elements.nameInput.value = displayName;
        elements.nameInput.disabled = isLogged;
    }
    if (elements.logoutButton) {
        elements.logoutButton.style.display = isLogged ? 'block' : 'none';
    }
    if (elements.accountSubmit) {
        elements.accountSubmit.style.display = isLogged ? 'none' : 'block';
    }
    if (elements.accountUsername) {
        elements.accountUsername.disabled = isLogged;
        elements.accountUsername.style.display = isLogged ? 'none' : 'block';
    }
    if (elements.accountPassword) {
        elements.accountPassword.disabled = isLogged;
        elements.accountPassword.style.display = isLogged ? 'none' : 'block';
    }
    if (elements.accountDisplay) {
        elements.accountDisplay.disabled = isLogged;
        if (isLogged) elements.accountDisplay.style.display = 'none';
    }
    if (elements.authTitle) {
        elements.authTitle.innerText = isLogged ? 'Perfil AETHERIS' : 'Entrar no AETHERIS';
    }
    if (elements.accountTabs) {
        elements.accountTabs.style.display = isLogged ? 'none' : 'flex';
    }

    syncAuthMode();
}

function renderEntries() {
    if (!elements?.list) return;

    elements.list.innerHTML = '';

    if (!leaderboardState.entries.length) {
        const item = document.createElement('li');
        item.className = 'leaderboard-empty';
        item.innerText = leaderboardState.loading
            ? 'SINCRONIZANDO RANKING...'
            : 'SEM PONTUACOES VERIFICADAS NESTE MODO';
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
    closeSystemDialogs();
}

export async function startLeaderboardRun(modeId) {
    closeSystemDialogs();
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

    const distancePx = Math.floor(state.game.dist || 0);
    const distanceM = Math.floor(distancePx / 10);
    const durationMs = Math.max(1, Math.round(performance.now() - run.startedAt));

    if (distanceM <= 0 || !run.sessionToken) {
        setStatus(run.sessionToken ? 'SEM SCORE' : 'OFFLINE', 'warn');
        return;
    }

    const playerName = getCurrentPlayerName();
    if (!leaderboardState.account) writeLocalValue(PLAYER_NAME_KEY, playerName);

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

async function hydrateAccount() {
    try {
        const result = await fetchJson(ACCOUNT_URL);
        leaderboardState.account = result.account || null;
        leaderboardState.authReady = true;
        setAccountMessage(
            leaderboardState.account
                ? 'Conta conectada. Seus scores usam este callsign.'
                : 'Entre para salvar sua identidade global ou jogue como convidado.',
            leaderboardState.account ? 'ready' : 'idle'
        );
        if (!leaderboardState.account) showAuthGate();
    } catch {
        leaderboardState.account = null;
        leaderboardState.authReady = true;
        setAccountMessage('Login indisponivel agora. Modo convidado segue liberado.', 'warn');
        showAuthGate();
    } finally {
        syncAccountUI();
    }
}

async function submitAccountForm(event) {
    event.preventDefault();
    if (leaderboardState.account) return;

    const username = normalizeUsername(elements.accountUsername?.value);
    const displayName = normalizeName(elements.accountDisplay?.value || username);
    const password = elements.accountPassword?.value || '';
    const endpoint = leaderboardState.authMode === 'signup' ? `${ACCOUNT_URL}/signup` : `${ACCOUNT_URL}/login`;

    if (username.length < 3) {
        setAccountMessage('Usuario precisa ter pelo menos 3 caracteres.', 'warn');
        return;
    }

    if (password.length < 10) {
        setAccountMessage('Senha precisa ter 10+ caracteres com letra e numero.', 'warn');
        return;
    }

    setAccountMessage('Validando credenciais...', 'idle');

    try {
        const result = await fetchJson(endpoint, {
            method: 'POST',
            body: JSON.stringify({ username, displayName, password })
        });

        leaderboardState.account = result.account || null;
        if (elements.accountPassword) elements.accountPassword.value = '';
        setAccountMessage('Conta conectada.', 'ready');
        syncAccountUI();
        closeAuthGate();
    } catch (error) {
        const code = error.payload?.error;
        const messages = {
            username_taken: 'Esse usuario ja existe.',
            username_too_short: 'Usuario precisa ter pelo menos 3 caracteres.',
            invalid_credentials: 'Usuario ou senha invalidos.',
            password_needs_letter_and_number: 'Use senha com letras e numeros.',
            password_too_short: 'Senha precisa ter 10+ caracteres.',
            password_too_long: 'Senha longa demais.',
            rate_limited: 'Muitas tentativas. Tente em instantes.'
        };
        setAccountMessage(messages[code] || 'Nao foi possivel conectar.', 'warn');
    }
}

async function logout() {
    try {
        await fetchJson(`${ACCOUNT_URL}/logout`, { method: 'POST', body: '{}' });
    } catch {
        // Se a rede falhar, ao menos a UI volta para convidado.
    }

    leaderboardState.account = null;
    setAccountMessage('Voce esta jogando como convidado.', 'idle');
    syncAccountUI();
    showAuthGate();
}

function continueAsGuest() {
    if (!leaderboardState.account) {
        const guestName = normalizeName(elements?.nameInput?.value || readLocalValue(PLAYER_NAME_KEY, 'RUNNER'));
        writeLocalValue(PLAYER_NAME_KEY, guestName);
    }
    closeAuthGate();
}

function wireEvents() {
    elements.leaderboardOpen?.addEventListener('click', openLeaderboardDialog);
    elements.leaderboardClose?.addEventListener('click', closeSystemDialogs);
    elements.accountOpen?.addEventListener('click', openAccountDialog);
    elements.authClose?.addEventListener('click', closeAuthGate);
    elements.guestContinue?.addEventListener('click', continueAsGuest);
    elements.accountForm?.addEventListener('submit', submitAccountForm);
    elements.logoutButton?.addEventListener('click', logout);

    if (elements.nameInput) {
        elements.nameInput.value = normalizeName(readLocalValue(PLAYER_NAME_KEY, 'RUNNER'));
        elements.nameInput.addEventListener('change', () => {
            const safeName = normalizeName(elements.nameInput.value);
            elements.nameInput.value = safeName;
            writeLocalValue(PLAYER_NAME_KEY, safeName);
            syncAccountUI();
        });
    }

    elements.tabs.forEach(button => {
        button.addEventListener('click', event => {
            event.preventDefault();
            syncLeaderboardMode(button.dataset.leaderboardMode);
            button.blur();
        });
    });

    elements.authModeButtons.forEach(button => {
        button.addEventListener('click', event => {
            event.preventDefault();
            leaderboardState.authMode = button.dataset.authMode === 'signup' ? 'signup' : 'login';
            syncAuthMode();
        });
    });
}

export function initLeaderboardUI() {
    const leaderboardModal = document.getElementById('leaderboard-modal');
    const authGate = document.getElementById('auth-gate');
    if (!leaderboardModal || !authGate) return;

    elements = {
        authGate,
        leaderboardModal,
        status: document.getElementById('leaderboard-status'),
        nameInput: document.getElementById('leaderboard-name-input'),
        list: document.getElementById('leaderboard-list'),
        tabs: [...document.querySelectorAll('[data-leaderboard-mode]')],
        leaderboardOpen: document.getElementById('leaderboard-open-btn'),
        leaderboardClose: document.getElementById('leaderboard-close-btn'),
        accountOpen: document.getElementById('account-open-btn'),
        authClose: document.getElementById('auth-close-btn'),
        guestContinue: document.getElementById('guest-continue-btn'),
        accountMode: document.getElementById('account-mode'),
        accountName: document.getElementById('account-name'),
        pilotMode: document.getElementById('pilot-mode'),
        pilotName: document.getElementById('pilot-name'),
        playerLabel: document.getElementById('leaderboard-player-label'),
        modeLabel: document.getElementById('leaderboard-mode-label'),
        accountForm: document.getElementById('account-form'),
        accountTabs: document.getElementById('account-form-tabs'),
        authTitle: document.getElementById('auth-title'),
        authModeButtons: [...document.querySelectorAll('[data-auth-mode]')],
        accountUsername: document.getElementById('account-username'),
        accountDisplay: document.getElementById('account-display'),
        accountPassword: document.getElementById('account-password'),
        accountSubmit: document.getElementById('account-submit-btn'),
        logoutButton: document.getElementById('account-logout-btn'),
        accountMessage: document.getElementById('account-message')
    };

    wireEvents();
    syncTabs();
    syncAccountUI();
    syncDialogVisibility();
    hydrateAccount();
    refreshLeaderboard(leaderboardState.modeId);
}
