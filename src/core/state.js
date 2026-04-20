/*
 * Estado global compartilhado entre os módulos. Todas as variáveis que
 * anteriormente eram globais no arquivo monolítico vivem aqui. O objeto
 * exportado permite modificar propriedades sem quebrar a imutabilidade das
 * importações de ES6.
 */

const state = {
    // Referências de DOM; atribuídas em main.js após carregamento
    container: null,
    canvas: null,
    ctx: null,
    overlay: null,
    overlayTitle: null,
    overlayMsg: null,
    shopModal: null,
    skinsGrid: null,
    startHint: null,
    bgm: null,
    uiLayer: null,
    uiDist: null,
    uiBest: null,
    uiCoins: null,
    hpBarFill: null,
    shopBalance: null,
    uiDash: null,
    uiAttack: null,
    uiWeather: null,
    uiState: null,
    uiBoost: null,
    uiBoostIcon: null,
    uiBoostName: null,
    uiBoostTime: null,
    uiBoostFill: null,
    difficultyButtons: [],

    // Objeto de jogo contendo flags de estado e contadores
    game: {
        running: true,
        started: false,
        shopOpen: false,
        frames: 0,
        // Contador de frames corridos. É incrementado apenas quando
        // a corrida está em andamento (jogador iniciou, não está em
        // game over nem na loja). Usado para o ciclo dia/noite.
        runFrames: 0,
        dist: 0,
        coins: 0,
        difficulty: 1.0,
        modeId: 'medium',
        time: 0,
        timeScale: 1,
        simAccumulator: 0,
        audioStarted: false,
        newRecordReached: false,
        isGameOver: false,
        rafId: null
    },

    // Câmera 2D simples
    camera: { x: 0, y: 0, shake: 0 },

    // Informações de viewport e escala. Preenchidas pela função
    // resizeCanvas() em main.js. Contém escala, offsets e o fator
    // devicePixelRatio para evitar blur em telas de alta densidade.
    view: {
        scale: 1,
        scaleX: 1,
        scaleY: 1,
        offsetX: 0,
        offsetY: 0,
        dpr: 1,
        width: 0,
        height: 0,
        worldWidth: 900,
        worldHeight: 600,
        screenWidth: 0,
        screenHeight: 0
    },
    performance: {
        lastTs: 0,
        avgFrameMs: 16.67,
        quality: 1,
        warmupFrames: 180
    },

    // Mapeamento de teclas; manipulado em main.js
    keys: {},

    // Entidades principais
    player: null,
    platforms: [],
    enemies: [],
    coins: [],
    boosts: [],
    particles: [],
    texts: [],
    ghosts: [],
    attackEffects: [],
    activeBoost: null,
    virusWall: { active: false, x: -900, pulse: 0, damageTick: 0 },

    // Elementos de fundo e efeitos
    bgLayer1: [],
    bgLayer2: [],
    bgLayer3: [],
    dustParticles: [],
    stars: [],
    lightBeams: [],
    rainDrops: [],
    rainSplashes: [],
    rainState: { active: false, timer: 0 },

    // Flag de trapaça (voo)
    cheatFlight: false,

    // Funções de callback que serão registradas pelo motor
    startGameRun: null,
    gameOver: null
};

export default state;
