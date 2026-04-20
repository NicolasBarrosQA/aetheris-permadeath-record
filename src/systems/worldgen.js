/*
 * Geração procedural do mundo, plataformas, inimigos e moedas. Mantém
 * variáveis internas de posição para construir sequencialmente sem
 * depender de estado externo. Algumas funções de ambiente como
 * chuva e poeira também são definidas aqui, pois interagem com o
 * cenário gerado.
 */

import state from '../core/state.js';
import Enemy from '../entities/enemy.js';

// Variáveis internas para acompanhar a posição das últimas plataformas
let lastPlatX = 800;
let lastPlatY = 400;

/**
 * Reinicia as variáveis internas de geração. Deve ser chamado pelo motor
 * na inicialização para garantir que a geração comece do início.
 */
export function resetWorldParams() {
    lastPlatX = 800;
    lastPlatY = 400;
}

/**
 * Cria um prédio para o plano de fundo. Os parâmetros controlam
 * parallax, alturas e opacidade. Esta função não adiciona o prédio
 * automaticamente; cabe ao chamador decidir onde armazená-lo.
 */
export function createBuilding(i, parallax, yMin, yMax, wMin, wMax, opacity) {
    const patterns = ['grid', 'stripes', 'bars', 'slits'];
    const viewH = Math.max(600, state.view?.worldHeight || 600);
    const minWidth = Math.max(90, wMin);
    const maxWidth = Math.max(minWidth + 30, wMax);
    const spacing = maxWidth + 35;
    const width = minWidth + Math.random() * (maxWidth - minWidth);
    return {
        x: i * spacing,
        y: yMin + Math.random() * (yMax - yMin),
        w: width,
        h: viewH + 140,
        opacity: opacity,
        parallax: parallax,
        flashTimer: 0,
        pattern: patterns[Math.floor(Math.random() * patterns.length)],
        accentShift: -16 + Math.random() * 32,
        windowPhase: Math.random() * Math.PI * 2,
        windowDensity: 0.86 + Math.random() * 0.28,
        beacon: Math.random() < 0.35,
        beaconOffset: 0.18 + Math.random() * 0.64,
        antennaHeight: 14 + Math.random() * 22,
        facadeBands: 2 + Math.floor(Math.random() * 3)
    };
}

/**
 * Gera uma partícula de poeira que se move suavemente para a esquerda.
 * @param {boolean} randomX Se verdadeiro, inicia em posição X aleatória; caso contrário começa fora da tela (lado direito).
 */
export function spawnDust(randomX) {
    const viewW = state.view?.worldWidth || 900;
    const viewH = state.view?.worldHeight || 600;
    const startY = viewH * (320 / 600);
    state.dustParticles.push({
        x: randomX ? Math.random() * viewW : viewW,
        y: startY + Math.random() * Math.max(120, viewH - startY),
        vx: -0.5 - Math.random(),
        size: Math.random() * 2,
        alpha: Math.random() * 0.5
    });
}

/**
 * Cria uma gota de chuva. A altura inicial pode ser aleatória ou fixa em -20.
 * @param {boolean} randomY Se verdadeiro, a gota nasce em qualquer altura da tela.
 */
export function spawnRainDrop(randomY) {
    const viewW = state.view?.worldWidth || 900;
    const viewH = state.view?.worldHeight || 600;
    state.rainDrops.push({
        x: Math.random() * viewW,
        y: randomY ? Math.random() * viewH : -20,
        len: 12 + Math.random() * 18,
        speed: 10 + Math.random() * 8,
        alpha: 0.35 + Math.random() * 0.25
    });
}

/**
 * Cria um respingo de chuva ao atingir o chão.
 * @param {number} x Posição X
 * @param {number} y Posição Y
 */
export function spawnRainSplash(x, y) {
    state.rainSplashes.push({
        x,
        y,
        life: 14,
        maxLife: 14,
        spread: 3 + Math.random() * 2
    });
}

/**
 * Reinicia o temporizador que determina quando começa/termina a chuva.
 */
export function resetRainTimer() {
    state.rainState.timer = (20 + Math.random() * 40) * 60; // 20 a 60 segundos em frames
}

/**
 * Inicializa as condições atmosféricas (chuva e feixes de luz). Escolhe
 * aleatoriamente se a chuva começa ativa e preenche as listas de gotas
 * iniciais, se necessário.
 */
export function initAtmosphere() {
    state.lightBeams = [];
    state.rainDrops = [];
    state.rainSplashes = [];
    // Chuva inicia desativada para evitar pico de custo no primeiro segundo.
    state.rainState.active = false;
    resetRainTimer();
}

/**
 * Gera novas plataformas, inimigos e moedas enquanto a câmera avança.
 * Também remove entidades que ficaram muito para trás, garantindo
 * desempenho. A dificuldade e os espaçamentos escalam com a distância
 * percorrida conforme definido no protótipo.
 */
export function generateWorld() {
    // Gera plataformas até uma distância à frente da câmera
    const viewW = state.view?.worldWidth || 900;
    while (lastPlatX < state.camera.x + viewW + 600) {
        // Definição de gaps mínima e máxima escalando com dificuldade
        let minGap = 120 + (state.game.difficulty * 18);
        let maxGap = 220 + (state.game.difficulty * 35);
        if (maxGap > 360) maxGap = 360;
        let gap = minGap + Math.random() * (maxGap - minGap);
        let w = 220 + Math.random() * 260;
        let y = lastPlatY + (Math.random() - 0.5) * 150;
        if (y < 200) y = 200;
        if (y > 480) y = 480;
        let x = lastPlatX + gap;
        let spikeInfo = null;
        let hasSpikes = false;
        if (w > 240 && Math.random() < 0.3) {
            hasSpikes = true;
            let spikeW = 60 + Math.random() * 80;
            let spikeX = x + 50 + Math.random() * (w - 100 - spikeW);
            spikeInfo = { x: spikeX, w: spikeW };
        }
        state.platforms.push({
            x,
            y,
            w,
            h: 40,
            colorHue: (state.game.dist / 100) % 360,
            spikeInfo: spikeInfo
        });
        // Chance de gerar inimigo baseado na dificuldade e largura da plataforma
        let enemyChance = Math.min(0.25 + (state.game.difficulty * 0.12), 0.65);
        if (Math.random() < enemyChance && w > 150 && !hasSpikes) {
            state.enemies.push(new Enemy(x + w / 2, y - 50));
        }
        // Gera no maximo uma moeda por plataforma
        if (Math.random() > 0.35) {
            let cx = x + w / 2;
            let cy = hasSpikes ? y - 100 : y - 40;
            state.coins.push({ x: cx, y: cy, rot: Math.random() * 6 });
        }
        if (state.game.modeId === 'easy' &&
            !state.activeBoost &&
            state.boosts.length === 0 &&
            !hasSpikes &&
            w > 170 &&
            Math.random() < 0.11) {
            const boostIds = ['repair', 'slow', 'triple', 'airDash'];
            const boostId = boostIds[Math.floor(Math.random() * boostIds.length)];
            state.boosts.push({
                id: boostId,
                x: x + (w * (0.34 + Math.random() * 0.32)),
                y: y - 74,
                rot: Math.random() * 6,
                bob: Math.random() * Math.PI * 2
            });
        }
        lastPlatX = x + w;
        lastPlatY = y;
    }
    // Remove objetos que passaram muito para trás da câmera
    let cutoff = state.camera.x - Math.max(500, viewW * 0.7);
    state.platforms = state.platforms.filter(p => p.x + p.w > cutoff);
    state.enemies = state.enemies.filter(e => e.hp > 0 && e.x > cutoff);
    state.boosts = state.boosts.filter(boost => boost.x > cutoff);
    // Garantia defensiva: nunca deixar duas moedas na mesma plataforma.
    const platformCoinKeys = new Set();
    state.coins = state.coins.filter(c => {
        if (c.x <= cutoff) return false;

        const hostPlatform = state.platforms.find(p =>
            c.x >= p.x &&
            c.x <= (p.x + p.w) &&
            c.y <= (p.y + 8)
        );

        if (!hostPlatform) return true;

        const key = `${hostPlatform.x}|${hostPlatform.y}|${hostPlatform.w}`;
        if (platformCoinKeys.has(key)) return false;
        platformCoinKeys.add(key);
        return true;
    });
}
