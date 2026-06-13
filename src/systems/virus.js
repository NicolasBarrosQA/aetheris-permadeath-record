import state from '../core/state.js';
import { BALANCE } from '../config.js';
import { getDifficultyMode } from '../core/utils.js';

// Offscreen canvas para o grid de corrupção — o loop nested cols×rows é
// o maior custo do modo difícil (~5.600 fillRect por frame). Renderizamos
// num canvas auxiliar e só o atualizamos a cada GRID_UPDATE_INTERVAL frames.
// A cada frame fazemos apenas 1 drawImage em vez de milhares de fillRect.
let _gridCanvas = null;
let _gridCtx = null;
let _gridLastFrame = -999;
let _gridLastW = 0;
let _gridLastH = 0;
const GRID_UPDATE_INTERVAL = 2; // atualiza a 30fps — imperceptível para ruído granulado

function getGridCanvas(w, h) {
    if (!_gridCanvas || _gridLastW !== w || _gridLastH !== h) {
        _gridCanvas = typeof OffscreenCanvas !== 'undefined'
            ? new OffscreenCanvas(w, h)
            : (() => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; })();
        _gridCtx = _gridCanvas.getContext('2d');
        _gridLastW = w;
        _gridLastH = h;
        _gridLastFrame = -999;
    }
    return { canvas: _gridCanvas, ctx: _gridCtx };
}

function getVirusPressureSpeed(difficulty) {
    const virusBalance = BALANCE.virus;
    const diffOverBase = Math.max(0, difficulty - BALANCE.difficulty.base);
    const normalized = 1 - Math.exp(-diffOverBase * virusBalance.difficultyFalloff);
    return virusBalance.baseSpeed + ((virusBalance.maxSpeed - virusBalance.baseSpeed) * normalized);
}

// Hash determinístico rápido (inteiro, sem Math.sin) — substitui a versão
// anterior baseada em Math.sin que era chamada 500+ vezes por frame.
// Wang hash de 32 bits: colisões mínimas, extremamente barato em CPU.
function fastHash(seed) {
    let h = (seed | 0) ^ 0xdeadbeef;
    h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
    h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
    h = (h ^ (h >>> 16)) >>> 0;
    return (h & 0xffff) / 0xffff;
}

export function updateVirus(viewH) {
    const virus = state.virusWall;
    const mode = getDifficultyMode();
    const virusCfg = BALANCE.virus;

    if (!state.game.started || !mode.virusPressure) {
        virus.active = false;
        virus.x = state.camera.x - virusCfg.idleOffsetBehindCamera;
        virus.damageTick = 0;
        return;
    }

    const player = state.player;
    virus.active = true;
    virus.pulse += 0.12;
    const pressureSpeed = getVirusPressureSpeed(state.game.difficulty);
    virus.x += pressureSpeed;

    if (virus.damageTick > 0) virus.damageTick--;

    for (let i = state.enemies.length - 1; i >= 0; i--) {
        const enemy = state.enemies[i];
        if (enemy.hp > 0 && enemy.x + enemy.w < virus.x + virusCfg.fogReach) {
            enemy.takeDamage(enemy.maxHp * 10, false);
        }
    }

    if (player.x + player.w < virus.x + virusCfg.killDepth) {
        player.takeDamage(100);
        return;
    }

    if (player.x < virus.x + virusCfg.fogReach) {
        if (virus.damageTick <= 0) {
            player.takeDamage(virusCfg.fogDamage);
            virus.damageTick = virusCfg.fogDamageIntervalFrames;
        }
        player.vx = Math.max(player.vx, 10 + (state.game.difficulty * 0.55));
        state.camera.shake = Math.max(state.camera.shake, 6);
        if (state.game.frames % 5 === 0) {
            state.particles.push({
                x: virus.x + virusCfg.killDepth + Math.random() * 18,
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

export function drawVirus(ctx, viewH) {
    const virus = state.virusWall;
    if (!virus.active) return;

    const topY = state.camera.y - 80;
    const wallH = viewH + 160;
    const frontX = virus.x;
    const frames = state.game.frames;
    const pulse = 0.55 + Math.sin(virus.pulse) * 0.25;
    const quality = state.performance?.quality || 1;

    ctx.save();

    const blockSize = 6;

    // --- Vazio escuro atrás da parede ---
    const voidGrad = ctx.createLinearGradient(frontX - 800, 0, frontX - 50, 0);
    voidGrad.addColorStop(0, '#010002');
    voidGrad.addColorStop(1, 'rgba(1, 0, 2, 0)');
    ctx.fillStyle = voidGrad;
    ctx.fillRect(frontX - 2500, topY, 2450, wallH);

    // --- Detritos flutuantes (loop linear, sem nested) ---
    const debrisCount = Math.max(70, Math.floor(260 * quality));
    const frameBucket6 = Math.floor(frames / 6);
    for (let i = 0; i < debrisCount; i++) {
        const seed = (i * 71 + frameBucket6) | 0;
        const ih1 = fastHash(seed);
        const ih2 = fastHash(seed + 1);
        const voidX = frontX - 100 - (Math.pow(ih1, 1.2) * 1200);
        const voidY = topY + (ih2 * wallH);
        const snipX = Math.floor(voidX / blockSize) * blockSize;
        const snipY = Math.floor(voidY / blockSize) * blockSize;
        const colorHash = fastHash(seed + 2);

        if (colorHash < 0.5) {
            ctx.fillStyle = 'rgba(17, 0, 0, 0.4)';
        } else if (colorHash < 0.85) {
            ctx.fillStyle = `rgba(255, 20, 60, ${(0.2 + ih2 * 0.4).toFixed(2)})`;
        } else {
            ctx.fillStyle = `rgba(255, 100, 130, ${(0.3 + ih1 * 0.5).toFixed(2)})`;
        }
        ctx.fillRect(snipX, snipY, blockSize, colorHash > 0.95 ? blockSize * (2 + Math.floor(ih1 * 4)) : blockSize);
    }

    // --- Aura de tela (1 troca de compositeOperation, 1 fillRect) ---
    ctx.globalCompositeOperation = 'screen';
    const aura = ctx.createLinearGradient(frontX - 350, 0, frontX + 350, 0);
    aura.addColorStop(0, 'rgba(255, 0, 40, 0)');
    aura.addColorStop(0.5, `rgba(255, 0, 40, ${(0.85 + pulse * 0.15).toFixed(2)})`);
    aura.addColorStop(0.75, `rgba(255, 0, 40, ${(0.4 + pulse * 0.1).toFixed(2)})`);
    aura.addColorStop(1, 'rgba(255, 0, 40, 0)');
    ctx.fillStyle = aura;
    ctx.fillRect(frontX - 350, topY, 700, wallH);
    ctx.globalCompositeOperation = 'source-over';

    // --- Grid de corrupção — offscreen canvas com frame-skip ---
    const corrupAreaStart = frontX - 400;
    const corrupAreaEnd = frontX + 80;
    const gridW = Math.ceil((corrupAreaEnd - corrupAreaStart) / blockSize) * blockSize;
    const gridH = Math.ceil(wallH / blockSize) * blockSize;
    const { canvas: gridCanvas, ctx: gCtx } = getGridCanvas(gridW, gridH);

    if (frames - _gridLastFrame >= GRID_UPDATE_INTERVAL) {
        _gridLastFrame = frames;
        gCtx.clearRect(0, 0, gridW, gridH);

        const cols = Math.ceil(gridW / blockSize);
        const rows = Math.ceil(gridH / blockSize);
        const frameBucket4 = Math.floor(frames / 4);
        const pulseA = (0.8 + pulse * 0.2).toFixed(2);

        for (let c = 0; c < cols; c++) {
            const colX = corrupAreaStart + c * blockSize;
            const density = 1.0 - Math.pow(c / cols, 3.5);
            const colSeedBase = (Math.floor(colX / blockSize) * 17) | 0;

            for (let r = 0; r < rows; r++) {
                const rowY = topY + r * blockSize;
                const cellSeed = (colSeedBase + (Math.floor(rowY / blockSize) * 31) + frameBucket4) | 0;
                const h = fastHash(cellSeed);
                if (h > density) continue;

                const colorHash = fastHash(cellSeed + 1);
                if (colorHash < 0.65) {
                    gCtx.fillStyle = `rgba(0,0,0,${(0.4 + h * 0.4).toFixed(2)})`;
                } else if (colorHash < 0.80) {
                    gCtx.fillStyle = 'rgba(40,0,0,0.6)';
                } else if (colorHash < 0.94) {
                    gCtx.fillStyle = `rgba(255,20,60,${pulseA})`;
                } else {
                    gCtx.fillStyle = `rgba(255,100,130,${pulseA})`;
                }
                gCtx.fillRect(c * blockSize, r * blockSize, blockSize, blockSize);
            }
        }
    }

    // 1 drawImage substitui os ~5.600 fillRect do loop nested
    ctx.drawImage(gridCanvas, corrupAreaStart, topY, gridW, gridH);

    // --- Dodge / bites / sparks — batches com 2 trocas no total ---
    const frameBucket2 = Math.floor(frames / 2);

    const dodgeCount = Math.max(24, Math.floor(80 * quality));
    ctx.globalCompositeOperation = 'color-dodge';
    for (let i = 0; i < dodgeCount; i++) {
        const seed = (i * 29 + frameBucket2) | 0;
        const ih1 = fastHash(seed);
        const ih2 = fastHash(seed + 1);
        ctx.fillStyle = ih1 > 0.5 ? 'rgba(255,0,50,0.9)' : 'rgba(255,255,255,0.8)';
        ctx.fillRect(
            Math.floor((frontX + ih1 * 250) / blockSize) * blockSize,
            Math.floor((topY + ih2 * wallH) / blockSize) * blockSize,
            blockSize * (1 + Math.floor(ih1 * 8)),
            blockSize * (1 + Math.floor(ih2 * 2))
        );
    }

    const biteCount = Math.max(48, Math.floor(150 * quality));
    const frameBucket15 = Math.floor(frames / 1.5);
    ctx.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < biteCount; i++) {
        const seed = (i * 41 + frameBucket15) | 0;
        const ih1 = fastHash(seed);
        const ih2 = fastHash(seed + 1);
        ctx.fillStyle = '#000000';
        ctx.fillRect(
            Math.floor((frontX + 50 - ih1 * 650) / blockSize) * blockSize,
            Math.floor((topY + ih2 * wallH) / blockSize) * blockSize,
            blockSize * (1 + Math.floor(ih1 * 5)),
            blockSize * (1 + Math.floor(ih2 * 5))
        );
    }

    const sparkCount = Math.max(16, Math.floor(42 * quality));
    ctx.globalCompositeOperation = 'screen';
    for (let i = 0; i < sparkCount; i++) {
        const seed = (i * 53 + frameBucket2) | 0;
        const ih1 = fastHash(seed);
        const ih2 = fastHash(seed + 1);
        ctx.fillStyle = ih2 > 0.5 ? 'rgba(255,50,50,0.9)' : 'rgba(255,100,100,0.7)';
        ctx.fillRect(frontX + 50 + ih1 * 250, topY + ih2 * wallH, blockSize + ih1 * 15, 2);
    }

    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();
}
