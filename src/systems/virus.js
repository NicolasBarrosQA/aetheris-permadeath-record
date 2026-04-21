import state from '../core/state.js';
import { BALANCE, DIFFICULTY_MODES } from '../config.js';

function getDifficultyMode() {
    return DIFFICULTY_MODES[state.game.modeId] || DIFFICULTY_MODES.medium;
}

function getVirusPressureSpeed(difficulty) {
    const virusBalance = BALANCE.virus;
    const diffOverBase = Math.max(0, difficulty - BALANCE.difficulty.base);
    const normalized = 1 - Math.exp(-diffOverBase * virusBalance.difficultyFalloff);
    return virusBalance.baseSpeed + ((virusBalance.maxSpeed - virusBalance.baseSpeed) * normalized);
}

export function updateVirus(viewH) {
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
    // Crescimento com desaceleracao progressiva (curva assintotica).
    const pressureSpeed = getVirusPressureSpeed(state.game.difficulty);
    virus.x += pressureSpeed;

    if (virus.damageTick > 0) virus.damageTick--;

    // O vírus desintegra os inimigos que forem pegos pela névoa
    for (let i = state.enemies.length - 1; i >= 0; i--) {
        let enemy = state.enemies[i];
        // Se o inimigo ainda está vivo e a névoa vermelha o tocou
        if (enemy.hp > 0 && enemy.x + enemy.w < virus.x + 120) {
            // Causa um dano letal garantido (sem conceder moedas ao player)
            enemy.takeDamage(enemy.maxHp * 10, false);
        }
    }

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

export function drawVirus(ctx, viewH) {
    const virus = state.virusWall;
    if (!virus.active) return;

    const topY = state.camera.y - 300;
    const wallH = viewH + 600;
    const frontX = virus.x;
    const frames = state.game.frames;
    const pulse = 0.55 + Math.sin(virus.pulse) * 0.25;

    ctx.save();
    
    const getHash = (seed) => {
        const x = Math.sin(seed) * 43758.5453123;
        return x - Math.floor(x);
    };

    const blockSize = 6;

    const voidGrad = ctx.createLinearGradient(frontX - 800, 0, frontX - 50, 0);
    voidGrad.addColorStop(0, '#010002');
    voidGrad.addColorStop(1, 'rgba(1, 0, 2, 0)');
    ctx.fillStyle = voidGrad;
    ctx.fillRect(frontX - 2500, topY, 2450, wallH);

    for (let i = 0; i < 450; i++) {
        const seed = i * 71 + Math.floor(frames / 6);
        const ih1 = getHash(seed);
        const ih2 = getHash(seed + 1);
        const voidX = frontX - 100 - (Math.pow(ih1, 1.2) * 1200); 
        const voidY = topY + (ih2 * wallH);
        const snipX = Math.floor(voidX / blockSize) * blockSize;
        const snipY = Math.floor(voidY / blockSize) * blockSize;

        let colorHash = getHash(seed + 2);
        if (colorHash < 0.5) {
            ctx.fillStyle = 'rgba(17, 0, 0, 0.4)';
        } else if (colorHash < 0.85) {
            ctx.fillStyle = `rgba(255, 20, 60, ${0.2 + ih2 * 0.4})`;
        } else {
            ctx.fillStyle = `rgba(255, 100, 130, ${0.3 + ih1 * 0.5})`;
        }

        if (colorHash > 0.95) {
            ctx.fillRect(snipX, snipY, blockSize, blockSize * (2 + Math.floor(ih1 * 4)));
        } else {
            ctx.fillRect(snipX, snipY, blockSize, blockSize);
        }
    }

    ctx.globalCompositeOperation = 'screen';
    const aura = ctx.createLinearGradient(frontX - 350, 0, frontX + 350, 0);
    aura.addColorStop(0, 'rgba(255, 0, 40, 0)');
    aura.addColorStop(0.5, `rgba(255, 0, 40, ${0.85 + pulse * 0.15})`);
    aura.addColorStop(0.75, `rgba(255, 0, 40, ${0.4 + pulse * 0.1})`);
    aura.addColorStop(1, 'rgba(255, 0, 40, 0)');
    ctx.fillStyle = aura;
    ctx.fillRect(frontX - 350, topY, 700, wallH);
    ctx.globalCompositeOperation = 'source-over';

    const corrupAreaStart = frontX - 400; 
    const corrupAreaEnd = frontX + 80; 
    const cols = Math.ceil((corrupAreaEnd - corrupAreaStart) / blockSize);
    const rows = Math.ceil(wallH / blockSize);

    for (let c = 0; c < cols; c++) {
        const colX = corrupAreaStart + c * blockSize;
        const progress = c / cols;
        const density = 1.0 - Math.pow(progress, 3.5);

        for (let r = 0; r < rows; r++) {
            const rowY = topY + r * blockSize;
            const cellSeed = Math.floor(colX / blockSize) * 17 + Math.floor(rowY / blockSize) * 31 + Math.floor(frames / 4);
            const h = getHash(cellSeed);

            if (h > density) continue;

            let colorHash = getHash(cellSeed + 1);
            if (colorHash < 0.65) {
                ctx.fillStyle = `rgba(0, 0, 0, ${0.4 + h * 0.4})`;
            } else if (colorHash < 0.80) {
                ctx.fillStyle = 'rgba(40, 0, 0, 0.6)';
            } else if (colorHash < 0.94) {
                ctx.fillStyle = `rgba(255, 20, 60, ${0.8 + pulse * 0.2})`;
            } else {
                ctx.fillStyle = `rgba(255, 100, 130, ${0.8 + pulse * 0.2})`;
            }

            ctx.fillRect(colX, rowY, blockSize, blockSize);
        }
    }

    ctx.globalCompositeOperation = 'color-dodge';
    for (let i = 0; i < 150; i++) {
        const seed = i * 29 + Math.floor(frames / 2);
        const ih1 = getHash(seed);
        const ih2 = getHash(seed + 1);
        const biteX = frontX + (ih1 * 250);
        const biteY = topY + (ih2 * wallH);
        const biteW = blockSize * (1 + Math.floor(ih1 * 8));
        const biteH = blockSize * (1 + Math.floor(ih2 * 2)); 
        const snipX = Math.floor(biteX / blockSize) * blockSize;
        const snipY = Math.floor(biteY / blockSize) * blockSize;

        ctx.fillStyle = ih1 > 0.5 ? 'rgba(255, 0, 50, 0.9)' : 'rgba(255, 255, 255, 0.8)';
        ctx.fillRect(snipX, snipY, biteW, biteH);
    }

    ctx.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < 300; i++) {
        const seed = i * 41 + Math.floor(frames / 1.5);
        const ih1 = getHash(seed);
        const ih2 = getHash(seed + 1);
        const biteX = frontX + 50 - (ih1 * 650);
        const biteY = topY + (ih2 * wallH);
        const biteW = blockSize * (1 + Math.floor(ih1 * 5));
        const biteH = blockSize * (1 + Math.floor(ih2 * 5));
        const snipX = Math.floor(biteX / blockSize) * blockSize;
        const snipY = Math.floor(biteY / blockSize) * blockSize;

        ctx.fillStyle = '#000000';
        ctx.fillRect(snipX, snipY, biteW, biteH);
    }

    ctx.globalCompositeOperation = 'screen';
    for (let i = 0; i < 80; i++) {
        const seed = i * 53 + Math.floor(frames / 2);
        const ih1 = getHash(seed);
        const ih2 = getHash(seed + 1);
        const sparkX = frontX + 50 + (ih1 * 250);
        const sparkY = topY + (ih2 * wallH);

        ctx.fillStyle = ih2 > 0.5 ? 'rgba(255, 50, 50, 0.9)' : 'rgba(255, 100, 100, 0.7)';
        ctx.fillRect(sparkX, sparkY, blockSize + (ih1 * 15), 2);
    }

    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();
}

