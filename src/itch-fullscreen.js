import { onLanguageChange, t } from './i18n.js';

const fullscreenButton = document.getElementById('itch-fullscreen-btn');
const fullscreenTarget = document.documentElement;

function isFullscreen() {
    return Boolean(document.fullscreenElement);
}

function syncFullscreenButton() {
    document.body.classList.toggle('is-fullscreen', isFullscreen());
    if (!fullscreenButton) return;
    fullscreenButton.innerText = isFullscreen() ? t('fullscreen.playing') : t('fullscreen.enter');
    fullscreenButton.setAttribute('aria-label', t('fullscreen.aria'));
    fullscreenButton.setAttribute('title', t('fullscreen.aria'));
    fullscreenButton.hidden = !document.fullscreenEnabled;
}

function resizeAfterFullscreenChange() {
    window.setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
    }, 80);
}

async function enterFullscreen() {
    if (!document.fullscreenEnabled || isFullscreen()) return;

    try {
        await fullscreenTarget.requestFullscreen({ navigationUI: 'hide' });
    } catch {
        return;
    } finally {
        resizeAfterFullscreenChange();
    }
}

fullscreenButton?.addEventListener('click', event => {
    event.preventDefault();
    event.stopPropagation();
    enterFullscreen();
    window.focus();
});

window.addEventListener('keydown', event => {
    const key = event.key.toLowerCase();
    if (key === 'f' || key === 'arrowleft' || key === 'arrowright' || key === 'a' || key === 'd') {
        enterFullscreen();
    }
}, { once: true });

window.addEventListener('pointerdown', () => {
    enterFullscreen();
}, { once: true });

document.addEventListener('fullscreenchange', () => {
    syncFullscreenButton();
    resizeAfterFullscreenChange();
});

onLanguageChange(syncFullscreenButton);
syncFullscreenButton();
