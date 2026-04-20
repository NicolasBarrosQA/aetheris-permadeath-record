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
    const bandCount = quality < 0.82 ? 2 : 3;
    const scaleY = viewH / VIRTUAL_HEIGHT;

    ctx.save();
    for (let i = 0; i < bandCount; i++) {
        const centerY = (120 + (i * 88) + Math.sin(t + (i * 1.6)) * 14) * scaleY;
        const radiusX = viewW * (0.46 + (i * 0.14));
        const radiusY = (52 + (i * 14)) * scaleY;
        const driftX = Math.sin((t * 1.3) + i) * 26;
        const grad = ctx.createLinearGradient(
            (viewW * 0.16) + driftX,
            centerY - radiusY,
            (viewW * 0.84) - driftX,
            centerY + radiusY
        );

        if (isSun) {
            grad.addColorStop(0, 'rgba(88, 220, 255, 0)');
            grad.addColorStop(0.28, 'rgba(88, 220, 255, 0.035)');
            grad.addColorStop(0.58, 'rgba(255, 116, 188, 0.12)');
            grad.addColorStop(1, 'rgba(255, 184, 112, 0)');
        } else {
            grad.addColorStop(0, 'rgba(90, 140, 255, 0)');
            grad.addColorStop(0.32, 'rgba(96, 164, 255, 0.05)');
            grad.addColorStop(0.62, 'rgba(172, 124, 255, 0.085)');
            grad.addColorStop(1, 'rgba(90, 140, 255, 0)');
        }

        ctx.globalAlpha = 0.88 - (i * 0.16);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.ellipse((viewW * 0.5) + driftX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();
}

function drawSkyBloom(ctx, isSun, viewW, viewH, horizonY, celestialX, celestialY) {
    ctx.save();

    const horizonGlow = ctx.createRadialGradient(
        viewW * 0.5,
        horizonY - (viewH * 0.08),
        viewW * 0.08,
        viewW * 0.5,
        horizonY - (viewH * 0.08),
        viewW * 0.72
    );
    if (isSun) {
        horizonGlow.addColorStop(0, 'rgba(255, 130, 168, 0.24)');
        horizonGlow.addColorStop(0.46, 'rgba(255, 154, 108, 0.12)');
        horizonGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    } else {
        horizonGlow.addColorStop(0, 'rgba(108, 170, 255, 0.14)');
        horizonGlow.addColorStop(0.46, 'rgba(102, 120, 255, 0.08)');
        horizonGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    }
    ctx.fillStyle = horizonGlow;
    ctx.fillRect(0, 0, viewW, viewH);

    const celestialBloom = ctx.createRadialGradient(
        celestialX,
        celestialY,
        12,
        celestialX,
        celestialY,
        Math.min(viewW, viewH) * 0.34
    );
    celestialBloom.addColorStop(0, isSun ? 'rgba(255, 236, 170, 0.2)' : 'rgba(210, 235, 255, 0.16)');
    celestialBloom.addColorStop(0.45, isSun ? 'rgba(255, 126, 156, 0.08)' : 'rgba(132, 188, 255, 0.07)');
    celestialBloom.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = celestialBloom;
    ctx.fillRect(0, 0, viewW, viewH);

    const upperWash = ctx.createLinearGradient(0, 0, 0, viewH * 0.62);
    upperWash.addColorStop(0, isSun ? 'rgba(8, 14, 28, 0.16)' : 'rgba(2, 8, 20, 0.22)');
    upperWash.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = upperWash;
    ctx.fillRect(0, 0, viewW, viewH * 0.62);

    ctx.restore();
}

function drawCelestialBody(ctx, isSun, phase, x, y) {
    const outerRadius = isSun ? 72 : 60;
    const innerRadius = isSun ? 54 : 48;

    const glow = ctx.createRadialGradient(x, y, 12, x, y, outerRadius * 2.8);
    glow.addColorStop(0, isSun ? 'rgba(255, 218, 146, 0.48)' : 'rgba(214, 240, 255, 0.28)');
    glow.addColorStop(0.42, isSun ? 'rgba(255, 116, 164, 0.18)' : 'rgba(116, 178, 255, 0.12)');
    glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(x - outerRadius * 2.8, y - outerRadius * 2.8, outerRadius * 5.6, outerRadius * 5.6);

    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, outerRadius, 0, Math.PI * 2);
    ctx.clip();

    const disk = ctx.createLinearGradient(x, y - outerRadius, x, y + outerRadius);
    if (isSun) {
        disk.addColorStop(0, '#fff2ae');
        disk.addColorStop(0.34, '#ffbf77');
        disk.addColorStop(0.7, '#ff6f8a');
        disk.addColorStop(1, '#ff3d92');
    } else {
        disk.addColorStop(0, '#f5fdff');
        disk.addColorStop(0.46, '#b8e8ff');
        disk.addColorStop(1, '#5e95ff');
    }
    ctx.fillStyle = disk;
    ctx.fillRect(x - outerRadius, y - outerRadius, outerRadius * 2, outerRadius * 2);

    const highlight = ctx.createRadialGradient(
        x - (outerRadius * 0.18),
        y - (outerRadius * 0.24),
        0,
        x - (outerRadius * 0.18),
        y - (outerRadius * 0.24),
        outerRadius * 0.9
    );
    highlight.addColorStop(0, 'rgba(255,255,255,0.42)');
    highlight.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = highlight;
    ctx.fillRect(x - outerRadius, y - outerRadius, outerRadius * 2, outerRadius * 2);

    ctx.fillStyle = isSun ? 'rgba(20, 10, 20, 0.1)' : 'rgba(14, 18, 34, 0.12)';
    for (let line = y - outerRadius; line <= y + outerRadius; line += 9) {
        ctx.fillRect(x - outerRadius, line, outerRadius * 2, 2.6);
    }

    ctx.restore();

    ctx.save();
    ctx.globalAlpha = 0.34;
    ctx.strokeStyle = isSun ? 'rgba(255, 135, 180, 0.6)' : 'rgba(145, 220, 255, 0.6)';
    ctx.lineWidth = 1.2;
    for (let i = 0; i < 2; i++) {
        const r = innerRadius + i * 16 + Math.sin((state.game.frames * 0.03) + i) * 1.1;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.stroke();
    }
    ctx.restore();

    // Removed floating flare circles to keep the sun/moon clean.
}

function drawSkyGrid(ctx, detailScale = 1, viewW, viewH, horizonY) {
    const hue = (state.game.dist / 120) % 360;
    const gridColor = `hsla(${hue}, 90%, 58%, 0.24)`;
    const midColor = `hsla(${hue}, 85%, 52%, 0.12)`;
    const xStep = detailScale < 1 ? 72 : 48;
    const horizonLines = detailScale < 1 ? 6 : 8;

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
        sky.addColorStop(0, '#090713');
        sky.addColorStop(0.22, '#241035');
        sky.addColorStop(0.52, '#5d245f');
        sky.addColorStop(0.78, '#bf4e78');
        sky.addColorStop(1, '#ff9670');
    } else {
        sky.addColorStop(0, '#020611');
        sky.addColorStop(0.28, '#0b1730');
        sky.addColorStop(0.62, '#243053');
        sky.addColorStop(1, '#40294a');
    }
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, viewW, viewH);

    drawSkyBloom(ctx, isSun, viewW, viewH, horizonY, celestialX, celestialY);
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

    const haze = ctx.createLinearGradient(0, horizonY - 52, 0, viewH);
    haze.addColorStop(0, isSun ? 'rgba(255, 136, 162, 0.12)' : 'rgba(98, 138, 255, 0.1)');
    haze.addColorStop(0.4, isSun ? 'rgba(255, 166, 112, 0.05)' : 'rgba(130, 120, 255, 0.04)');
    haze.addColorStop(1, 'rgba(0, 0, 0, 0.72)');
    ctx.fillStyle = haze;
    ctx.fillRect(0, horizonY - 52, viewW, viewH - horizonY + 52);

    drawSkyGrid(ctx, state.game.started ? 1 : 0.6, viewW, viewH, horizonY);
}

export function drawLayer(layer, camX) {
    const ctx = state.ctx;
    const quality = state.performance?.quality || 1;
    const hueBase = (state.game.dist / 100) % 360;
    const lastBuilding = layer[layer.length - 1];
    const layerSpan = lastBuilding
        ? Math.max(2000, lastBuilding.x + lastBuilding.w + 260)
        : 2000;

    layer.forEach(building => {
        const relativeX = building.x - (camX * building.parallax);
        let x = relativeX % layerSpan;
        if (x < (-building.w - 120)) x += layerSpan;

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

        if (quality >= 0.72) {
            const flashBoost = building.flashTimer > 0 ? ((building.flashTimer / 10) * 0.22) : 0;
            const frameBucket = Math.floor(state.game.frames / 14);
            if (building.pattern === 'grid') {
                for (let wy = building.y + 14; wy < building.y + building.h - 18; wy += 18) {
                    for (let wx = 6; wx < building.w - 10; wx += 14) {
                        const pulse = (Math.sin((building.x + (wx * 9) + (wy * 7) + (frameBucket * 23)) * 0.03) + 1) * 0.5;
                        if (pulse < 0.46 && flashBoost < 0.05) continue;
                        ctx.fillStyle = windows;
                        ctx.globalAlpha = Math.min(0.9, (0.2 * building.opacity) + 0.18 + flashBoost + (pulse * 0.18));
                        ctx.fillRect(x + wx, wy, 6, 8);
                    }
                }
            } else if (building.pattern === 'stripes') {
                for (let wy = building.y + 16; wy < building.y + building.h - 24; wy += 24) {
                    const pulse = (Math.sin((building.x + (wy * 5) + (frameBucket * 17)) * 0.035) + 1) * 0.5;
                    if (pulse < 0.48 && flashBoost < 0.05) continue;
                    ctx.fillStyle = windows;
                    ctx.globalAlpha = Math.min(0.86, (0.16 * building.opacity) + 0.16 + flashBoost + (pulse * 0.2));
                    ctx.fillRect(x + 6, wy, building.w - 12, 3);
                }
            } else if (building.pattern === 'bars') {
                for (let wx = 8; wx < building.w - 8; wx += 18) {
                    const pulse = (Math.sin((building.x + (wx * 11) + (frameBucket * 19)) * 0.028) + 1) * 0.5;
                    if (pulse < 0.44 && flashBoost < 0.05) continue;
                    ctx.fillStyle = windows;
                    ctx.globalAlpha = Math.min(0.84, (0.17 * building.opacity) + 0.15 + flashBoost + (pulse * 0.18));
                    ctx.fillRect(x + wx, building.y + 10, 6, building.h - 20);
                }
            } else {
                for (let wy = building.y + 12; wy < building.y + building.h - 16; wy += 26) {
                    const pulse = (Math.sin((building.x + (wy * 13) + (frameBucket * 29)) * 0.024) + 1) * 0.5;
                    if (pulse < 0.5 && flashBoost < 0.05) continue;
                    ctx.fillStyle = windows;
                    ctx.globalAlpha = Math.min(0.82, (0.16 * building.opacity) + 0.14 + flashBoost + (pulse * 0.16));
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
