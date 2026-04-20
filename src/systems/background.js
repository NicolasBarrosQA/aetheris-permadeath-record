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
    if (quality < 0.74) return;

    const glow = ctx.createRadialGradient(
        viewW * 0.5,
        viewH * 0.34,
        viewW * 0.08,
        viewW * 0.5,
        viewH * 0.34,
        viewW * 0.78
    );

    if (isSun) {
        glow.addColorStop(0, 'rgba(255, 124, 164, 0.08)');
        glow.addColorStop(0.42, 'rgba(255, 176, 116, 0.045)');
        glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    } else {
        glow.addColorStop(0, 'rgba(126, 180, 255, 0.06)');
        glow.addColorStop(0.42, 'rgba(112, 128, 255, 0.035)');
        glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    }

    ctx.save();
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, viewW, viewH);
    ctx.restore();
}

function drawCelestialBody(ctx, isSun, phase, x, y) {
    const outerRadius = isSun ? 74 : 60;
    const innerRadius = isSun ? 58 : 48;

    const glow = ctx.createRadialGradient(x, y, 10, x, y, outerRadius * 2.4);
    glow.addColorStop(0, isSun ? 'rgba(255, 215, 140, 0.48)' : 'rgba(210, 235, 255, 0.26)');
    glow.addColorStop(0.36, isSun ? 'rgba(255, 126, 150, 0.16)' : 'rgba(96, 168, 255, 0.1)');
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
        disk.addColorStop(0.4, '#ff9561');
        disk.addColorStop(1, '#fb1f7f');
    } else {
        disk.addColorStop(0, '#e8f7ff');
        disk.addColorStop(0.45, '#9cd8ff');
        disk.addColorStop(1, '#5e95ff');
    }
    ctx.fillStyle = disk;
    ctx.fillRect(x - outerRadius, y - outerRadius, outerRadius * 2, outerRadius * 2);

    const highlight = ctx.createRadialGradient(
        x - (outerRadius * 0.15),
        y - (outerRadius * 0.2),
        0,
        x - (outerRadius * 0.15),
        y - (outerRadius * 0.2),
        outerRadius * 0.82
    );
    highlight.addColorStop(0, 'rgba(255,255,255,0.32)');
    highlight.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = highlight;
    ctx.fillRect(x - outerRadius, y - outerRadius, outerRadius * 2, outerRadius * 2);

    ctx.fillStyle = isSun ? 'rgba(44, 18, 38, 0.12)' : 'rgba(10, 22, 44, 0.1)';
    for (let line = y - outerRadius; line < y + outerRadius; line += 11) {
        ctx.fillRect(x - outerRadius, line, outerRadius * 2, 4.5);
    }
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = 0.44;
    ctx.strokeStyle = isSun ? 'rgba(255, 120, 180, 0.6)' : 'rgba(130, 220, 255, 0.55)';
    ctx.lineWidth = 1.1;
    for (let i = 0; i < 3; i++) {
        const r = innerRadius + (i * 14) + Math.sin((state.game.frames * 0.02) + i) * 1.5;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.stroke();
    }
    ctx.restore();
}

function drawSkyGrid(ctx, detailScale = 1, viewW, viewH, horizonY) {
    const hue = (state.game.dist / 120) % 360;
    const gridColor = `hsla(${hue}, 90%, 58%, 0.24)`;
    const midColor = `hsla(${hue}, 85%, 52%, 0.12)`;
    const xStep = detailScale < 1 ? 72 : 48;

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
        sky.addColorStop(0, '#020617');
        sky.addColorStop(0.36, '#0f2041');
        sky.addColorStop(1, '#2a2f63');
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

function drawBuildingRoof(ctx, building, x, accent, glow, quality) {
    const crownH = Math.min(building.crownHeight || 18, 30);
    const topY = building.y - (crownH * 0.55);
    const style = building.crownStyle || 0;
    const mainW = building.w;

    ctx.save();
    ctx.fillStyle = 'rgba(6, 10, 24, 0.92)';
    ctx.strokeStyle = accent;
    ctx.lineWidth = 1;
    ctx.shadowBlur = quality >= 0.9 ? 5 : 0;
    ctx.shadowColor = glow;

    if (style === 0) {
        const insetW = mainW * 0.56;
        const insetX = x + ((mainW - insetW) * 0.5);
        ctx.fillRect(insetX, topY, insetW, crownH);
        ctx.strokeRect(insetX + 0.5, topY + 0.5, insetW - 1, crownH - 1);
    } else if (style === 1) {
        const towerW = Math.max(16, mainW * 0.22);
        ctx.fillRect(x + (mainW * 0.18), topY + 5, towerW, crownH - 5);
        ctx.fillRect(x + mainW - (mainW * 0.18) - towerW, topY, towerW, crownH);
        ctx.strokeRect(x + (mainW * 0.18) + 0.5, topY + 5.5, towerW - 1, crownH - 6);
        ctx.strokeRect(x + mainW - (mainW * 0.18) - towerW + 0.5, topY + 0.5, towerW - 1, crownH - 1);
    } else if (style === 2) {
        const capW = mainW * 0.78;
        const capX = x + ((mainW - capW) * 0.5);
        const capH = Math.max(8, crownH * 0.72);
        ctx.fillRect(capX, topY + 6, capW, capH);
        ctx.strokeRect(capX + 0.5, topY + 6.5, capW - 1, capH - 1);
        ctx.fillStyle = accent;
        ctx.globalAlpha = 0.2;
        ctx.fillRect(capX + 6, topY + 10, capW - 12, 2);
    } else {
        const baseW = mainW * 0.46;
        const baseX = x + ((mainW - baseW) * 0.5);
        ctx.fillRect(baseX, topY + 8, baseW, crownH - 8);
        ctx.strokeRect(baseX + 0.5, topY + 8.5, baseW - 1, crownH - 9);
    }

    if (building.beacon && quality >= 0.78) {
        const beaconX = x + (mainW * building.beaconOffset);
        const beaconY = topY - (building.antennaHeight || 18);
        const beaconPulse = 0.45 + (Math.sin((state.game.frames * 0.05) + building.windowPhase) * 0.5);
        ctx.globalAlpha = 0.35 + (beaconPulse * 0.35);
        ctx.strokeStyle = 'rgba(255, 146, 176, 0.72)';
        ctx.beginPath();
        ctx.moveTo(beaconX, topY + 4);
        ctx.lineTo(beaconX, beaconY);
        ctx.stroke();
        ctx.fillStyle = 'rgba(255, 120, 160, 0.95)';
        ctx.shadowBlur = 10;
        ctx.shadowColor = 'rgba(255, 120, 160, 0.7)';
        ctx.beginPath();
        ctx.arc(beaconX, beaconY, 2.2 + (beaconPulse * 0.9), 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.restore();
}

function drawBuildingWindows(ctx, building, x, quality, frameBucket, flashBoost, windowCore, windowHot) {
    const densityBias = Math.max(0, 1.06 - (building.windowDensity || 1));

    if (building.pattern === 'grid') {
        for (let wy = building.y + 16; wy < building.y + building.h - 22; wy += 18) {
            for (let wx = 8; wx < building.w - 12; wx += 15) {
                const pulse = (Math.sin(building.windowPhase + ((building.x + (wx * 7) + (wy * 9) + (frameBucket * 19)) * 0.03)) + 1) * 0.5;
                if (pulse < 0.44 + densityBias && flashBoost < 0.05) continue;
                ctx.fillStyle = windowCore;
                ctx.globalAlpha = Math.min(0.9, (0.17 * building.opacity) + 0.16 + flashBoost + (pulse * 0.16));
                ctx.fillRect(x + wx, wy, 6, 8);
                if (quality >= 0.92 && pulse > 0.78) {
                    ctx.fillStyle = windowHot;
                    ctx.globalAlpha *= 0.55;
                    ctx.fillRect(x + wx, wy, 6, 2);
                }
            }
        }
        return;
    }

    if (building.pattern === 'stripes') {
        const leftW = Math.max(24, building.w * 0.28);
        const rightW = Math.max(20, building.w * 0.2);
        for (let wy = building.y + 18; wy < building.y + building.h - 26; wy += 24) {
            const pulse = (Math.sin(building.windowPhase + ((building.x + (wy * 5) + (frameBucket * 17)) * 0.035)) + 1) * 0.5;
            if (pulse < 0.46 + densityBias && flashBoost < 0.05) continue;
            ctx.fillStyle = windowCore;
            ctx.globalAlpha = Math.min(0.84, (0.15 * building.opacity) + 0.16 + flashBoost + (pulse * 0.18));
            ctx.fillRect(x + 8, wy, leftW, 3);
            ctx.fillRect(x + building.w - rightW - 8, wy, rightW, 3);
            if (quality >= 0.92 && pulse > 0.76) {
                ctx.fillStyle = windowHot;
                ctx.globalAlpha *= 0.5;
                ctx.fillRect(x + 8, wy, leftW * 0.45, 1.5);
            }
        }
        return;
    }

    if (building.pattern === 'bars') {
        for (let wx = 10; wx < building.w - 12; wx += 20) {
            const pulse = (Math.sin(building.windowPhase + ((building.x + (wx * 11) + (frameBucket * 13)) * 0.026)) + 1) * 0.5;
            if (pulse < 0.42 + densityBias && flashBoost < 0.05) continue;
            ctx.fillStyle = windowCore;
            ctx.globalAlpha = Math.min(0.8, (0.16 * building.opacity) + 0.14 + flashBoost + (pulse * 0.16));
            ctx.fillRect(x + wx, building.y + 12, 6, building.h - 24);
            if (quality >= 0.9 && pulse > 0.82) {
                ctx.fillStyle = windowHot;
                ctx.globalAlpha *= 0.42;
                ctx.fillRect(x + wx, building.y + 12, 2, building.h - 24);
            }
        }
        return;
    }

    for (let wy = building.y + 14; wy < building.y + building.h - 18; wy += 26) {
        const pulse = (Math.sin(building.windowPhase + ((building.x + (wy * 13) + (frameBucket * 29)) * 0.024)) + 1) * 0.5;
        if (pulse < 0.48 + densityBias && flashBoost < 0.05) continue;
        ctx.fillStyle = windowCore;
        ctx.globalAlpha = Math.min(0.8, (0.15 * building.opacity) + 0.14 + flashBoost + (pulse * 0.15));
        const inset = Math.max(12, building.w * 0.12);
        ctx.fillRect(x + inset, wy, building.w - (inset * 2), 3);
        if (quality >= 0.92 && pulse > 0.74) {
            ctx.fillStyle = windowHot;
            ctx.globalAlpha *= 0.46;
            ctx.fillRect(x + inset, wy, (building.w - (inset * 2)) * 0.3, 1.5);
        }
    }
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

        const hue = (hueBase + (building.accentShift || 0) + 360) % 360;
        const accent = `hsla(${hue}, 100%, 64%, 0.56)`;
        const glow = `hsla(${hue}, 100%, 62%, 0.24)`;
        const windowCore = `hsla(${(hue + 26) % 360}, 100%, 78%, 0.24)`;
        const windowHot = `hsla(${(hue + 10) % 360}, 100%, 92%, 0.55)`;
        const buildingAlpha = 0.34 + (building.opacity * 0.4);

        ctx.save();
        ctx.globalAlpha = buildingAlpha;

        const bodyGrad = ctx.createLinearGradient(x, building.y, x, building.y + building.h);
        bodyGrad.addColorStop(0, '#11172d');
        bodyGrad.addColorStop(0.18, '#0f1428');
        bodyGrad.addColorStop(0.42, BUILDING_BASE.body);
        bodyGrad.addColorStop(1, 'rgba(0, 0, 0, 0.95)');
        ctx.fillStyle = bodyGrad;
        ctx.fillRect(x, building.y, building.w, building.h);

        const sideGloss = ctx.createLinearGradient(x, 0, x + building.w, 0);
        sideGloss.addColorStop(0, 'rgba(170, 232, 255, 0.12)');
        sideGloss.addColorStop(0.12, 'rgba(255, 255, 255, 0.04)');
        sideGloss.addColorStop(0.48, 'rgba(0, 0, 0, 0)');
        sideGloss.addColorStop(1, 'rgba(0, 0, 0, 0.24)');
        ctx.fillStyle = sideGloss;
        ctx.fillRect(x, building.y, building.w, building.h);

        ctx.strokeStyle = accent;
        ctx.lineWidth = 1;
        ctx.shadowBlur = 4;
        ctx.shadowColor = glow;
        ctx.strokeRect(x + 1, building.y + 0.5, building.w - 2, building.h - 1);
        ctx.shadowBlur = 0;

        if (quality >= 0.82) {
            const ribCount = Math.max(2, Math.floor(building.w / 54));
            ctx.globalAlpha = 0.16;
            ctx.strokeStyle = 'rgba(140, 224, 255, 0.22)';
            ctx.beginPath();
            for (let rib = 1; rib <= ribCount; rib++) {
                const ribX = x + ((building.w / (ribCount + 1)) * rib);
                ctx.moveTo(ribX, building.y + 6);
                ctx.lineTo(ribX, building.y + building.h);
            }
            ctx.stroke();
            ctx.globalAlpha = buildingAlpha;
        }

        if (quality >= 0.76) {
            const bandCount = building.facadeBands || 3;
            const step = building.h / (bandCount + 2);
            ctx.fillStyle = accent;
            ctx.globalAlpha = 0.08;
            for (let band = 1; band <= bandCount; band++) {
                const bandY = building.y + (step * band);
                ctx.fillRect(x + 6, bandY, building.w - 12, 1.6);
            }
            ctx.globalAlpha = buildingAlpha;
        }

        drawBuildingRoof(ctx, building, x, accent, glow, quality);

        if (quality >= 0.72) {
            const flashBoost = building.flashTimer > 0 ? ((building.flashTimer / 10) * 0.22) : 0;
            const frameBucket = Math.floor(state.game.frames / 14);
            drawBuildingWindows(ctx, building, x, quality, frameBucket, flashBoost, windowCore, windowHot);
        }

        ctx.globalAlpha = 1;
        ctx.fillStyle = accent;
        ctx.globalAlpha = 0.12;
        const panelH = Math.min(36, building.h * 0.15);
        ctx.fillRect(x + 8, building.y + building.h * 0.42, building.w * 0.18, panelH);
        ctx.fillRect(x + building.w * 0.62, building.y + building.h * 0.24, building.w * 0.14, panelH * 0.72);
        ctx.fillRect(x + building.w * 0.28, building.y + building.h * 0.58, building.w * 0.1, panelH * 0.62);

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
