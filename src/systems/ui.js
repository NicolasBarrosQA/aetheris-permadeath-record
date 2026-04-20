/*
 * Funcoes de interface do jogo: loja, HUD e sincronizacao com o DOM.
 */

import state from '../core/state.js';
import { storage, save } from '../core/storage.js';
import { COIN_LABEL, SKINS_DB, HP_COLOR } from '../config.js';
import { resumeAudioContext, SFX } from '../core/audio.js';

function getUnlockedSet() {
    return new Set(storage.unlockedSkins);
}

function setPillState(element, text, tone) {
    if (!element) return;
    element.innerText = text;
    element.className = `status-pill ${tone}`;
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

        const dashReady = state.player.dashCd <= 0 && !state.player.isDashing;
        const attackReady = state.player.attackCd <= 0;
        const weatherActive = state.rainState.active && state.game.started;
        const stateText = state.game.isGameOver
            ? 'SINAL PERDIDO'
            : (state.game.started ? 'CORRIDA ATIVA' : 'AGUARDANDO');

        setPillState(state.uiState, stateText, state.game.started ? 'hot' : 'cold');
        setPillState(
            state.uiDash,
            dashReady ? 'DASH PRONTO' : `DASH ${Math.max(0, state.player.dashCd)}`,
            dashReady ? 'ready' : 'idle'
        );
        setPillState(
            state.uiAttack,
            attackReady ? 'ATAQUE PRONTO' : `ATAQUE ${Math.max(0, state.player.attackCd)}`,
            attackReady ? 'ready' : 'idle'
        );
        setPillState(
            state.uiWeather,
            weatherActive ? 'CHUVA ATIVA' : 'CLIMA ESTAVEL',
            weatherActive ? 'warn' : 'cold'
        );
    }

    state.uiLayer.style.opacity = state.game.started ? '1' : '0.3';
}
