/*
 * PWA glue: registra o service worker fora do itch e controla o botao
 * "instalar app" (beforeinstallprompt so existe em Chromium).
 */

import { platform } from './platform.js';
import { applyStaticTranslations } from './i18n.js';

const SW_URL = '/sw.js';

function isLocalHost(hostname) {
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';
}

function canRegisterServiceWorker() {
    if (!('serviceWorker' in navigator)) return false;
    if (platform.isItch) return false;
    const { protocol, hostname } = window.location;
    return protocol === 'https:' || isLocalHost(hostname);
}

function isStandaloneDisplay() {
    return window.matchMedia?.('(display-mode: standalone), (display-mode: fullscreen)').matches
        || window.navigator.standalone === true;
}

function registerServiceWorker() {
    if (!canRegisterServiceWorker()) return;

    window.addEventListener('load', () => {
        navigator.serviceWorker.register(SW_URL).catch(() => {
            // Sem SW o jogo continua 100% funcional online.
        });
    });
}

function setupInstallButton() {
    const installButton = document.getElementById('pwa-install-btn');
    if (!installButton) return;

    let deferredPrompt = null;

    const hideButton = () => {
        deferredPrompt = null;
        installButton.classList.add('hidden');
    };

    window.addEventListener('beforeinstallprompt', event => {
        event.preventDefault();
        if (platform.isItch || isStandaloneDisplay()) return;
        deferredPrompt = event;
        installButton.classList.remove('hidden');
        applyStaticTranslations(installButton);
    });

    installButton.addEventListener('click', async () => {
        if (!deferredPrompt) return;
        const promptEvent = deferredPrompt;
        deferredPrompt = null;
        promptEvent.prompt();
        try {
            const choice = await promptEvent.userChoice;
            if (choice?.outcome === 'accepted') hideButton();
        } catch {
            // Usuario dispensou o dialogo nativo; botao pode reaparecer no proximo evento.
        }
    });

    window.addEventListener('appinstalled', hideButton);
}

registerServiceWorker();
setupInstallButton();
