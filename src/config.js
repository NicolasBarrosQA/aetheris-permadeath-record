/*
 * Constantes de configuração do jogo.
 * Mantém física, paleta de HP, rótulos e skins exatamente como no protótipo.
 */

// Parâmetros de física e de controle de movimento
export const PHYS = {
    gravity: 0.85,
    runAccel: 1.8,
    airAccel: 1.0,
    friction: 0.82,
    airFriction: 0.9,
    maxGroundSpeed: 12,
    maxAirSpeed: 10,
    jumpForce: -14.5,
    doubleJumpForce: -13,
    coyoteFrames: 8,
    jumpBufferFrames: 6,
    dashSpeed: 34,
    dashDuration: 14,
    dashCooldown: 45,
    invulOnHit: 50,
    invulOnDash: 15
};

export const WORLD = {
    killFloorPlayer: 820,
    killFloorEnemy: 1000,
    enemyDetectRangeX: 500,
    enemyDetectRangeY: 200
};

export const VIEWPORT = {
    CAMERA_OFFSET_X_RATIO: 0.22,
    CAMERA_OFFSET_Y_RATIO: 0.52
};

// Largura e altura virtuais utilizadas pelo canvas.
// O mundo lógico sempre é desenhado em 900x600 independentemente da
// resolução de tela real. Use estas constantes para calcular escalas
// e offsets ao redimensionar.
export const VIRTUAL_WIDTH = 900;
export const VIRTUAL_HEIGHT = 600;

// Duração do ciclo dia/noite em segundos. A cada novo ciclo o sol
// atravessa o céu e a noite se inicia. O valor pode ser configurado
// para ajustar a duração do ciclo sem alterar o código de desenho.
export const DAY_NIGHT_CYCLE_SECONDS = 90;

// Objeto agrupando os parâmetros de balanceamento de progressão e
// velocidade. Centralizar estes valores facilita ajustes futuros e
// evita números mágicos espalhados pelo código. Nenhuma mecânica
// adicional é introduzida — apenas movemos constantes existentes.
export const BALANCE = {
    // Configurações de dificuldade: a cada distInterval metros a
    // dificuldade aumenta em incremento. A base define o valor
    // inicial de dificuldade. Estes valores replicam o protótipo
    // original (1500px ≈ 150m) com incremento de 0.2.
    difficulty: {
        base: 1,
        distInterval: 1500,
        increment: 0.2
    },
    // Configurações de boost de velocidade. O early boost aumenta
    // progressivamente no início da corrida e é limitado. O extra
    // boost é aplicado após um certo ponto e cresce mais lentamente.
    speed: {
        // Early boost: +0.2 a cada 500m, limitado a +1.0.
        earlyBoostInterval: 500,
        earlyBoostStep: 0.2,
        earlyBoostMax: 1.0,
        // Extra boost: começa depois de 2500m. +0.05 a cada 1500m,
        // limitado a +0.25.
        extraBoostAfter: 2500,
        extraBoostInterval: 1500,
        extraBoostStep: 0.05,
        extraBoostMax: 0.25,
        // Velocidades absolutas máximas após todos os multiplicadores.
        maxGroundSpeed: 22,
        maxAirSpeed: 19
    },
    // Escalonamento do vírus no modo dificil. A curva é assintotica:
    // cresce rapido no inicio e desacelera com a distancia, evitando
    // um teto matematico que torne a corrida impossivel.
    virus: {
        // Velocidade base quando difficulty = BALANCE.difficulty.base.
        baseSpeed: 7.69824,
        // Teto assintotico da velocidade do virus.
        maxSpeed: 24.2,
        // Quanto maior, mais cedo a curva se aproxima do teto.
        difficultyFalloff: 0.6
    }
};

export const DIFFICULTY_MODES = {
    easy: {
        id: 'easy',
        label: 'FACIL',
        accent: '#66f2a4',
        description: 'Ritmo mais leve com drops raros de boost.',
        boostDrops: true,
        virusPressure: false
    },
    medium: {
        id: 'medium',
        label: 'MEDIO',
        accent: '#5bd7ff',
        description: 'A corrida atual, sem ajuda extra.',
        boostDrops: false,
        virusPressure: false
    },
    hard: {
        id: 'hard',
        label: 'DIFICIL',
        accent: '#ff5b7d',
        description: 'O virus apaga o mapa atras de voce.',
        boostDrops: false,
        virusPressure: true
    }
};

export const BOOST_TYPES = {
    repair: {
        id: 'repair',
        label: 'REPARO',
        color: '#63f0a7',
        accent: '#d7ffe8',
        icon: 'repair.svg',
        duration: 220
    },
    slow: {
        id: 'slow',
        label: 'TIME SHIFT',
        color: '#6bd7ff',
        accent: '#effaff',
        icon: 'slow.svg',
        duration: 280
    },
    triple: {
        id: 'triple',
        label: 'TRIPLE JUMP',
        color: '#cf7bff',
        accent: '#f7e6ff',
        icon: 'triple.svg',
        duration: 360
    },
    airDash: {
        id: 'airDash',
        label: 'AIR DASH',
        color: '#ffb14d',
        accent: '#fff0d9',
        icon: 'airdash.svg',
        duration: 320
    }
};

// Cores do indicador de HP
export const HP_COLOR = {
    high: '#28e0a2',
    mid: '#f5c542',
    low: '#ff3355'
};

// Sufixo usado na exibição de moedas (coins)
export const COIN_LABEL = ' CR';

// Cor base dos prédios em background (sincroniza com plataformas)
export const BUILDING_BASE = { body: '#0a0c18' };

// Base de dados de skins: nome, custo e cores
export const SKINS_DB = [
    {
        id: 0,
        name: 'Neon Walker',
        cost: 0,
        c1: '#0ff',
        c2: '#0055ff',
        glow: '#0ff'
    },
    { 
        id: 1, 
        name: 'Crimson Ronin',  
        cost: 0, 
        c1: '#ff3333', 
        c2: '#880000', 
        glow: '#ff0000' 
    },
    { 
        id: 2, 
        name: 'Bio-Hazard',     
        cost: 0, 
        c1: '#33ff33', 
        c2: '#005500', 
        glow: '#00ff00' 
    },
    { 
        id: 3, 
        name: 'Golden Glitch',  
        cost: 0, 
        c1: '#ffd700', 
        c2: '#ffaa00', 
        glow: '#ffff00' 
    },
    { 
        id: 4, 
        name: 'Void Specter',   
        cost: 1000, 
        c1: '#220033', 
        c2: '#110011', 
        glow: '#aa00ff' 
    },
    { 
        id: 5, 
        name: 'Storm Shinobi',  
        cost: 0, 
        c1: '#fce45c', 
        c2: '#0a2a73', 
        glow: '#4ddbff'
    },

    // --- SKINS COM SPRITE ---

    {
        id: 6,
        name: "Naruto",
        cost: 0,
        c1: "#fce45c",
        c2: "#fca53c",
        glow: "#ff7700ff",
        sprite: "naruto.png"
    },

    {
        id: 7,
        name: 'Pirate King',
        cost: 0,
        c1: '#850505ff',
        c2: '#d62828',
        glow: '#ff0000ff',
        sprite: 'luffy.png'
    },
    
    {
        id: 8,
        name: 'Goku',
        cost: 0,
        c1: '#01cffdff',
        c2: '#28b0d6ff',
        glow: '#01cffdff',
        sprite: 'goku.png'
    },
    {
        id: 9,
        name: 'naruto shipuden',
        cost: 0,
        c1: '#ffcf3a',
        c2: '#ff941e',
        glow: '#ffc84a',
        sprite: 'naruto_shipuden.png'
    }
];
