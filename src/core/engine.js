/*
 * Motor principal do jogo. Responsável por inicializar o estado,
 * atualizar a lógica a cada quadro, desenhar tudo na tela e tratar
 * transições como início da corrida e game over. A lógica espelha
 * exatamente o protótipo original, apenas reorganizada em funções e
 * módulos separados.
 */

import state from './state.js';
import { BALANCE, BOOST_TYPES, DAY_NIGHT_CYCLE_SECONDS, DIFFICULTY_MODES, VIRTUAL_HEIGHT, VIRTUAL_WIDTH } from '../config.js';
import { getBoostSprite } from './boostSprites.js';
import { storage, save } from './storage.js';
import { tryStartAudio, stopAudio, SFX } from './audio.js';
import Player from '../entities/player.js';
import * as worldgen from '../systems/worldgen.js';
import * as background from '../systems/background.js';
import { updateUI, toggleShop } from '../systems/ui.js';

function getViewMetrics() {
    const viewW = state.view?.worldWidth || VIRTUAL_WIDTH;
    const viewH = state.view?.worldHeight || VIRTUAL_HEIGHT;

    return {
        viewW,
        viewH,
        extraW: Math.max(0, viewW - VIRTUAL_WIDTH),
        extraH: Math.max(0, viewH - VIRTUAL_HEIGHT)
    };
}

function getDifficultyMode() {
    return DIFFICULTY_MODES[state.game.modeId] || DIFFICULTY_MODES.medium;
}

function updateActiveBoost() {
    const activeBoost = state.activeBoost;
    if (!activeBoost) {
        state.game.timeScale = 1;
        return;
    }

    activeBoost.duration--;
    state.game.timeScale = activeBoost.id === 'slow' ? 0.58 : 1;

    if (activeBoost.duration <= 0) {
        state.activeBoost = null;
        state.game.timeScale = 1;
        if (state.player) {
            state.player.boostAirDashCharges = 0;
        }
    }
}

function updateVirusWall(viewH) {
    const virus = state.virusWall;
    const mode = getDifficultyMode();

    if (!state.game.started || !mode.virusPressure) {
        virus.active = false;
        virus.x = state.camera.x - 420;
        virus.damageTick = 0;
        return;
    }

    const player = state.player;
    virus.active = true;
    virus.pulse += 0.12;
    const pressureSpeed = 4.4 + Math.min(5.2, state.game.dist / 1400);
    const screenTarget = state.camera.x + 36;
    const chaseTarget = player.x - 225;
    virus.x = Math.min(chaseTarget, Math.max(screenTarget, virus.x + pressureSpeed));

    if (virus.damageTick > 0) virus.damageTick--;

    if (player.x + player.w < virus.x + 18) {
        player.takeDamage(100);
        return;
    }

    if (player.x < virus.x + 120) {
        if (virus.damageTick <= 0) {
            player.takeDamage(18);
            virus.damageTick = 14;
        }
        player.vx = Math.max(player.vx, 10 + (state.game.difficulty * 0.55));
        state.camera.shake = Math.max(state.camera.shake, 6);
        if (state.game.frames % 5 === 0) {
            state.particles.push({
                x: virus.x + 18 + Math.random() * 18,
                y: state.camera.y + Math.random() * (viewH + 120),
                vx: 1.5 + Math.random() * 2.5,
                vy: (Math.random() - 0.5) * 1.3,
                size: 1.8 + Math.random() * 2,
                life: 14,
                color: Math.random() > 0.5 ? '#ff547d' : '#89f7ff',
                alpha: 0.72
            });
        }
    }
}

function drawBoostPickup(ctx, boost) {
    const boostDef = BOOST_TYPES[boost.id];
    if (!boostDef) return;

    const bob = Math.sin(boost.bob) * 4;
    const squash = Math.max(0.22, Math.abs(Math.cos(boost.rot)));
    const sprite = getBoostSprite(boost.id);

    ctx.save();
    ctx.translate(boost.x, boost.y + bob);
    ctx.scale(squash, 1);

    const halo = ctx.createRadialGradient(0, 0, 0, 0, 0, 18);
    halo.addColorStop(0, `${boostDef.accent}ee`);
    halo.addColorStop(0.55, `${boostDef.color}cc`);
    halo.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = halo;
    ctx.shadowBlur = 22;
    ctx.shadowColor = boostDef.color;
    ctx.beginPath();
    ctx.arc(0, 0, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.fillStyle = 'rgba(4, 10, 26, 0.96)';
    ctx.fillRect(-13, -13, 26, 26);

    ctx.lineWidth = 1.2;
    ctx.strokeStyle = `${boostDef.accent}aa`;
    ctx.strokeRect(-13, -13, 26, 26);

    if (sprite?.loaded) {
        ctx.drawImage(sprite.img, -10, -10, 20, 20);
    } else {
        ctx.fillStyle = boostDef.accent;
        ctx.beginPath();
        ctx.arc(0, 0, 6, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.restore();
}

function drawVirusWall(ctx, viewH) {
    const virus = state.virusWall;
    if (!virus.active) return;

    const topY = state.camera.y - 180;
    const wallH = viewH + 420;
    const frontX = virus.x;
    const pulse = 0.55 + Math.sin(virus.pulse) * 0.25;

    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.56)';
    ctx.fillRect(frontX - 1600, topY, 1600, wallH);

    const field = ctx.createLinearGradient(frontX - 230, 0, frontX + 36, 0);
    field.addColorStop(0, 'rgba(0, 0, 0, 0)');
    field.addColorStop(0.24, 'rgba(34, 0, 18, 0.42)');
    field.addColorStop(0.74, `rgba(255, 66, 122, ${0.28 + pulse * 0.16})`);
    field.addColorStop(1, `rgba(150, 255, 241, ${0.26 + pulse * 0.1})`);
    ctx.fillStyle = field;
    ctx.fillRect(frontX - 230, topY, 266, wallH);

    for (let i = 0; i < 22; i++) {
        const stripW = 6 + Math.random() * 12;
        const stripX = frontX - 24 + Math.random() * 30;
        const stripY = topY + Math.random() * wallH;
        const stripH = 24 + Math.random() * 120;
        ctx.fillStyle = i % 2 === 0
            ? `rgba(255, 80, 138, ${0.18 + Math.random() * 0.2})`
            : `rgba(118, 241, 255, ${0.12 + Math.random() * 0.14})`;
        ctx.fillRect(stripX, stripY, stripW, stripH);
    }

    ctx.strokeStyle = `rgba(255, 214, 234, ${0.32 + pulse * 0.2})`;
    ctx.lineWidth = 2.4;
    ctx.shadowBlur = 24;
    ctx.shadowColor = 'rgba(255, 88, 132, 0.7)';
    ctx.beginPath();
    ctx.moveTo(frontX, topY);
    ctx.lineTo(frontX, topY + wallH);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.restore();
}

// Inicializa o jogo: instancia player, reseta listas e preenche
// camadas de fundo, estrelas, poeira e atmosfera. Também associa
// callbacks de controle ao estado.
export function initGame() {
    state.player = new Player();
    // reseta parâmetros de geração procedural
    worldgen.resetWorldParams();
    state.platforms = [{ x: -200, y: 400, w: 1000, h: 50, colorHue: 180, spikeInfo: null }];
    state.enemies = [];
    state.coins = [];
    state.boosts = [];
    state.particles = [];
    state.texts = [];
    state.ghosts = [];
    state.attackEffects = [];
    state.activeBoost = null;
    state.dustParticles = [];
    state.bgLayer1 = [];
    state.bgLayer2 = [];
    state.bgLayer3 = [];
    // cria prédios em três camadas com diferentes paralaxes
    for (let i = 0; i < 20; i++) state.bgLayer1.push(worldgen.createBuilding(i, 0.05, 100, 300, 90, 180, 0.2));
    for (let i = 0; i < 20; i++) state.bgLayer2.push(worldgen.createBuilding(i, 0.2, 190, 400, 115, 230, 0.4));
    for (let i = 0; i < 20; i++) state.bgLayer3.push(worldgen.createBuilding(i, 0.5, 260, 500, 140, 290, 0.56));
    // poeira inicial
    for (let i = 0; i < 18; i++) worldgen.spawnDust(true);
    // estrelas
    state.stars = [];
    for (let i = 0; i < 64; i++) {
        state.stars.push({ x: Math.random() * 900, y: Math.random() * 400, size: Math.random() * 2, blink: Math.random() });
    }
    // atmosfera (chuva)
    worldgen.initAtmosphere();
    // reseta contadores de jogo
    state.game.dist = 0;
    state.game.difficulty = BALANCE.difficulty.base;
    state.game.modeId = DIFFICULTY_MODES[storage.difficultyMode] ? storage.difficultyMode : 'medium';
    state.game.running = true;
    state.game.started = false;
    state.game.shopOpen = false;
    state.game.isGameOver = false;
    state.game.time = 0;
    state.game.timeScale = 1;
    state.game.simAccumulator = 0;
    state.game.frames = 0;
    state.game.runFrames = 0;
    state.game.coins = 0;
    state.game.audioStarted = false;
    state.game.newRecordReached = false;
    state.game.rafId = null;
    state.camera.x = 0;
    state.camera.y = 0;
    state.camera.shake = 0;
    state.virusWall.active = false;
    state.virusWall.x = -900;
    state.virusWall.pulse = 0;
    state.virusWall.damageTick = 0;
    state.performance.lastTs = 0;
    state.performance.avgFrameMs = 16.67;
    state.performance.quality = 0.66;
    state.performance.warmupFrames = 300;
    storage.initialHighScore = storage.highScore;
    // oculta overlay e loja, mostra dica inicial
    state.overlay.style.display = 'none';
    state.overlayTitle.style.color = '#ff3355';
    state.overlayTitle.style.textShadow = '0 0 20px #ff3355';
    state.overlayTitle.innerText = 'SISTEMA CRITICO';
    state.overlayMsg.innerText = 'CONEXAO PERDIDA';
    state.shopModal.style.display = 'none';
    state.startHint.style.display = 'block';
    // associa callbacks para uso em outras partes do jogo
    state.startGameRun = startGameRun;
    state.gameOver = gameOver;
    // atualiza a HUD com valores iniciais
    updateUI();
}

/**
 * Marca o início da corrida: oculta a dica, inicia áudio e fecha a loja
 * se estiver aberta.
 */
function startGameRun() {
    state.game.started = true;
    // reinicia o contador de frames de corrida para que o ciclo
    // dia/noite comece do início quando uma nova corrida começa
    state.game.runFrames = 0;
    state.virusWall.x = state.player.x - 300;
    state.virusWall.active = getDifficultyMode().virusPressure;
    if (state.startHint) state.startHint.style.display = 'none';
    tryStartAudio();
    if (state.game.shopOpen) toggleShop();
}

/**
 * Atualiza a lógica do jogo e retorna offsets de tremor da câmera.
 * Corresponde ao conteúdo da função update() do protótipo.
 * @returns {{sx:number, sy:number}} Valores de deslocamento da câmera
 */
function updateGame() {
    const quality = state.performance.quality || 1;
    const { viewW, viewH, extraW, extraH } = getViewMetrics();
    updateActiveBoost();
    // Ajuste de dificuldade de acordo com a distância. Os parâmetros
    // vivem em BALANCE.difficulty para evitar números mágicos.
    state.game.difficulty = BALANCE.difficulty.base +
        Math.floor(state.game.dist / BALANCE.difficulty.distInterval) * BALANCE.difficulty.increment;
    // Ciclo dia/noite baseado no tempo corrido. O contador runFrames
    // só incrementa quando a corrida está ativa. Converte para
    // segundos dividindo por 60 e usa o valor configurado em
    // DAY_NIGHT_CYCLE_SECONDS para definir o ciclo.
    const runSeconds = state.game.runFrames / 60;
    let cycle = (runSeconds % DAY_NIGHT_CYCLE_SECONDS) / DAY_NIGHT_CYCLE_SECONDS;
    state.game.time = cycle;
    // Atualiza jogador
    state.player.update();
    // Geração de mundo e atualização de câmera
    if (state.game.started) {
        worldgen.generateWorld();
        state.camera.x += (state.player.x - (300 + (extraW * 0.22)) - state.camera.x) * 0.08;
    } else {
        state.camera.x += (state.player.x - (300 + (extraW * 0.22)) - state.camera.x) * 0.02;
    }
    let targetCamY = state.player.y - (320 + (extraH * 0.52));
    state.camera.y += (targetCamY - state.camera.y) * 0.06;
    if (state.camera.y < (-120 - (extraH * 0.35))) state.camera.y = -120 - (extraH * 0.35);
    if (state.camera.y > (150 + (extraH * 0.55))) state.camera.y = 150 + (extraH * 0.55);
    updateVirusWall(viewH);
    // Tremor de câmera
    let sx = 0;
    let sy = 0;
    if (state.camera.shake > 0) {
        sx = (Math.random() - 0.5) * state.camera.shake;
        sy = (Math.random() - 0.5) * state.camera.shake;
        state.camera.shake *= 0.9;
        if (state.camera.shake < 1) state.camera.shake = 0;
    }
    // Atualiza inimigos
    state.enemies.forEach(e => e.update());
    // Atualiza partículas (inclui trail, ondas e partículas normais)
    for (let i = state.particles.length - 1; i >= 0; i--) {
        let p = state.particles[i];
        if (p.trail) {
            p.x += (p.dir || 1) * 1.2;
            p.life--;
            p.alpha *= 0.88;
            if (p.life <= 0 || p.alpha <= 0.02) state.particles.splice(i, 1);
            continue;
        }
        p.x += p.vx;
        p.y += p.vy;
        if (p.drag) {
            p.vx *= p.drag;
            p.vy *= p.drag;
        }
        p.life--;
        p.alpha -= 0.03;
        if (p.isWave) {
            p.radius += 5;
            p.life -= 2;
        } else if (p.size) {
            p.size *= 0.986;
        }
        if (p.life <= 0) state.particles.splice(i, 1);
    }
    // Atualiza textos flutuantes
    for (let i = state.texts.length - 1; i >= 0; i--) {
        let t = state.texts[i];
        t.y -= 1;
        t.life--;
        if (t.life <= 0) state.texts.splice(i, 1);
    }
    // Atualiza efeitos curtos de ataque em uma lista dedicada para
    // garantir que o frame visual seja desenhado no passo de render.
    for (let i = state.attackEffects.length - 1; i >= 0; i--) {
        const effect = state.attackEffects[i];
        effect.life--;
        effect.alpha *= effect.fade || 0.78;
        effect.radius += effect.growth || 2.5;
        if (effect.spin) effect.angle += effect.spin;

        if (effect.life <= 0 || effect.alpha <= 0.03) {
            state.attackEffects.splice(i, 1);
        }
    }
    // Move poeira; repondo quando sai da tela
    state.dustParticles.forEach((d, idx) => {
        d.x += d.vx;
        if (d.x < -10) {
            state.dustParticles.splice(idx, 1);
            worldgen.spawnDust(false);
        }
    });
    // Atualiza chuva: alternância ativa/inativa e movimentação
    if (!state.game.started) {
        if (state.rainDrops.length) state.rainDrops.length = 0;
        if (state.rainSplashes.length) state.rainSplashes.length = 0;
        state.rainState.active = false;
        if (state.rainState.timer <= 0) worldgen.resetRainTimer();
    } else {
        if (state.rainState.timer > 0) state.rainState.timer--;
        if (state.rainState.timer <= 0) {
            state.rainState.active = !state.rainState.active;
            worldgen.resetRainTimer();
        }
        const rainCount = state.rainState.active ? Math.floor(86 + quality * 64) : 0;
        if (state.rainState.active) {
            const needed = rainCount - state.rainDrops.length;
            const burst = Math.max(3, Math.floor(6 + quality * 5));
            const spawnNow = Math.min(Math.max(0, needed), burst);
            for (let i = 0; i < spawnNow; i++) worldgen.spawnRainDrop(false);
        }
        for (let i = state.rainDrops.length - 1; i >= 0; i--) {
            const r = state.rainDrops[i];
            r.x -= 0.8;
            r.y += r.speed;
            if (r.y > viewH) {
                if (state.rainState.active) worldgen.spawnRainSplash(r.x, (viewH - 10) + Math.random() * 6);
                state.rainDrops.splice(i, 1);
                if (state.rainState.active && state.rainDrops.length < rainCount) worldgen.spawnRainDrop(false);
            }
        }
        for (let i = state.rainSplashes.length - 1; i >= 0; i--) {
            const s = state.rainSplashes[i];
            s.life--;
            if (s.life <= 0) state.rainSplashes.splice(i, 1);
        }
    }
    // Piscadas de prédios
    const shouldUpdateBuildingFlash = state.game.started || (state.game.frames % 3 === 0);
    if (shouldUpdateBuildingFlash) {
        [state.bgLayer1, state.bgLayer2, state.bgLayer3].forEach(layer => {
            layer.forEach(b => {
                if (Math.random() < 0.008) b.flashTimer = 10;
                if (b.flashTimer > 0) b.flashTimer--;
            });
        });
    }
    // Rotaciona moedas
    state.coins.forEach(c => {
        c.rot += 0.1;
    });
    state.boosts.forEach(boost => {
        boost.rot += 0.1;
        boost.bob += 0.08;
    });
    // Atualiza a HUD
    updateUI();
    return { sx, sy };
}

/**
 * Desenha todo o conteúdo da tela. Executa as rotinas de fundo,
 * chuva, mundo e UI, respeitando os deslocamentos de tremor.
 * @param {{sx:number, sy:number}} shake Valores de deslocamento
 */
function drawGame({ sx, sy }) {
    const ctx = state.ctx;
    const quality = state.performance?.quality || 1;
    const { viewH } = getViewMetrics();
    // Aplica transformação para corrigir resolução em telas de alta
    // densidade. O escalonamento da cena em si é feito via CSS no
    // contêiner; aqui multiplicamos apenas pelo devicePixelRatio.
    const dpr = state.view?.dpr || 1;
    const renderScale = state.view?.scale || 1;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#02040a';
    ctx.fillRect(0, 0, state.canvas.width, state.canvas.height);
    ctx.setTransform(dpr * renderScale, 0, 0, dpr * renderScale, 0, 0);
    // fundo (céu, sol/lua, estrelas, grade)
    background.drawBackground();
    // camadas de prédios
    background.drawLayer(state.bgLayer1, state.camera.x);
    background.drawLayer(state.bgLayer2, state.camera.x);
    background.drawLayer(state.bgLayer3, state.camera.x);
    // chuva
    background.drawRainBackground();
    // poeira em camada de tela
    state.dustParticles.forEach(d => {
        if (d.y < (viewH * (320 / VIRTUAL_HEIGHT))) return;
        const r = 0.9 + (d.size * 1.6);
        const haze = ctx.createRadialGradient(d.x, d.y, 0, d.x, d.y, r * 2.4);
        haze.addColorStop(0, `rgba(198, 234, 255, ${d.alpha * 0.42})`);
        haze.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = haze;
        ctx.beginPath();
        ctx.arc(d.x, d.y, r * 2.4, 0, Math.PI * 2);
        ctx.fill();
    });
    // mundo (plataformas, moedas, inimigos, player, partículas, textos)
    ctx.save();
    ctx.translate(-state.camera.x + sx, -state.camera.y + sy);
    // plataformas
    const platformDetailStep = quality < 0.74 ? 56 : (quality < 0.9 ? 40 : 28);
    state.platforms.forEach(p => {
        const hue = (p.colorHue + state.game.frames) % 360;
        const neonColor = `hsl(${hue}, 100%, 58%)`;
        const pulse = 0.45 + (Math.sin((state.game.frames * 0.05) + (p.x * 0.02)) * 0.2);

        const bodyGrad = ctx.createLinearGradient(p.x, p.y, p.x, p.y + p.h);
        bodyGrad.addColorStop(0, '#070d1c');
        bodyGrad.addColorStop(0.45, '#050811');
        bodyGrad.addColorStop(1, '#010204');
        ctx.fillStyle = bodyGrad;
        ctx.fillRect(p.x, p.y, p.w, p.h);

        // LED principal: sempre aceso, independente do modo de performance.
        const ledAlpha = 0.86 + (Math.sin((state.game.frames * 0.08) + (p.x * 0.03)) * 0.08);
        const ledStrip = ctx.createLinearGradient(p.x, p.y - 1, p.x, p.y + 8);
        ledStrip.addColorStop(0, `hsla(${hue}, 100%, 78%, ${ledAlpha})`);
        ledStrip.addColorStop(0.4, `hsla(${hue}, 100%, 67%, ${Math.max(0.62, ledAlpha - 0.12)})`);
        ledStrip.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = ledStrip;
        ctx.fillRect(p.x, p.y - 1, p.w, 9);

        ctx.strokeStyle = `hsla(${hue}, 100%, 62%, 0.94)`;
        ctx.lineWidth = 1.9;
        ctx.shadowBlur = 18;
        ctx.shadowColor = `hsla(${hue}, 100%, 62%, 0.72)`;
        ctx.strokeRect(p.x, p.y, p.w, p.h);
        ctx.shadowBlur = 0;

        if (quality >= 0.78) {
            ctx.beginPath();
            ctx.strokeStyle = `hsla(${hue}, 100%, 66%, 0.18)`;
            ctx.lineWidth = 1;
            for (let gx = 0; gx < p.w; gx += platformDetailStep) {
                ctx.moveTo(p.x + gx, p.y + 2);
                ctx.lineTo(p.x + gx + (platformDetailStep * 0.5), p.y + p.h - 2);
            }
            ctx.stroke();
        }

        if (quality >= 0.84) {
            const capGrad = ctx.createLinearGradient(p.x, p.y, p.x, p.y + p.h);
            capGrad.addColorStop(0, 'rgba(255, 255, 255, 0.1)');
            capGrad.addColorStop(0.55, 'rgba(255, 255, 255, 0.02)');
            capGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = capGrad;
            ctx.fillRect(p.x, p.y, p.w, p.h);
        }

        ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
        ctx.fillRect(p.x, p.y + p.h - 4, p.w, 4);

        // reflexo molhado
        if (quality >= 0.8) {
            let refl = ctx.createLinearGradient(p.x, p.y + p.h, p.x, p.y + p.h + 28);
            refl.addColorStop(0, `hsla(${hue}, 100%, 58%, 0.22)`);
            refl.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = refl;
            ctx.fillRect(p.x, p.y + p.h, p.w, 28);
        }
        if (p.spikeInfo) {
            let sg = ctx.createLinearGradient(p.spikeInfo.x, p.y - 14, p.spikeInfo.x, p.y + 4);
            sg.addColorStop(0, '#ff7b9f');
            sg.addColorStop(1, '#ff1b3d');
            ctx.fillStyle = sg;
            ctx.shadowBlur = 18;
            ctx.shadowColor = '#ff4a6a';
            let start = p.spikeInfo.x;
            let end = p.spikeInfo.x + p.spikeInfo.w;
            for (let sx2 = start; sx2 < end; sx2 += 15) {
                let spikeH = 12 + Math.sin(state.game.frames * 0.3 + sx2) * 3;
                ctx.beginPath();
                ctx.moveTo(sx2, p.y);
                ctx.lineTo(sx2 + 7, p.y - spikeH);
                ctx.lineTo(sx2 + 14, p.y);
                ctx.fill();
            }
        }
        ctx.shadowBlur = 0;
    });
    // moedas
    state.coins.forEach(c => {
        ctx.save();
        ctx.translate(c.x, c.y);
        let scaleX = Math.cos(c.rot);
        ctx.scale(scaleX, 1);
        let grad = ctx.createRadialGradient(-1, -1, 2, 0, 0, 11);
        grad.addColorStop(0, '#fff9d8');
        grad.addColorStop(0.5, '#ffd95f');
        grad.addColorStop(1, '#f0a500');
        ctx.fillStyle = grad;
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#ffb347';
        ctx.beginPath();
        ctx.arc(0, 0, 9.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.lineWidth = 1.4;
        ctx.strokeStyle = 'rgba(255, 249, 220, 0.72)';
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(0, 0, 5.4, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(120, 70, 20, 0.4)';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.fillRect(-3.5, -4.8, 7, 1.8);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
        ctx.fillRect(-2, -2.2, 4, 0.9);
        ctx.restore();
    });
    state.boosts.forEach(boost => {
        drawBoostPickup(ctx, boost);
    });
    drawVirusWall(ctx, viewH);
    // inimigos e jogador
    state.enemies.forEach(e => e.draw());
    state.player.draw();
    state.attackEffects.forEach(effect => {
        ctx.save();
        if (effect.kind === 'slash') {
            const arc = effect.arc || (Math.PI * 0.9);
            const angle = effect.angle || 0;
            ctx.globalAlpha = effect.alpha;
            ctx.strokeStyle = effect.color;
            ctx.lineWidth = 4.6;
            ctx.shadowBlur = 20;
            ctx.shadowColor = effect.color;
            ctx.beginPath();
            ctx.arc(effect.x, effect.y, effect.radius, angle - arc * 0.5, angle + arc * 0.5);
            ctx.stroke();

            ctx.globalAlpha = effect.alpha * 0.55;
            ctx.lineWidth = 2.1;
            ctx.beginPath();
            ctx.arc(effect.x, effect.y, effect.radius * 0.72, angle - arc * 0.45, angle + arc * 0.45);
            ctx.stroke();
            ctx.shadowBlur = 0;
        } else if (effect.kind === 'impact' || effect.kind === 'dashBurst') {
            const burstColor = effect.color || '#ffffff';
            const core = ctx.createRadialGradient(effect.x, effect.y, 0, effect.x, effect.y, effect.radius * 1.8);
            core.addColorStop(0, `rgba(255,255,255,${effect.alpha * 0.95})`);
            core.addColorStop(0.45, burstColor);
            core.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.globalAlpha = effect.alpha;
            ctx.fillStyle = core;
            ctx.beginPath();
            ctx.arc(effect.x, effect.y, effect.radius * 1.8, 0, Math.PI * 2);
            ctx.fill();
        } else {
            ctx.globalAlpha = effect.alpha;
            ctx.strokeStyle = effect.color;
            ctx.lineWidth = 3.2;
            ctx.shadowBlur = 18;
            ctx.shadowColor = effect.color;
            ctx.beginPath();
            ctx.arc(effect.x, effect.y, effect.radius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.globalAlpha = effect.alpha * 0.58;
            ctx.lineWidth = 1.6;
            ctx.beginPath();
            ctx.arc(effect.x, effect.y, effect.radius * 0.72, 0, Math.PI * 2);
            ctx.stroke();
            ctx.fillStyle = `rgba(255, 255, 255, ${effect.alpha * 0.22})`;
            ctx.beginPath();
            ctx.arc(effect.x, effect.y, 8 + effect.alpha * 6, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    });
    // partículas
    state.particles.forEach(p => {
        if (p.trail) {
            const dir = p.dir || 1;
            const span = p.w * dir;
            const startX = span >= 0 ? p.x : p.x + span;
            const width = Math.abs(span);
            let g = ctx.createLinearGradient(p.x, p.y, p.x + span, p.y);
            g.addColorStop(0, p.color);
            g.addColorStop(1, 'rgba(255,255,255,0)');
            ctx.globalAlpha = p.alpha || 1;
            ctx.fillStyle = g;
            ctx.shadowBlur = 16;
            ctx.shadowColor = p.color;
            ctx.fillRect(startX, p.y, width, p.h);
            ctx.globalAlpha = (p.alpha || 1) * 0.5;
            ctx.fillStyle = 'rgba(255,255,255,0.55)';
            ctx.fillRect(startX, p.y + (p.h * 0.42), width, Math.max(1, p.h * 0.08));
            ctx.shadowBlur = 0;
            ctx.globalAlpha = 1;
        } else if (p.isWave) {
            ctx.strokeStyle = p.color;
            ctx.lineWidth = p.lineWidth || 3;
            ctx.globalAlpha = p.life / 20;
            ctx.shadowBlur = 16;
            ctx.shadowColor = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.shadowBlur = 0;
            ctx.globalAlpha = 1;
        } else {
            const alpha = p.alpha || 1;
            const radius = Math.max(0.6, p.size || (2 + Math.abs(p.vx) * 0.3));
            const spark = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, radius * 2.4);
            spark.addColorStop(0, `rgba(255,255,255,${alpha * 0.9})`);
            spark.addColorStop(0.45, p.color);
            spark.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.globalAlpha = alpha;
            ctx.fillStyle = spark;
            ctx.beginPath();
            ctx.arc(p.x, p.y, radius * 2.4, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
        }
    });
    // textos flutuantes
    state.texts.forEach(t => {
        ctx.fillStyle = t.color;
        ctx.font = 'bold 16px Courier New';
        ctx.fillText(t.txt, t.x, t.y);
    });
    ctx.restore();
    if (state.game.started && quality >= 0.82) {
        drawScreenPostFX();
    }
}

function drawScreenPostFX() {
    const ctx = state.ctx;
    const { viewW, viewH } = getViewMetrics();
    const speed = state.player ? Math.abs(state.player.vx) : 0;
    const speedNorm = Math.min(speed / 18, 1);
    const motionEffect = Math.max(0, speedNorm - 0.52) / 0.48;
    const pulse = 0.55 + Math.sin(state.game.frames * 0.04) * 0.18;
    const hotEffect = state.attackEffects.find(effect => effect.kind === 'impact' || effect.kind === 'dashBurst');
    const hotAlpha = hotEffect ? hotEffect.alpha || 0 : 0;

    ctx.save();
    if (hotAlpha > 0.05 || motionEffect > 0.08) {
        ctx.globalCompositeOperation = 'screen';
        const centerGlow = ctx.createRadialGradient(
            viewW * 0.5,
            viewH * 0.5,
            Math.min(viewW, viewH) * 0.22,
            viewW * 0.5,
            viewH * 0.5,
            Math.max(viewW, viewH) * 0.64
        );
        centerGlow.addColorStop(0, `rgba(92, 222, 255, ${0.018 + (motionEffect * 0.02) + (hotAlpha * 0.08)})`);
        centerGlow.addColorStop(0.58, `rgba(255, 110, 176, ${0.01 + (hotAlpha * 0.05)})`);
        centerGlow.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = centerGlow;
        ctx.fillRect(0, 0, viewW, viewH);
    }

    ctx.globalCompositeOperation = 'source-over';
    const edge = ctx.createRadialGradient(
        viewW * 0.5,
        viewH * 0.56,
        Math.min(viewW, viewH) * 0.34,
        viewW * 0.5,
        viewH * 0.56,
        Math.max(viewW, viewH) * 0.7
    );
    edge.addColorStop(0, 'rgba(0,0,0,0)');
    edge.addColorStop(1, `rgba(6, 4, 18, ${0.35 + motionEffect * 0.06})`);
    ctx.fillStyle = edge;
    ctx.fillRect(0, 0, viewW, viewH);

    if (state.player && state.player.invul > 0) {
        const blink = (Math.sin(state.game.frames * 0.45) * 0.5) + 0.5;
        ctx.fillStyle = `rgba(255, 75, 118, ${blink * 0.12})`;
        ctx.fillRect(0, 0, viewW, viewH);
    }

    if (hotEffect) {
        ctx.globalCompositeOperation = 'screen';
        const actionGlow = ctx.createRadialGradient(
            hotEffect.x - state.camera.x,
            hotEffect.y - state.camera.y,
            0,
            hotEffect.x - state.camera.x,
            hotEffect.y - state.camera.y,
            180
        );
        actionGlow.addColorStop(0, `rgba(255, 245, 214, ${hotEffect.alpha * 0.18})`);
        actionGlow.addColorStop(0.45, `rgba(255, 150, 96, ${hotEffect.alpha * 0.12})`);
        actionGlow.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = actionGlow;
        ctx.fillRect(0, 0, viewW, viewH);
        ctx.globalCompositeOperation = 'source-over';
    }

    // Very subtle edge accent only at higher speed.
    ctx.globalAlpha = 0.07 + motionEffect * 0.05;
    ctx.fillStyle = `rgba(88, 215, 255, ${0.24 + pulse * 0.1})`;
    ctx.fillRect(0, 0, 3, viewH);
    ctx.fillStyle = 'rgba(255, 103, 163, 0.28)';
    ctx.fillRect(viewW - 3, 0, 3, viewH);
    ctx.globalAlpha = 1;
    ctx.restore();
}

/**
 * Laço principal do jogo. Incrementa o contador de frames, chama update
 * e draw, e agenda o próximo quadro via requestAnimationFrame.
 */
export function loopGame(ts = performance.now()) {
    if (!state.game.running) return;
    const perf = state.performance;
    if (!perf.lastTs) perf.lastTs = ts;
    let frameMs = ts - perf.lastTs;
    perf.lastTs = ts;
    if (!Number.isFinite(frameMs) || frameMs <= 0) frameMs = 16.67;
    frameMs = Math.min(frameMs, 50);
    perf.avgFrameMs = (perf.avgFrameMs * 0.9) + (frameMs * 0.1);

    // Ajuste dinâmico para suavizar início e manter estabilidade.
    if (perf.warmupFrames > 0) {
        perf.warmupFrames--;
        const warmupTarget = perf.warmupFrames > 180 ? 0.66 : (perf.warmupFrames > 80 ? 0.76 : 0.88);
        perf.quality += (warmupTarget - perf.quality) * 0.08;
    } else {
        let targetQuality = 1;
        if (perf.avgFrameMs > 23) targetQuality = 0.66;
        else if (perf.avgFrameMs > 20) targetQuality = 0.76;
        else if (perf.avgFrameMs > 17.7) targetQuality = 0.88;
        perf.quality += (targetQuality - perf.quality) * 0.05;
    }
    if (perf.quality < 0.62) perf.quality = 0.62;
    if (perf.quality > 1) perf.quality = 1;
    // contador de quadros global para animações e efeitos
    state.game.frames++;
    // incrementa frames de corrida apenas quando a corrida está ativa
    // (jogo iniciado, não em game over e loja fechada)
    if (state.game.started && state.game.running && !state.game.isGameOver && !state.game.shopOpen) {
        state.game.runFrames++;
    }
    const timeScale = Math.max(0.35, Math.min(state.game.timeScale || 1, 1));
    state.game.simAccumulator += timeScale;
    let shake = { sx: 0, sy: 0 };
    while (state.game.simAccumulator >= 1) {
        shake = updateGame();
        state.game.simAccumulator -= 1;
    }
    drawGame(shake);
    if (state.game.running) {
        state.game.rafId = requestAnimationFrame(loopGame);
    } else {
        state.game.rafId = null;
    }
}

/**
 * Finaliza o jogo, exibindo a tela de game over e salvando recordes.
 */
function gameOver() {
    state.game.running = false;
    state.game.isGameOver = true;
    if (state.game.rafId) {
        cancelAnimationFrame(state.game.rafId);
        state.game.rafId = null;
    }
    stopAudio();
    SFX.gameover();
    let isNewRecord = false;
    if (state.game.dist > storage.initialHighScore) {
        isNewRecord = true;
        storage.highScore = Math.floor(state.game.dist);
        save();
    }
    if (isNewRecord) {
        state.overlayTitle.innerText = 'NOVO RECORDE';
        state.overlayTitle.style.color = '#ffd700';
        state.overlayTitle.style.textShadow = '0 0 20px #ffaa00';
    } else {
        state.overlayTitle.innerText = 'SISTEMA CRÍTICO';
        state.overlayTitle.style.color = '#ff3355';
        state.overlayTitle.style.textShadow = '0 0 20px #ff3355';
    }
    state.overlay.style.display = 'block';
    if (state.overlayMsg) {
        state.overlayMsg.innerText = `Distância: ${Math.floor(state.game.dist / 10)}m | Recorde: ${Math.floor(storage.highScore / 10)}m`;
    }
}

/**
 * Reinicia a página, efetivamente resetando o jogo. Esta função é
 * associada globalmente para permitir uso via atributo onclick.
 */
export function resetGame() {
    if (state.game.rafId) {
        cancelAnimationFrame(state.game.rafId);
        state.game.rafId = null;
    }

    stopAudio();
    state.keys = {};
    state.cheatFlight = false;
    initGame();
    loopGame();
}
