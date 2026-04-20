/*
 * Funcoes de interface do jogo: loja, HUD e sincronizacao com o DOM.
 */

import state from '../core/state.js';
import { storage, save } from '../core/storage.js';
import { BOOST_TYPES, COIN_LABEL, DIFFICULTY_MODES, SKINS_DB, HP_COLOR } from '../config.js';
import { resumeAudioContext, SFX } from '../core/audio.js';

function getUnlockedSet() {
    return new Set(storage.unlockedSkins);
}

function setPillState(element, text, tone) {
    if (!element) return;
    element.innerText = text;
    element.className = `status-pill ${tone}`;
}

export function setDifficultyMode(modeId) {
    if (!DIFFICULTY_MODES[modeId]) return;
    storage.difficultyMode = modeId;
    state.game.modeId = modeId;
    save();
    syncDifficultyUI();
}

export function syncDifficultyUI() {
    if (!state.difficultyButtons?.length) return;
    state.difficultyButtons.forEach(button => {
        button.classList.toggle('selected', button.dataset.difficulty === storage.difficultyMode);
    });
}

export function toggleShop() {
    if (state.game.started || state.game.isGameOver) return;

    resumeAudioContext();

    state.game.shopOpen = !state.game.shopOpen;
    state.shopModal.style.display = state.game.shopOpen ? 'flex' : 'none';
    state.startHint.style.display = state.game.shopOpen ? 'none' : 'block';

    if (state.game.shopOpen) {
        renderShop();
    }
}

export function renderShop() {
    const unlockedSkins = getUnlockedSet();
    const fragment = document.createDocumentFragment();

    state.skinsGrid.innerHTML = '';
    state.shopBalance.innerText = storage.totalCoins + COIN_LABEL;

    SKINS_DB.forEach(skin => {
        const isUnlocked = unlockedSkins.has(skin.id);
        const isEquipped = storage.currentSkinId === skin.id;
        const card = document.createElement('div');
        const preview = document.createElement('div');
        const name = document.createElement('div');
        const actionBtn = document.createElement('button');

        card.className = `skin-card ${isEquipped ? 'selected' : ''} ${!isUnlocked ? 'locked' : ''}`;

        preview.className = 'skin-preview';
        preview.style.color = skin.glow;
        if (skin.sprite) {
            preview.style.backgroundColor = 'rgba(3, 8, 20, 0.88)';
            preview.style.backgroundImage = `url(../assets/img/skins/${skin.sprite})`;
            preview.style.backgroundPosition = 'center';
            preview.style.backgroundRepeat = 'no-repeat';
            preview.style.backgroundSize = 'contain';
        } else {
            preview.style.background = `linear-gradient(to bottom, ${skin.c1}, ${skin.c2})`;
        }

        name.className = 'skin-name';
        name.innerText = skin.name;

        actionBtn.className = 'btn-buy';
        actionBtn.type = 'button';

        if (isEquipped) {
            actionBtn.innerText = 'EQUIPADO';
            actionBtn.className += ' btn-equip';
            actionBtn.disabled = true;
        } else if (isUnlocked) {
            actionBtn.innerText = 'EQUIPAR';
            actionBtn.onclick = () => equipSkin(skin.id);
        } else {
            actionBtn.innerText = `COMPRAR ${skin.cost}${COIN_LABEL}`;
            actionBtn.onclick = () => buySkin(skin.id, skin.cost);
        }

        card.appendChild(preview);
        card.appendChild(name);
        card.appendChild(actionBtn);
        fragment.appendChild(card);
    });

    state.skinsGrid.appendChild(fragment);
}

export function buySkin(id, cost) {
    if (storage.unlockedSkins.includes(id)) {
        equipSkin(id);
        return;
    }

    if (storage.totalCoins < cost) {
        alert('Saldo insuficiente!');
        return;
    }

    storage.totalCoins -= cost;
    storage.unlockedSkins = [...new Set([...storage.unlockedSkins, id])];
    save();
    renderShop();
    SFX.coin();
}

export function equipSkin(id) {
    if (!storage.unlockedSkins.includes(id)) return;

    storage.currentSkinId = id;
    save();

    if (state.player && typeof state.player.updateSkin === 'function') {
        state.player.updateSkin();
    }

    renderShop();
    SFX.coin();
}

export function updateUI() {
    const distM = Math.floor(state.game.dist / 10);

    state.uiDist.innerText = `${distM}m`;
    state.uiCoins.innerText = String(storage.totalCoins);
    state.uiBest.innerText = `${Math.floor(storage.highScore / 10)}m`;

    if (state.player) {
        const hpVal = Math.max(0, Math.min(state.player.hp, 100));
        state.hpBarFill.style.width = `${hpVal}%`;

        if (hpVal > 60) {
            state.hpBarFill.style.background = `linear-gradient(90deg, ${HP_COLOR.high}, #5bf7d6)`;
        } else if (hpVal > 35) {
            state.hpBarFill.style.background = `linear-gradient(90deg, ${HP_COLOR.mid}, #f3df7c)`;
        } else {
            state.hpBarFill.style.background = `linear-gradient(90deg, ${HP_COLOR.low}, #ff7a8a)`;
        }

        const strikeReady = state.player.dashCd <= 0 &&
            state.player.attackCd <= 0 &&
            !state.player.isDashing;
        const strikeCd = Math.max(state.player.dashCd, state.player.attackCd, 0);
        const weatherActive = state.rainState.active && state.game.started;
        const stateText = state.game.isGameOver
            ? 'SINAL PERDIDO'
            : (state.game.started ? 'CORRIDA ATIVA' : 'AGUARDANDO');

        setPillState(state.uiState, stateText, state.game.started ? 'hot' : 'cold');
        setPillState(
            state.uiDash,
            strikeReady ? 'GOLPE PRONTO' : `GOLPE ${strikeCd}`,
            strikeReady ? 'ready' : 'idle'
        );
        setPillState(
            state.uiAttack,
            state.player.isDashing ? 'INVESTIDA ATIVA' : 'C = GOLPE',
            state.player.isDashing ? 'hot' : 'cold'
        );
        setPillState(
            state.uiWeather,
            weatherActive ? 'CHUVA ATIVA' : 'CLIMA ESTAVEL',
            weatherActive ? 'warn' : 'cold'
        );
    }

    state.uiLayer.style.opacity = state.game.started ? '1' : '0.3';

    if (state.uiBoost) {
        const activeBoost = state.activeBoost;
        if (activeBoost) {
            const boostDef = BOOST_TYPES[activeBoost.id];
            const ratio = activeBoost.maxDuration > 0 ? (activeBoost.duration / activeBoost.maxDuration) : 0;
            state.uiBoost.classList.remove('hidden');
            state.uiBoostName.innerText = boostDef?.label || 'BOOST';
            state.uiBoostTime.innerText = `${(activeBoost.duration / 60).toFixed(1)}s`;
            state.uiBoostFill.style.width = `${Math.max(0, Math.min(100, ratio * 100))}%`;
            state.uiBoostFill.style.background = `linear-gradient(90deg, ${boostDef?.color || '#63f0a7'}, ${boostDef?.accent || '#effaff'})`;
            state.uiBoost.style.borderColor = `${boostDef?.color || '#63f0a7'}55`;
            state.uiBoostIcon.style.backgroundImage = boostDef?.icon ? `url(../assets/img/boosts/${boostDef.icon})` : 'none';
            state.uiBoostIcon.style.boxShadow = `0 0 22px ${boostDef?.color || '#63f0a7'}33`;
        } else {
            state.uiBoost.classList.add('hidden');
        }
    }
}
