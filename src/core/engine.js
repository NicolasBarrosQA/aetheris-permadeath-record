/*
 * Motor principal do jogo. Responsável por inicializar o estado,
 * atualizar a lógica a cada quadro, desenhar tudo na tela e tratar
 * transições como início da corrida e game over. A lógica espelha
 * exatamente o protótipo original, apenas reorganizada em funções e
 * módulos separados.
 */

import state from './state.js';
import { BALANCE, DAY_NIGHT_CYCLE_SECONDS } from '../config.js';
import { storage, save } from './storage.js';
import { tryStartAudio, stopAudio, SFX } from './audio.js';
import Player from '../entities/player.js';
import * as worldgen from '../systems/worldgen.js';
import * as background from '../systems/background.js';
import { updateUI, toggleShop } from '../systems/ui.js';

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
    state.particles = [];
    state.texts = [];
    state.ghosts = [];
    state.attackEffects = [];
    state.dustParticles = [];
    state.bgLayer1 = [];
    state.bgLayer2 = [];
    state.bgLayer3 = [];
    // cria prédios em três camadas com diferentes paralaxes
    for (let i = 0; i < 20; i++) state.bgLayer1.push(worldgen.createBuilding(i, 0.05, 100, 300, 20, 50, 0.15));
    for (let i = 0; i < 20; i++) state.bgLayer2.push(worldgen.createBuilding(i, 0.2, 200, 400, 30, 80, 0.35));
    for (let i = 0; i < 20; i++) state.bgLayer3.push(worldgen.createBuilding(i, 0.5, 300, 500, 10, 40, 0.5));
    // poeira inicial
    for (let i = 0; i < 40; i++) worldgen.spawnDust(true);
    // estrelas
    state.stars = [];
    for (let i = 0; i < 100; i++) {
        state.stars.push({ x: Math.random() * 900, y: Math.random() * 400, size: Math.random() * 2, blink: Math.random() });
    }
    // atmosfera (chuva)
    worldgen.initAtmosphere();
    // reseta contadores de jogo
    state.game.dist = 0;
    state.game.difficulty = BALANCE.difficulty.base;
    state.game.running = true;
    state.game.started = false;
    state.game.shopOpen = false;
    state.game.isGameOver = false;
    state.game.time = 0;
    state.game.frames = 0;
    state.game.runFrames = 0;
    state.game.coins = 0;
    state.game.audioStarted = false;
    state.game.newRecordReached = false;
    state.game.rafId = null;
    state.camera.x = 0;
    state.camera.y = 0;
    state.camera.shake = 0;
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
        state.camera.x += (state.player.x - 300 - state.camera.x) * 0.08;
    } else {
        state.camera.x += (state.player.x - 300 - state.camera.x) * 0.02;
    }
    let targetCamY = state.player.y - 320;
    state.camera.y += (targetCamY - state.camera.y) * 0.06;
    if (state.camera.y < -120) state.camera.y = -120;
    if (state.camera.y > 150) state.camera.y = 150;
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
        p.life--;
        p.alpha -= 0.03;
        if (p.isWave) {
            p.radius += 5;
            p.life -= 2;
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
        effect.alpha *= 0.78;
        effect.radius += 2.5;

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
    if (state.rainState.timer > 0) state.rainState.timer--;
    if (state.rainState.timer <= 0) {
        state.rainState.active = !state.rainState.active;
        worldgen.resetRainTimer();
    }
    const rainCount = state.rainState.active ? 220 : 0;
    if (state.rainState.active) {
        while (state.rainDrops.length < rainCount) worldgen.spawnRainDrop(false);
    }
    for (let i = state.rainDrops.length - 1; i >= 0; i--) {
        const r = state.rainDrops[i];
        r.x -= 0.8;
        r.y += r.speed;
        if (r.y > 600) {
            if (state.rainState.active) worldgen.spawnRainSplash(r.x, 590 + Math.random() * 6);
            state.rainDrops.splice(i, 1);
            if (state.rainState.active && state.rainDrops.length < rainCount) worldgen.spawnRainDrop(false);
        }
    }
    for (let i = state.rainSplashes.length - 1; i >= 0; i--) {
        const s = state.rainSplashes[i];
        s.life--;
        if (s.life <= 0) state.rainSplashes.splice(i, 1);
    }
    // Piscadas de prédios
    [state.bgLayer1, state.bgLayer2, state.bgLayer3].forEach(layer => {
        layer.forEach(b => {
            if (Math.random() < 0.01) b.flashTimer = 10;
            if (b.flashTimer > 0) b.flashTimer--;
        });
    });
    // Rotaciona moedas
    state.coins.forEach(c => {
        c.rot += 0.1;
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
    // Aplica transformação para corrigir resolução em telas de alta
    // densidade. O escalonamento da cena em si é feito via CSS no
    // contêiner; aqui multiplicamos apenas pelo devicePixelRatio.
    if (state.view && state.view.dpr) {
        ctx.setTransform(state.view.dpr, 0, 0, state.view.dpr, 0, 0);
    } else {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
    }
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
        ctx.fillStyle = `rgba(255, 255, 255, ${d.alpha})`;
        ctx.fillRect(d.x, d.y, d.size, d.size);
    });
    // mundo (plataformas, moedas, inimigos, player, partículas, textos)
    ctx.save();
    ctx.translate(-state.camera.x + sx, -state.camera.y + sy);
    // plataformas
    state.platforms.forEach(p => {
        ctx.fillStyle = '#050505';
        let hue = (p.colorHue + state.game.frames) % 360;
        let neonColor = `hsl(${hue}, 100%, 50%)`;
        ctx.strokeStyle = neonColor;
        ctx.lineWidth = 2;
        ctx.shadowBlur = 14;
        ctx.shadowColor = neonColor;
        ctx.fillRect(p.x, p.y, p.w, p.h);
        ctx.strokeRect(p.x, p.y, p.w, p.h);
        let capGrad = ctx.createLinearGradient(p.x, p.y, p.x, p.y + p.h);
        capGrad.addColorStop(0, 'rgba(255,255,255,0.08)');
        capGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = capGrad;
        ctx.fillRect(p.x, p.y, p.w, p.h);
        ctx.beginPath();
        ctx.strokeStyle = `hsla(${hue}, 100%, 50%, 0.2)`;
        ctx.lineWidth = 1;
        for (let gx = 0; gx < p.w; gx += 30) {
            ctx.moveTo(p.x + gx, p.y);
            ctx.lineTo(p.x + gx + 15, p.y + p.h);
        }
        ctx.stroke();
        // reflexo molhado
        let refl = ctx.createLinearGradient(p.x, p.y + p.h, p.x, p.y + p.h + 24);
        refl.addColorStop(0, `hsla(${hue}, 100%, 50%, 0.18)`);
        refl.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = refl;
        ctx.fillRect(p.x, p.y + p.h, p.w, 24);
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
        let grad = ctx.createRadialGradient(0, 0, 3, 0, 0, 10);
        grad.addColorStop(0, '#fff7c3');
        grad.addColorStop(1, '#ffd700');
        ctx.fillStyle = grad;
        ctx.shadowBlur = 18;
        ctx.shadowColor = '#ffaa00';
        ctx.beginPath();
        ctx.arc(0, 0, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.lineWidth = 1;
        ctx.strokeStyle = 'rgba(255,255,255,0.6)';
        ctx.stroke();
        ctx.fillStyle = '#fff';
        ctx.fillRect(-2, -5, 4, 10);
        ctx.restore();
    });
    // inimigos e jogador
    state.enemies.forEach(e => e.draw());
    state.player.draw();
    state.attackEffects.forEach(effect => {
        ctx.save();
        ctx.globalAlpha = effect.alpha;
        ctx.strokeStyle = effect.color;
        ctx.lineWidth = 3;
        ctx.shadowBlur = 15;
        ctx.shadowColor = effect.color;
        ctx.beginPath();
        ctx.arc(effect.x, effect.y, effect.radius, 0, Math.PI * 2);
        ctx.stroke();
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
            ctx.shadowBlur = 12;
            ctx.shadowColor = p.color;
            ctx.fillRect(startX, p.y, width, p.h);
            ctx.shadowBlur = 0;
            ctx.globalAlpha = 1;
        } else if (p.isWave) {
            ctx.strokeStyle = p.color;
            ctx.lineWidth = 3;
            ctx.globalAlpha = p.life / 20;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.globalAlpha = 1;
        } else {
            ctx.fillStyle = p.color;
            ctx.globalAlpha = p.alpha || 1;
            let s = p.vx * 2;
            ctx.fillRect(p.x, p.y, 3 + Math.abs(s), 3 + Math.abs(s));
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
}

/**
 * Laço principal do jogo. Incrementa o contador de frames, chama update
 * e draw, e agenda o próximo quadro via requestAnimationFrame.
 */
export function loopGame() {
    if (!state.game.running) return;
    // contador de quadros global para animações e efeitos
    state.game.frames++;
    // incrementa frames de corrida apenas quando a corrida está ativa
    // (jogo iniciado, não em game over e loja fechada)
    if (state.game.started && state.game.running && !state.game.isGameOver && !state.game.shopOpen) {
        state.game.runFrames++;
    }
    const shake = updateGame();
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
