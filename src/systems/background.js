/*
 * Background rendering: sky, skyline layers, and rain.
 * Keeps gameplay untouched while modernizing scene lighting.
 */

import state from '../core/state.js';
import { BUILDING_BASE, VIRTUAL_HEIGHT, VIRTUAL_WIDTH } from '../config.js';

function getViewMetrics() {
    const viewW = state.view?.worldWidth || VIRTUAL_WIDTH;
    const viewH = state.view?.worldHeight || VIRTUAL_HEIGHT;

    return {
        viewW,
        viewH,
        horizonY: viewH * (380 / VIRTUAL_HEIGHT)
    };
}

function drawAtmosphereBands(ctx, isSun, viewW, viewH) {
    const quality = state.performance?.quality || 1;
    const t = state.game.frames * 0.006;
    const bandAlpha = isSun ? 0.12 : 0.07;
    const bandCount = quality < 0.82 ? 2 : 4;
    const scaleY = viewH / VIRTUAL_HEIGHT;

    for (let i = 0; i < bandCount; i++) {
        const y = (90 + (i * 62) + Math.sin(t + (i * 1.9)) * 10) * scaleY;
        const h = (78 + (i * 12)) * scaleY;
        const grad = ctx.createLinearGradient(0, y, viewW, y + h);

        grad.addColorStop(0, `rgba(75, 220, 255, ${bandAlpha * 0.2})`);
        grad.addColorStop(0.45, `rgba(255, 95, 176, ${bandAlpha})`);
        grad.addColorStop(1, `rgba(32, 20, 54, ${bandAlpha * 0.15})`);

        ctx.fillStyle = grad;
        ctx.fillRect(0, y, viewW, h);
    }
}

function drawCelestialBody(ctx, isSun, phase, x, y) {
    const outerRadius = isSun ? 72 : 60;
    const innerRadius = isSun ? 54 : 48;

    const glow = ctx.createRadialGradient(x, y, 12, x, y, outerRadius * 2.4);
    glow.addColorStop(0, isSun ? 'rgba(255, 180, 110, 0.42)' : 'rgba(145, 215, 255, 0.38)');
    glow.addColorStop(0.6, isSun ? 'rgba(255, 85, 140, 0.18)' : 'rgba(100, 170, 255, 0.14)');
    glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(x - outerRadius * 2.4, y - outerRadius * 2.4, outerRadius * 4.8, outerRadius * 4.8);

    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, outerRadius, 0, Math.PI * 2);
    ctx.clip();

    const disk = ctx.createLinearGradient(x, y - outerRadius, x, y + outerRadius);
    if (isSun) {
        disk.addColorStop(0, '#ffef9a');
        disk.addColorStop(0.42, '#ff9561');
        disk.addColorStop(1, '#fb1f7f');
    } else {
        disk.addColorStop(0, '#ebfbff');
        disk.addColorStop(0.5, '#9de5ff');
        disk.addColorStop(1, '#4f8dff');
    }
    ctx.fillStyle = disk;
    ctx.fillRect(x - outerRadius, y - outerRadius, outerRadius * 2, outerRadius * 2);

    ctx.fillStyle = isSun ? 'rgba(20, 10, 20, 0.18)' : 'rgba(14, 18, 34, 0.18)';
    for (let line = y - outerRadius; line <= y + outerRadius; line += 11) {
        ctx.fillRect(x - outerRadius, line, outerRadius * 2, 4.5);
    }

    ctx.restore();

    ctx.save();
    ctx.globalAlpha = 0.44;
    ctx.strokeStyle = isSun ? 'rgba(255, 135, 180, 0.6)' : 'rgba(145, 220, 255, 0.6)';
    ctx.lineWidth = 1.4;
    for (let i = 0; i < 3; i++) {
        const r = innerRadius + i * 14 + Math.sin((state.game.frames * 0.03) + i) * 1.2;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.stroke();
    }
    ctx.restore();

    // Removed floating flare circles to keep the sun/moon clean.
}

function drawSkyGrid(ctx, detailScale = 1, viewW, viewH, horizonY) {
    const hue = (state.game.dist / 120) % 360;
    const gridColor = `hsla(${hue}, 90%, 58%, 0.34)`;
    const midColor = `hsla(${hue}, 85%, 52%, 0.19)`;
    const xStep = detailScale < 1 ? 72 : 48;
    const horizonLines = detailScale < 1 ? 7 : 10;

    ctx.save();
    ctx.strokeStyle = gridColor;
    ctx.shadowBlur = detailScale < 1 ? 9 : 16;
    ctx.shadowColor = `hsla(${hue}, 100%, 60%, 0.28)`;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (let x = 0; x <= viewW; x += xStep) {
        ctx.moveTo(x, viewH);
        ctx.lineTo(viewW * 0.5, horizonY - 170);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.strokeStyle = midColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < horizonLines; i++) {
        const y = horizonY + (i * i * 2.2);
        ctx.moveTo(0, y);
        ctx.lineTo(viewW, y);
    }
    ctx.stroke();
    ctx.restore();
}

export function drawBackground() {
    const ctx = state.ctx;
    const quality = state.performance?.quality || 1;
    const { viewW, viewH, horizonY } = getViewMetrics();
    const cycleProg = state.game.time || 0;
    const isSun = cycleProg < 0.5;
    const phase = isSun ? (cycleProg / 0.5) : ((cycleProg - 0.5) / 0.5);
    const celestialMargin = Math.max(80, viewW * 0.09);
    const celestialX = celestialMargin + (phase * (viewW - (celestialMargin * 2)));
    const celestialBaseY = viewH * (520 / VIRTUAL_HEIGHT);
    const celestialArc = viewH * (328 / VIRTUAL_HEIGHT);
    const celestialY = celestialBaseY - (Math.sin(phase * Math.PI) * celestialArc);

    const sky = ctx.createLinearGradient(0, 0, 0, viewH);
    if (isSun) {
        sky.addColorStop(0, '#13081f');
        sky.addColorStop(0.36, '#42104e');
        sky.addColorStop(0.72, '#9f2b59');
        sky.addColorStop(1, '#f47d63');
    } else {
        sky.addColorStop(0, '#020512');
        sky.addColorStop(0.46, '#0b1630');
        sky.addColorStop(0.78, '#1e2544');
        sky.addColorStop(1, '#311f3e');
    }
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, viewW, viewH);

    drawAtmosphereBands(ctx, isSun, viewW, viewH);
    drawCelestialBody(ctx, isSun, phase, celestialX, celestialY);

    // Durante o dia, remove pontos brilhantes para o sol ficar limpo.
    const starOpacity = isSun ? 0 : 0.95;
    const starStep = quality < 0.8 ? 2 : 1;
    const repeatCount = Math.max(1, Math.ceil(viewW / VIRTUAL_WIDTH));
    if (starOpacity > 0) {
        for (let idx = 0; idx < state.stars.length; idx += starStep) {
            const star = state.stars[idx];
            const pulse = Math.abs(Math.sin((state.game.frames * 0.045) + star.blink));
            for (let copy = 0; copy < repeatCount; copy++) {
                const starX = star.x + (copy * VIRTUAL_WIDTH);
                if (starX > viewW + 4) break;
                ctx.globalAlpha = pulse * starOpacity;
                ctx.fillStyle = '#f3fbff';
                ctx.fillRect(starX, star.y, star.size + 0.25, star.size + 0.25);
                if (quality >= 0.92 && star.size > 1.1) {
                    ctx.globalAlpha = pulse * starOpacity * 0.25;
                    ctx.fillRect(starX - 2, star.y, star.size + 4, 0.8);
                    ctx.fillRect(starX, star.y - 2, 0.8, star.size + 4);
                }
            }
        }
    }
    ctx.globalAlpha = 1;

    const haze = ctx.createLinearGradient(0, horizonY - 40, 0, viewH);
    haze.addColorStop(0, isSun ? 'rgba(255, 115, 150, 0.15)' : 'rgba(85, 125, 240, 0.12)');
    haze.addColorStop(1, 'rgba(0, 0, 0, 0.76)');
    ctx.fillStyle = haze;
    ctx.fillRect(0, horizonY - 40, viewW, viewH - horizonY + 40);

    drawSkyGrid(ctx, state.game.started ? 1 : 0.6, viewW, viewH, horizonY);
}

export function drawLayer(layer, camX) {
    const ctx = state.ctx;
    const quality = state.performance?.quality || 1;
    const hueBase = (state.game.dist / 100) % 360;

    layer.forEach(building => {
        const relativeX = building.x - (camX * building.parallax);
        let x = relativeX % 2000;
        if (x < -220) x += 2000;

        const hue = hueBase;
        const accent = `hsla(${hue}, 100%, 62%, 0.5)`;
        const glow = `hsla(${hue}, 100%, 62%, 0.2)`;
        const windows = `hsla(${(hue + 30) % 360}, 100%, 76%, 0.2)`;
        const buildingAlpha = 0.34 + (building.opacity * 0.4);

        ctx.save();
        ctx.globalAlpha = buildingAlpha;

        const bodyGrad = ctx.createLinearGradient(x, building.y, x, building.y + building.h);
        bodyGrad.addColorStop(0, BUILDING_BASE.body);
        bodyGrad.addColorStop(0.22, '#101329');
        bodyGrad.addColorStop(1, 'rgba(0, 0, 0, 0.95)');
        ctx.fillStyle = bodyGrad;
        ctx.fillRect(x, building.y, building.w, building.h);

        ctx.strokeStyle = accent;
        ctx.lineWidth = 1;
        ctx.shadowBlur = 4;
        ctx.shadowColor = glow;
        ctx.strokeRect(x + 1, building.y + 0.5, building.w - 2, building.h - 1);
        ctx.shadowBlur = 0;

        if (quality >= 0.82) {
            ctx.fillStyle = windows;
            ctx.globalAlpha = (0.28 * building.opacity) + 0.22;
            if (building.pattern === 'grid') {
                for (let wy = building.y + 14; wy < building.y + building.h - 18; wy += 18) {
                    for (let wx = 6; wx < building.w - 10; wx += 14) {
                        ctx.fillRect(x + wx, wy, 6, 8);
                    }
                }
            } else if (building.pattern === 'stripes') {
                for (let wy = building.y + 16; wy < building.y + building.h - 24; wy += 24) {
                    ctx.fillRect(x + 6, wy, building.w - 12, 3);
                }
            } else if (building.pattern === 'bars') {
                for (let wx = 8; wx < building.w - 8; wx += 18) {
                    ctx.fillRect(x + wx, building.y + 10, 6, building.h - 20);
                }
            } else {
                for (let wy = building.y + 12; wy < building.y + building.h - 16; wy += 26) {
                    ctx.fillRect(x + 10, wy, building.w - 20, 3);
                }
            }
        }

        ctx.globalAlpha = 1;
        ctx.fillStyle = accent;
        ctx.globalAlpha = 0.15;
        const panelH = Math.min(36, building.h * 0.15);
        ctx.fillRect(x + 6, building.y + building.h * 0.44, building.w * 0.22, panelH);
        ctx.fillRect(x + building.w * 0.64, building.y + building.h * 0.26, building.w * 0.18, panelH * 0.7);

        if (building.flashTimer > 0) {
            const flash = ctx.createLinearGradient(x, building.y + 7, x, building.y + 18);
            flash.addColorStop(0, 'rgba(255, 255, 255, 0.65)');
            flash.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = flash;
            ctx.globalAlpha = 0.36;
            ctx.fillRect(x + 5, building.y + 7, building.w - 10, 11);
        }

        const fade = ctx.createLinearGradient(0, building.y + building.h * 0.7, 0, building.y + building.h);
        fade.addColorStop(0, 'rgba(0, 0, 0, 0)');
        fade.addColorStop(1, 'rgba(0, 0, 0, 0.35)');
        ctx.fillStyle = fade;
        ctx.globalAlpha = 1;
        ctx.fillRect(x, building.y + building.h * 0.7, building.w, building.h * 0.3);

        ctx.restore();
    });
}

export function drawRainBackground() {
    const ctx = state.ctx;
    const quality = state.performance?.quality || 1;
    const stride = quality < 0.84 ? 2 : 1;
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.lineWidth = 1.1;

    for (let i = 0; i < state.rainDrops.length; i += stride) {
        const drop = state.rainDrops[i];
        ctx.strokeStyle = `rgba(80, 185, 255, ${drop.alpha * 0.7})`;
        ctx.beginPath();
        ctx.moveTo(drop.x, drop.y);
        ctx.lineTo(drop.x - 2.5, drop.y - drop.len);
        ctx.stroke();

        ctx.globalAlpha = drop.alpha * 0.1;
        ctx.fillStyle = 'rgba(120, 220, 255, 1)';
        ctx.fillRect(drop.x - 0.5, drop.y - 1, 1.2, 2);
        ctx.globalAlpha = 1;
    }

    state.rainSplashes.forEach(splash => {
        const life = splash.life / splash.maxLife;
        ctx.strokeStyle = `rgba(125, 195, 255, ${0.32 * life})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(splash.x, splash.y, splash.spread * (1 - life), Math.PI, Math.PI * 2);
        ctx.stroke();
    });

    ctx.restore();
}
