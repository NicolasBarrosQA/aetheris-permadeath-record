const LANGUAGE_KEY = 'aetheris_language_v1';
const DEFAULT_LANGUAGE = 'en';
const SUPPORTED_LANGUAGES = new Set(['en', 'pt-BR']);

const TRANSLATIONS = {
    en: {
        'language.toggle': 'PT-BR',
        'language.toggleLabel': 'Switch language to Brazilian Portuguese',
        'difficulty.easy.name': 'EASY',
        'difficulty.easy.description': 'Rare boosts and more breathing room.',
        'difficulty.medium.name': 'MEDIUM',
        'difficulty.medium.description': 'The standard run, no extra help.',
        'difficulty.hard.name': 'HARD',
        'difficulty.hard.description': 'The virus consumes everything behind you.',
        'start.shortcuts': '[1] EASY  [2] MEDIUM  [3] HARD',
        'start.menu': '[ Q ] MENU | [ L ] LEADERBOARD | [ S ] SHOP | [ P ] PAUSE',
        'start.move': '[ ARROWS / A D ] MOVE TO START',
        'start.jump': '[ SPACE ] JUMP | [ C ] DASH+STRIKE',
        'hud.distance': 'DISTANCE',
        'hud.integrity': 'INTEGRITY',
        'hud.cache': 'CACHE',
        'hud.best': 'BEST:',
        'status.standby': 'STANDBY',
        'status.signalLost': 'SIGNAL LOST',
        'status.runActive': 'RUN ACTIVE',
        'status.waiting': 'STANDING BY',
        'status.strikeReady': 'STRIKE READY',
        'status.strikeCooldown': 'STRIKE {cooldown}',
        'status.strikeKey': 'C = STRIKE',
        'status.dashActive': 'DASH ACTIVE',
        'status.rainActive': 'RAIN ACTIVE',
        'status.weatherClear': 'WEATHER STABLE',
        'account.modalTop': 'AETHERIS ID',
        'account.close': 'CLOSE',
        'account.closeAria': 'Close',
        'account.mode.guest': 'GUEST',
        'account.mode.account': 'ACCOUNT',
        'account.open.account': 'ACCOUNT',
        'account.open.profile': 'PROFILE',
        'account.title.login': 'Enter AETHERIS',
        'account.title.profile': 'AETHERIS Profile',
        'account.copy': 'Keep one callsign and one leaderboard identity across itch and Netlify, or play as guest.',
        'account.tab.login': 'LOG IN',
        'account.tab.signup': 'CREATE',
        'account.usernamePlaceholder': 'username',
        'account.displayPlaceholder': 'callsign',
        'account.passwordPlaceholder': 'password',
        'account.submit.login': 'LOG IN',
        'account.submit.create': 'CREATE ACCOUNT',
        'account.logout': 'LOG OUT',
        'account.guestContinue': 'PLAY AS GUEST',
        'account.orSignIn': 'or sign in',
        'account.orSignIn': 'or sign in',
        'account.message.validating': 'Validating session...',
        'account.message.itchGuest': 'Itch account sync is online.',
        'account.message.connectedScores': 'Account connected. Your scores use this callsign.',
        'account.message.enterOrGuest': 'Log in to save your global identity, or play as guest.',
        'account.message.loginUnavailable': 'Login is unavailable right now. Guest mode remains open.',
        'account.message.itchGuestOnly': 'Account sync is unavailable in this session.',
        'account.message.usernameShort': 'Username needs at least 3 characters.',
        'account.message.passwordRule': 'Password needs 10+ characters with letters and numbers.',
        'account.message.validatingCredentials': 'Validating credentials...',
        'account.message.connected': 'Account connected.',
        'account.message.playingGuest': 'You are playing as guest.',
        'account.error.usernameTaken': 'That username is already taken.',
        'account.error.invalidCredentials': 'Username or password is invalid.',
        'account.error.passwordLetterNumber': 'Use a password with letters and numbers.',
        'account.error.passwordTooShort': 'Password needs 10+ characters.',
        'account.error.passwordTooLong': 'Password is too long.',
        'account.error.rateLimited': 'Too many attempts. Try again soon.',
        'account.error.connectFailed': 'Could not connect.',
        'leaderboard.top': 'GLOBAL LEADERBOARD',
        'leaderboard.action': 'LEADERBOARD',
        'leaderboard.short': 'RANKS',
        'leaderboard.close': 'CLOSE',
        'leaderboard.closeAria': 'Close leaderboard',
        'leaderboard.title': 'Global Leaderboard',
        'leaderboard.mode': 'MODE',
        'leaderboard.pilot': 'PILOT',
        'leaderboard.callsign': 'CALLSIGN',
        'leaderboard.tabsLabel': 'Leaderboard modes',
        'leaderboard.empty.loading': 'SYNCING LEADERBOARD...',
        'leaderboard.empty.noScores': 'NO VERIFIED SCORES IN THIS MODE',
        'leaderboard.status.sync': 'SYNC',
        'leaderboard.status.online': 'ONLINE',
        'leaderboard.status.offline': 'OFFLINE',
        'leaderboard.status.armed': 'ARMED',
        'leaderboard.status.validated': 'VALIDATED',
        'leaderboard.status.noSession': 'NO SESSION',
        'leaderboard.status.noScore': 'NO SCORE',
        'leaderboard.status.sending': 'SENDING',
        'leaderboard.status.review': 'REVIEW',
        'leaderboard.status.rejected': 'REJECTED',
        'leaderboard.status.failed': 'FAILED',
        'shop.title': 'BLACK MARKET',
        'shop.short': 'SHOP',
        'shop.choose': 'CHOOSE YOUR LOOK - [ESC] TO LEAVE',
        'shop.close': 'CLOSE',
        'shop.equipped': 'EQUIPPED',
        'shop.equip': 'EQUIP',
        'shop.buy': 'BUY {cost}{currency}',
        'shop.insufficient': 'Not enough cache!',
        'overlay.critical': 'CRITICAL SYSTEM',
        'overlay.connectionLost': 'CONNECTION LOST',
        'overlay.restart': 'RESTART',
        'overlay.newRecord': 'NEW RECORD',
        'overlay.summary': 'Distance: {distance}m | Record: {record}m',
        'pause.eyebrow': '// SYSTEM SUSPENDED',
        'pause.message': 'Press [ P ] or [ ESC ] to continue.',
        'pause.resume': 'RESUME',
        'mobile.controlsLabel': 'Touch controls',
        'mobile.left': 'Move left',
        'mobile.right': 'Move right',
        'mobile.openRanking': 'Open leaderboard',
        'mobile.openShop': 'Open shop',
        'mobile.pause': 'Pause',
        'mobile.jump': 'Jump',
        'mobile.dash': 'Dash and strike',
        'mobile.jumpButton': 'JUMP',
        'fullscreen.enter': 'FULLSCREEN',
        'fullscreen.playing': 'PLAYING',
        'fullscreen.aria': 'Open in fullscreen',
        'cheat.flyOn': 'CHEAT FLY ON',
        'cheat.flyOff': 'CHEAT FLY OFF',
        'boost.repair': 'REPAIR',
        'boost.slow': 'TIME SHIFT',
        'boost.triple': 'TRIPLE JUMP',
        'boost.airDash': 'AIR DASH'
    },
    'pt-BR': {
        'language.toggle': 'EN',
        'language.toggleLabel': 'Mudar idioma para ingles',
        'difficulty.easy.name': 'FACIL',
        'difficulty.easy.description': 'Boosts raros e mais folego.',
        'difficulty.medium.name': 'MEDIO',
        'difficulty.medium.description': 'A corrida padrao, sem ajuda extra.',
        'difficulty.hard.name': 'DIFICIL',
        'difficulty.hard.description': 'O virus consome tudo atras de voce.',
        'start.shortcuts': '[1] FACIL  [2] MEDIO  [3] DIFICIL',
        'start.menu': '[ Q ] MENU | [ L ] RANKING | [ S ] LOJA | [ P ] PAUSE',
        'start.move': '[ SETAS / A D ] MOVER PARA INICIAR',
        'start.jump': '[ ESPACO ] PULAR | [ C ] DASH+GOLPE',
        'hud.distance': 'DISTANCIA',
        'hud.integrity': 'INTEGRIDADE',
        'hud.cache': 'CACHE',
        'hud.best': 'MELHOR:',
        'status.standby': 'STANDBY',
        'status.signalLost': 'SINAL PERDIDO',
        'status.runActive': 'CORRIDA ATIVA',
        'status.waiting': 'AGUARDANDO',
        'status.strikeReady': 'GOLPE PRONTO',
        'status.strikeCooldown': 'GOLPE {cooldown}',
        'status.strikeKey': 'C = GOLPE',
        'status.dashActive': 'INVESTIDA ATIVA',
        'status.rainActive': 'CHUVA ATIVA',
        'status.weatherClear': 'CLIMA ESTAVEL',
        'account.modalTop': 'AETHERIS ID',
        'account.close': 'FECHAR',
        'account.closeAria': 'Fechar',
        'account.mode.guest': 'CONVIDADO',
        'account.mode.account': 'CONTA',
        'account.open.account': 'CONTA',
        'account.open.profile': 'PERFIL',
        'account.title.login': 'Entrar no AETHERIS',
        'account.title.profile': 'Perfil AETHERIS',
        'account.copy': 'Use um callsign e uma identidade de ranking no itch e no Netlify, ou jogue como convidado.',
        'account.tab.login': 'ENTRAR',
        'account.tab.signup': 'CRIAR',
        'account.usernamePlaceholder': 'usuario',
        'account.displayPlaceholder': 'callsign',
        'account.passwordPlaceholder': 'senha',
        'account.submit.login': 'ENTRAR',
        'account.submit.create': 'CRIAR CONTA',
        'account.logout': 'SAIR DA CONTA',
        'account.guestContinue': 'JOGAR COMO CONVIDADO',
        'account.orSignIn': 'ou entrar com conta',
        'account.orSignIn': 'ou entrar com conta',
        'account.message.validating': 'Validando sessao...',
        'account.message.itchGuest': 'Sincronizacao de conta ativa no itch.',
        'account.message.connectedScores': 'Conta conectada. Seus scores usam este callsign.',
        'account.message.enterOrGuest': 'Entre para salvar sua identidade global ou jogue como convidado.',
        'account.message.loginUnavailable': 'Login indisponivel agora. Modo convidado segue liberado.',
        'account.message.itchGuestOnly': 'Sincronizacao de conta indisponivel nesta sessao.',
        'account.message.usernameShort': 'Usuario precisa ter pelo menos 3 caracteres.',
        'account.message.passwordRule': 'Senha precisa ter 10+ caracteres com letra e numero.',
        'account.message.validatingCredentials': 'Validando credenciais...',
        'account.message.connected': 'Conta conectada.',
        'account.message.playingGuest': 'Voce esta jogando como convidado.',
        'account.error.usernameTaken': 'Esse usuario ja existe.',
        'account.error.invalidCredentials': 'Usuario ou senha invalidos.',
        'account.error.passwordLetterNumber': 'Use senha com letras e numeros.',
        'account.error.passwordTooShort': 'Senha precisa ter 10+ caracteres.',
        'account.error.passwordTooLong': 'Senha longa demais.',
        'account.error.rateLimited': 'Muitas tentativas. Tente em instantes.',
        'account.error.connectFailed': 'Nao foi possivel conectar.',
        'leaderboard.top': 'RANKING GLOBAL',
        'leaderboard.action': 'RANKING',
        'leaderboard.short': 'RANK',
        'leaderboard.close': 'FECHAR',
        'leaderboard.closeAria': 'Fechar ranking',
        'leaderboard.title': 'Placar Global',
        'leaderboard.mode': 'MODO',
        'leaderboard.pilot': 'PILOTO',
        'leaderboard.callsign': 'CALLSIGN',
        'leaderboard.tabsLabel': 'Modos do ranking',
        'leaderboard.empty.loading': 'SINCRONIZANDO RANKING...',
        'leaderboard.empty.noScores': 'SEM PONTUACOES VERIFICADAS NESTE MODO',
        'leaderboard.status.sync': 'SYNC',
        'leaderboard.status.online': 'ONLINE',
        'leaderboard.status.offline': 'OFFLINE',
        'leaderboard.status.armed': 'ARMADO',
        'leaderboard.status.validated': 'VALIDADO',
        'leaderboard.status.noSession': 'SEM SESSAO',
        'leaderboard.status.noScore': 'SEM SCORE',
        'leaderboard.status.sending': 'ENVIANDO',
        'leaderboard.status.review': 'REVISAO',
        'leaderboard.status.rejected': 'RECUSADO',
        'leaderboard.status.failed': 'FALHA',
        'shop.title': 'BLACK MARKET',
        'shop.short': 'LOJA',
        'shop.choose': 'ESCOLHA SEU VISUAL - [ESC] PARA SAIR',
        'shop.close': 'FECHAR',
        'shop.equipped': 'EQUIPADO',
        'shop.equip': 'EQUIPAR',
        'shop.buy': 'COMPRAR {cost}{currency}',
        'shop.insufficient': 'Saldo insuficiente!',
        'overlay.critical': 'SISTEMA CRITICO',
        'overlay.connectionLost': 'CONEXAO PERDIDA',
        'overlay.restart': 'REINICIAR',
        'overlay.newRecord': 'NOVO RECORDE',
        'overlay.summary': 'Distancia: {distance}m | Recorde: {record}m',
        'pause.eyebrow': '// SISTEMA SUSPENSO',
        'pause.message': 'Pressione [ P ] ou [ ESC ] para continuar.',
        'pause.resume': 'CONTINUAR',
        'mobile.controlsLabel': 'Controles touch',
        'mobile.left': 'Mover para esquerda',
        'mobile.right': 'Mover para direita',
        'mobile.openRanking': 'Abrir ranking',
        'mobile.openShop': 'Abrir loja',
        'mobile.pause': 'Pausar',
        'mobile.jump': 'Pular',
        'mobile.dash': 'Dash e golpe',
        'mobile.jumpButton': 'PULAR',
        'fullscreen.enter': 'TELA CHEIA',
        'fullscreen.playing': 'JOGANDO',
        'fullscreen.aria': 'Abrir em tela cheia',
        'cheat.flyOn': 'CHEAT VOAR ON',
        'cheat.flyOff': 'CHEAT VOAR OFF',
        'boost.repair': 'REPARO',
        'boost.slow': 'TIME SHIFT',
        'boost.triple': 'TRIPLE JUMP',
        'boost.airDash': 'AIR DASH'
    }
};

const listeners = new Set();

function readStoredLanguage() {
    try {
        const stored = localStorage.getItem(LANGUAGE_KEY);
        return SUPPORTED_LANGUAGES.has(stored) ? stored : DEFAULT_LANGUAGE;
    } catch {
        return DEFAULT_LANGUAGE;
    }
}

function writeStoredLanguage(language) {
    try {
        localStorage.setItem(LANGUAGE_KEY, language);
    } catch {
        // Language preference is nice to have; gameplay should continue if storage is blocked.
    }
}

function normalizeLanguage(language) {
    return SUPPORTED_LANGUAGES.has(language) ? language : DEFAULT_LANGUAGE;
}

let currentLanguage = readStoredLanguage();

function applyDocumentLanguage() {
    if (typeof document === 'undefined') return;
    document.documentElement.lang = currentLanguage === 'pt-BR' ? 'pt-BR' : 'en';
}

function interpolate(template, values) {
    return String(template).replace(/\{(\w+)\}/g, (_, key) => {
        const value = values?.[key];
        return value === undefined || value === null ? '' : String(value);
    });
}

function matchingElements(root, selector) {
    const matches = [];
    if (root?.matches?.(selector)) matches.push(root);
    if (root?.querySelectorAll) matches.push(...root.querySelectorAll(selector));
    return matches;
}

export function getLanguage() {
    return currentLanguage;
}

export function t(key, values = {}) {
    const table = TRANSLATIONS[currentLanguage] || TRANSLATIONS[DEFAULT_LANGUAGE];
    const fallback = TRANSLATIONS[DEFAULT_LANGUAGE];
    return interpolate(table[key] || fallback[key] || key, values);
}

export function setLanguage(language) {
    const nextLanguage = normalizeLanguage(language);
    if (nextLanguage === currentLanguage) return;

    currentLanguage = nextLanguage;
    writeStoredLanguage(currentLanguage);
    applyDocumentLanguage();
    listeners.forEach(listener => listener(currentLanguage));
}

export function toggleLanguage() {
    setLanguage(currentLanguage === 'en' ? 'pt-BR' : 'en');
}

export function onLanguageChange(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

export function applyStaticTranslations(root = document) {
    applyDocumentLanguage();

    matchingElements(root, '[data-i18n]').forEach(element => {
        element.textContent = t(element.dataset.i18n);
    });

    matchingElements(root, '[data-i18n-placeholder]').forEach(element => {
        element.setAttribute('placeholder', t(element.dataset.i18nPlaceholder));
    });

    matchingElements(root, '[data-i18n-aria-label]').forEach(element => {
        element.setAttribute('aria-label', t(element.dataset.i18nAriaLabel));
    });

    matchingElements(root, '[data-i18n-title]').forEach(element => {
        element.setAttribute('title', t(element.dataset.i18nTitle));
    });
}

export function setupLanguageToggle() {
    const button = document.getElementById('language-toggle');
    if (!button) return;

    const syncButton = () => {
        button.textContent = t('language.toggle');
        button.setAttribute('aria-label', t('language.toggleLabel'));
        button.setAttribute('title', t('language.toggleLabel'));
    };

    button.addEventListener('click', event => {
        event.preventDefault();
        event.stopPropagation();
        toggleLanguage();
        button.blur();
        window.focus();
    });

    onLanguageChange(syncButton);
    syncButton();
}

applyDocumentLanguage();
