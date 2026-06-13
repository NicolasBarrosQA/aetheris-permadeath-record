/*
 * Background rendering: sky, skyline layers, and rain.
 * Keeps gameplay untouched while modernizing scene lighting.
 */

import state from '../core/state.js';
import { BUILDING_BASE, VIRTUAL_HEIGHT, VIRTUAL_WIDTH } from '../config.js';

// Gradient caches — sky/haze depend only on viewport height + day/night flag.
// CanvasGradient objects are reusable between frames as long as the same ctx
// is bound. Cap entries to bound memory if viewport resizes a lot.
const skyCache = new Map();
const hazeCache = new Map();
const GRADIENT_CACHE_CAP = 16;

function cacheTrim(map) {
    if (map.size <= GRADIENT_CACHE_CAP) return;
    const firstKey = map.keys().next().value;
    map.delete(firstKey);
}

function getSkyGradient(ctx, viewH, isSun) {
    const key = `${viewH}|${isSun ? 1 : 0}`;
    let grad = skyCache.get(key);
    if (grad) return grad;

    grad = ctx.createLinearGradient(0, 0, 0, viewH);
    if (isSun) {
        grad.addColorStop(0, '#13081f');
        grad.addColorStop(0.36, '#42104e');
        grad.addColorStop(0.72, '#9f2b59');
        grad.addColorStop(1, '#f47d63');
    } else {
        grad.addColorStop(0, '#020617');
        grad.addColorStop(0.36, '#0f2041');
        grad.addColorStop(1, '#2a2f63');
    }

    skyCache.set(key, grad);
    cacheTrim(skyCache);
    return grad;
}

function getHazeGradient(ctx, horizonY, viewH, isSun) {
    const key = `${horizonY}|${viewH}|${isSun ? 1 : 0}`;
    let grad = hazeCache.get(key);
    if (grad) return grad;

    grad = ctx.createLinearGradient(0, horizonY - 40, 0, viewH);
    grad.addColorStop(0, isSun ? 'rgba(255, 115, 150, 0.15)' : 'rgba(85, 125, 240, 0.12)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0.76)');

    hazeCache.set(key, grad);
    cacheTrim(hazeCache);
    return grad;
}

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
    const quality = state.performance?.quality || 1;
    const hue = (state.game.dist / 120) % 360;
    const gridColor = `hsla(${hue}, 90%, 58%, 0.24)`;
    const midColor = `hsla(${hue}, 85%, 52%, 0.12)`;
    const xStep = detailScale < 1 ? 72 : 48;

    ctx.save();
    ctx.strokeStyle = gridColor;
    ctx.shadowBlur = quality >= 0.88 ? (detailScale < 1 ? 9 : 16) : 0;
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

    ctx.fillStyle = getSkyGradient(ctx, viewH, isSun);
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

    ctx.fillStyle = getHazeGradient(ctx, horizonY, viewH, isSun);
    ctx.fillRect(0, horizonY - 40, viewW, viewH - horizonY + 40);

    drawSkyGrid(ctx, state.game.started ? 1 : 0.6, viewW, viewH, horizonY);
}

function drawBuildingRoof(ctx, building, roofX, roofY, roofW, accent, glow, quality) {
    const topY = roofY;
    const mainW = roofW;

    ctx.save();

    // Linha brilhante no topo do prédio.
    ctx.strokeStyle = accent;
    ctx.lineWidth = 1;
    ctx.shadowBlur = quality >= 0.9 ? 5 : 0;
    ctx.shadowColor = glow;
    ctx.beginPath();
    ctx.moveTo(roofX + 3, topY + 0.5);
    ctx.lineTo(roofX + mainW - 3, topY + 0.5);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Antena principal: mastro fino, mais alto, com 2-3 cross-beams.
    if (quality >= 0.72) {
        const beaconX = roofX + (mainW * (building.beaconOffset || 0.5));
        const antennaH = building.antennaHeight || 50;
        const beaconY = topY - antennaH;

        ctx.strokeStyle = 'rgba(150, 180, 220, 0.6)';
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        ctx.moveTo(beaconX, topY + 1);
        ctx.lineTo(beaconX, beaconY);
        ctx.stroke();

        // Cross-beams horizontais (2 níveis na parte superior do mastro).
        const beam1Y = beaconY + antennaH * 0.18;
        const beam2Y = beaconY + antennaH * 0.36;
        ctx.strokeStyle = 'rgba(150, 180, 220, 0.42)';
        ctx.lineWidth = 0.9;
        ctx.beginPath();
        ctx.moveTo(beaconX - 4, beam1Y);
        ctx.lineTo(beaconX + 4, beam1Y);
        ctx.moveTo(beaconX - 6, beam2Y);
        ctx.lineTo(beaconX + 6, beam2Y);
        ctx.stroke();

        // Beacon piscante (vermelho aviação) — só em ~55% dos prédios.
        if (building.beacon) {
            const beaconPulse = 0.45 + (Math.sin((state.game.frames * 0.05) + building.windowPhase) * 0.5);
            ctx.fillStyle = 'rgba(255, 80, 110, 0.95)';
            ctx.shadowBlur = quality >= 0.88 ? 12 : 0;
            ctx.shadowColor = 'rgba(255, 80, 110, 0.75)';
            ctx.beginPath();
            ctx.arc(beaconX, beaconY, 1.8 + (beaconPulse * 1.2), 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
        } else {
            // Pontinho cyan inerte no topo (sem piscar).
            ctx.fillStyle = 'rgba(170, 220, 255, 0.7)';
            ctx.fillRect(beaconX - 0.6, beaconY - 0.6, 1.6, 1.6);
        }
    }

    // Antenas laterais menores (presentes em ~30% dos prédios).
    if (quality >= 0.78 && Array.isArray(building.extraAntennas)) {
        ctx.strokeStyle = 'rgba(120, 150, 190, 0.45)';
        ctx.lineWidth = 0.9;
        for (let k = 0; k < building.extraAntennas.length; k++) {
            const ant = building.extraAntennas[k];
            const antX = roofX + (mainW * ant.offset);
            const antTop = topY - ant.height;
            ctx.beginPath();
            ctx.moveTo(antX, topY + 1);
            ctx.lineTo(antX, antTop);
            ctx.stroke();
            // Mini-luz cyan no topo
            ctx.fillStyle = 'rgba(140, 220, 255, 0.7)';
            ctx.fillRect(antX - 0.6, antTop - 0.6, 1.4, 1.4);
        }
    }

    ctx.restore();
}


/**
 * Desenha um letreiro vertical lateral no prédio (estilo anúncio de néon
 * em fachada de Hong Kong / Blade Runner). Os "caracteres" são blocos
 * coloridos com flicker leve — sugerem texto sem desenhar texto real.
 */
function drawBuildingSigns(ctx, building, x, quality) {
    if (quality < 0.78 || !building.sign) return;
    const sign = building.sign;
    const signX = x + building.w * sign.offsetX;
    const signTop = building.y + building.h * sign.offsetTop;
    const signH = building.h * sign.heightFraction;
    const signW = sign.width;

    ctx.save();

    // Painel escuro de fundo da placa.
    ctx.fillStyle = 'rgba(8, 12, 26, 0.86)';
    ctx.fillRect(signX, signTop, signW, signH);

    // Borda neon brilhante.
    ctx.strokeStyle = sign.color;
    ctx.lineWidth = 0.9;
    ctx.shadowBlur = quality >= 0.88 ? 8 : 4;
    ctx.shadowColor = sign.color;
    ctx.strokeRect(signX, signTop, signW, signH);
    ctx.shadowBlur = 0;

    // "Caracteres" — barras horizontais coloridas com flicker leve.
    const charH = 4;
    const charSpacing = 6;
    const totalChars = Math.floor((signH - 6) / charSpacing);
    const frames = state.game.frames;

    for (let i = 0; i < totalChars; i++) {
        const charY = signTop + 4 + (i * charSpacing);
        if (charY + charH > signTop + signH - 3) break;
        // Hash determinístico por caractere — alguns ficam fixos, outros piscam.
        const charSeed = ((sign.seed * 31) + i * 137) | 0;
        const slot = ((charSeed % 10) + 10) % 10;
        // ~70% dos chars sempre visíveis, ~30% piscam suavemente
        let alpha = 0.85;
        if (slot < 3) {
            const flickerPhase = frames * sign.blinkSpeed + (charSeed * 0.07);
            alpha = 0.4 + 0.55 * (Math.sin(flickerPhase) * 0.5 + 0.5);
        }
        ctx.fillStyle = sign.color;
        ctx.globalAlpha = alpha;
        ctx.fillRect(signX + 1.5, charY, signW - 3, charH);
    }

    ctx.globalAlpha = 1;
    ctx.restore();
}

/**
 * Constrói o path da silhueta do prédio. No estilo Blade Runner / Cloudpunk
 * a forma é simples (retângulo alto) — a personalidade vem das texturas,
 * janelas e antenas, não da silhueta exótica.
 *
 * Retorna { roofX, roofY, roofW, topMost } pra `drawBuildingRoof` saber
 * onde fixar a linha luminosa e a antena beacon.
 */
function buildBuildingSilhouette(ctx, building, x) {
    const skylineClass = building.skylineClass || 'block';
    const bodyTop = building.y;
    const bodyBottom = building.y + building.h;
    const bodyLeft = x;
    const bodyRight = x + building.w;

    ctx.beginPath();

    if (skylineClass === 'stacked') {
        // Degrau central pequeno acima do body — como um terraço/heliporto
        // baixinho. Discreto, sem virar "cubo flutuante".
        const stepW = Math.max(40, Math.min(building.w * 0.5, building.w - 32));
        const stepH = Math.max(12, Math.min(28, building.h * 0.05));
        const stepLeft = bodyLeft + (building.w - stepW) * 0.5;
        const stepRight = stepLeft + stepW;
        const stepTop = bodyTop - stepH;

        ctx.moveTo(bodyLeft, bodyBottom);
        ctx.lineTo(bodyLeft, bodyTop);
        ctx.lineTo(stepLeft, bodyTop);
        ctx.lineTo(stepLeft, stepTop);
        ctx.lineTo(stepRight, stepTop);
        ctx.lineTo(stepRight, bodyTop);
        ctx.lineTo(bodyRight, bodyTop);
        ctx.lineTo(bodyRight, bodyBottom);
        ctx.closePath();

        return {
            roofX: stepLeft,
            roofY: stepTop,
            roofW: stepW,
            topMost: stepTop
        };
    }

    if (skylineClass === 'spire') {
        // Cantos superiores chanfrados em diagonal — silhueta de torre
        // brutalista. Sem topo acrescido, só uma "mordida" nos cantos.
        const chamfer = Math.max(10, Math.min(28, building.w * 0.16));

        ctx.moveTo(bodyLeft, bodyBottom);
        ctx.lineTo(bodyLeft, bodyTop + chamfer);
        ctx.lineTo(bodyLeft + chamfer, bodyTop);
        ctx.lineTo(bodyRight - chamfer, bodyTop);
        ctx.lineTo(bodyRight, bodyTop + chamfer);
        ctx.lineTo(bodyRight, bodyBottom);
        ctx.closePath();

        return {
            roofX: bodyLeft + chamfer,
            roofY: bodyTop,
            roofW: building.w - (chamfer * 2),
            topMost: bodyTop
        };
    }

    // 'block' — retângulo simples (50% dos prédios).
    ctx.rect(bodyLeft, bodyTop, building.w, building.h);

    return {
        roofX: bodyLeft,
        roofY: bodyTop,
        roofW: building.w,
        topMost: bodyTop
    };
}

// Paleta de cores de janelas no estilo Blade Runner. Algumas janelas
// "raras" pegam o âmbar quente (apartamentos / interiores iluminados),
// dando vida e variação cromática à fachada.
const WINDOW_AMBER_CORE = 'rgba(255, 196, 110, 0.7)';
const WINDOW_AMBER_HOT = 'rgba(255, 232, 178, 0.95)';
const WINDOW_DIM = 'rgba(28, 36, 60, 0.5)';

// Hash determinístico (32-bit fnv-ish) por janela: cor e estado on/off
// não mudam ao longo do tempo, eliminando o "blink em massa".
function windowHash(buildingX, wx, wy) {
    let h = (buildingX * 1009) ^ (wx * 73) ^ (wy * 131);
    h = ((h | 0) ^ ((h >>> 13) * 1597)) | 0;
    return ((h % 1000) + 1000) % 1000;
}

function pickWindowPalette(hash, defaultCore, defaultHot) {
    // ~12% das janelas viram âmbar.
    const slot = hash % 16;
    if (slot === 0 || slot === 7) return { core: WINDOW_AMBER_CORE, hot: WINDOW_AMBER_HOT, isAmber: true };
    return { core: defaultCore, hot: defaultHot, isAmber: false };
}

// Brilho que respira lentamente (período ~9s). Variação minúscula (±8%)
// para movimento quase imperceptível.
function softBreathe(hash, frames) {
    const phase = hash * 0.0063;
    return 0.92 + 0.08 * Math.sin((frames * 0.012) + phase);
}

function drawBuildingWindows(ctx, building, x, quality, frameBucket, flashBoost, windowCore, windowHot) {
    const densityRatio = Math.min(1, Math.max(0.5, building.windowDensity || 1));
    // Fração de janelas acesas (estática por janela). Densidade do prédio
    // empurra entre 38% e 55% — cidade noturna real, com prédios meio
    // vazios. Ignora flashBoost para evitar "piscadão em massa".
    const litFraction = 38 + Math.floor(densityRatio * 17);  // 38..55
    const frames = state.game.frames;

    if (building.pattern === 'grid') {
        // Passo maior → janelas espaçadas, sem virar parede de luz.
        for (let wy = building.y + 14; wy < building.y + building.h - 18; wy += 16) {
            for (let wx = 8; wx < building.w - 12; wx += 13) {
                const hash = windowHash(building.x, wx, wy);
                const isLit = (hash % 100) < litFraction;
                if (!isLit) {
                    ctx.fillStyle = WINDOW_DIM;
                    ctx.globalAlpha = 0.32 * building.opacity;
                    ctx.fillRect(x + wx, wy, 5, 7);
                    continue;
                }
                const palette = pickWindowPalette(hash, windowCore, windowHot);
                const breathe = softBreathe(hash, frames);
                ctx.fillStyle = palette.core;
                ctx.globalAlpha = Math.min(0.92, ((0.32 * building.opacity) + 0.34) * breathe);
                ctx.fillRect(x + wx, wy, 5, 7);
                if (palette.isAmber) {
                    ctx.fillStyle = palette.hot;
                    ctx.globalAlpha *= 0.65;
                    ctx.fillRect(x + wx, wy, 5, 2);
                }
            }
        }
        return;
    }

    if (building.pattern === 'stripes') {
        for (let wy = building.y + 16; wy < building.y + building.h - 22; wy += 18) {
            for (let wx = 10; wx < building.w - 14; wx += 16) {
                const hash = windowHash(building.x, wx, wy);
                const isLit = (hash % 100) < litFraction;
                if (!isLit) {
                    ctx.fillStyle = WINDOW_DIM;
                    ctx.globalAlpha = 0.3 * building.opacity;
                    ctx.fillRect(x + wx, wy, 10, 4);
                    continue;
                }
                const palette = pickWindowPalette(hash, windowCore, windowHot);
                const breathe = softBreathe(hash, frames);
                ctx.fillStyle = palette.core;
                ctx.globalAlpha = Math.min(0.9, ((0.3 * building.opacity) + 0.32) * breathe);
                ctx.fillRect(x + wx, wy, 10, 4);
            }
        }
        return;
    }

    if (building.pattern === 'bars') {
        for (let wx = 10; wx < building.w - 14; wx += 16) {
            for (let wy = building.y + 16; wy < building.y + building.h - 22; wy += 18) {
                const hash = windowHash(building.x, wx, wy);
                const isLit = (hash % 100) < litFraction;
                if (!isLit) {
                    ctx.fillStyle = WINDOW_DIM;
                    ctx.globalAlpha = 0.3 * building.opacity;
                    ctx.fillRect(x + wx, wy, 6, 8);
                    continue;
                }
                const palette = pickWindowPalette(hash, windowCore, windowHot);
                const breathe = softBreathe(hash, frames);
                ctx.fillStyle = palette.core;
                ctx.globalAlpha = Math.min(0.9, ((0.3 * building.opacity) + 0.32) * breathe);
                ctx.fillRect(x + wx, wy, 6, 8);
                if (palette.isAmber) {
                    ctx.fillStyle = palette.hot;
                    ctx.globalAlpha *= 0.6;
                    ctx.fillRect(x + wx, wy, 6, 2);
                }
            }
        }
        return;
    }

    // 'slits' — fendas horizontais largas.
    const inset = Math.max(10, building.w * 0.1);
    for (let wy = building.y + 14; wy < building.y + building.h - 18; wy += 18) {
        const hash = windowHash(building.x, 0, wy);
        const isLit = (hash % 100) < litFraction;
        if (!isLit) {
            ctx.fillStyle = WINDOW_DIM;
            ctx.globalAlpha = 0.3 * building.opacity;
            ctx.fillRect(x + inset, wy, building.w - (inset * 2), 3);
            continue;
        }
        const palette = pickWindowPalette(hash, windowCore, windowHot);
        const breathe = softBreathe(hash, frames);
        ctx.fillStyle = palette.core;
        ctx.globalAlpha = Math.min(0.88, ((0.3 * building.opacity) + 0.3) * breathe);
        ctx.fillRect(x + inset, wy, building.w - (inset * 2), 3);
        if (palette.isAmber) {
            ctx.fillStyle = palette.hot;
            ctx.globalAlpha *= 0.55;
            ctx.fillRect(x + inset, wy, (building.w - (inset * 2)) * 0.3, 1.5);
        }
    }
}

// ---------------------------------------------------------------------------
// Cache de gradientes de prédios
//
// bodyGrad, sideGloss, fade e neonStrip são independentes de posição X —
// só dependem de dimensões e paleta. Criamos cada um uma única vez e
// reutilizamos nos frames seguintes, eliminando 80-200 alocações GPU/frame.
// Invalidamos apenas quando o prédio reposiciona (x muda após wrap).
// ---------------------------------------------------------------------------
function getBuildingBodyGrad(ctx, building, x, topMost) {
    const h = building.h;
    const cache = building._bodyGradCache;
    if (cache && cache.h === h && cache.topMost === topMost && cache.x === x) return cache.grad;
    const grad = ctx.createLinearGradient(x, topMost - 20, x, building.y + h);
    grad.addColorStop(0, '#161b3a');
    grad.addColorStop(0.18, '#0f1330');
    grad.addColorStop(0.42, BUILDING_BASE.body);
    grad.addColorStop(1, 'rgba(1, 1, 7, 0.98)');
    building._bodyGradCache = { h, topMost, x, grad };
    return grad;
}

function getBuildingSideGloss(ctx, building, x) {
    const w = building.w;
    const cache = building._sideGlossCache;
    if (cache && cache.w === w && cache.x === x) return cache.grad;
    const grad = ctx.createLinearGradient(x, 0, x + w, 0);
    grad.addColorStop(0, 'rgba(120, 226, 255, 0.14)');
    grad.addColorStop(0.12, 'rgba(255, 126, 206, 0.06)');
    grad.addColorStop(0.48, 'rgba(0, 0, 0, 0)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0.24)');
    building._sideGlossCache = { w, x, grad };
    return grad;
}

function getBuildingFadeGrad(ctx, building) {
    const h = building.h;
    const y = building.y;
    const cache = building._fadeGradCache;
    if (cache && cache.h === h && cache.y === y) return cache.grad;
    const grad = ctx.createLinearGradient(0, y + h * 0.7, 0, y + h);
    grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0.35)');
    building._fadeGradCache = { h, y, grad };
    return grad;
}

function getBuildingNeonStripGrad(ctx, building, stripX) {
    // neonStrip depende só da posição X do strip e altura — cacheia por strip index
    if (!building._neonStripGrads) building._neonStripGrads = [];
    return null; // gradiente inline mais rápido que cache por índice; deixamos inline
}

// ---------------------------------------------------------------------------
// Offscreen canvas para janelas de prédios
//
// drawBuildingWindows é o segundo maior custo: 400-2000 fillRect por frame.
// Renderizamos as janelas num OffscreenCanvas por prédio e só o atualizamos
// quando o conteúdo muda (flicker staggered 1x por 12 frames por prédio).
// Cada frame fazemos 1 drawImage em vez de centenas de fillRect.
// ---------------------------------------------------------------------------
const WINDOW_UPDATE_INTERVAL = 12;

function getWindowCanvas(building) {
    const w = Math.ceil(building.w);
    const h = Math.ceil(building.h);
    if (!building._winCanvas || building._winCanvas.width !== w || building._winCanvas.height !== h) {
        building._winCanvas = typeof OffscreenCanvas !== 'undefined'
            ? new OffscreenCanvas(w, h)
            : (() => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; })();
        building._winCtx = building._winCanvas.getContext('2d');
        building._winDirty = true;
    }
    return building._winCanvas;
}

function updateWindowCanvas(building, quality, frameBucket, flashBoost, windowCore, windowHot, cyanCore, cyanHot, magentaCore, magentaHot) {
    const wCanvas = getWindowCanvas(building);
    const wCtx = building._winCtx;
    const frames = state.game.frames;
    const offset = building._winFlickerOffset || 0;
    const needsUpdate = building._winDirty || (frames % WINDOW_UPDATE_INTERVAL === offset);
    if (!needsUpdate) return;
    building._winDirty = false;

    wCtx.clearRect(0, 0, wCanvas.width, wCanvas.height);

    // Redraw no sistema de coordenadas LOCAL do canvas (origem = building.x, building.y)
    const localBuilding = { ...building, x: 0, y: 0 };
    const wc = building.windowPalette === 'mixed'
        ? (frameBucket % 2 === 0 ? cyanCore : magentaCore)
        : windowCore;
    const wh = building.windowPalette === 'mixed'
        ? (frameBucket % 2 === 0 ? cyanHot : magentaHot)
        : windowHot;

    drawBuildingWindows(wCtx, localBuilding, 0, quality, frameBucket, flashBoost, wc, wh);
}

export function drawLayer(layer, camX) {
    const ctx = state.ctx;
    const quality = state.performance?.quality || 1;
    const { viewW } = getViewMetrics();
    const layerTone = Math.round(272 + (Math.sin((state.game.dist * 0.0018) + (layer.length * 0.17)) * 8));
    const lastBuilding = layer[layer.length - 1];
    const layerSpan = lastBuilding
        ? Math.max(2000, lastBuilding.x + lastBuilding.w + 260)
        : 2000;

    const cyanCore = 'rgba(74, 235, 255, 0.32)';
    const cyanHot = 'rgba(196, 255, 255, 0.72)';
    const magentaCore = 'rgba(255, 86, 176, 0.3)';
    const magentaHot = 'rgba(255, 190, 228, 0.68)';
    const frameBucket = Math.floor(state.game.frames / 14);

    layer.forEach(building => {
        const relativeX = building.x - (camX * building.parallax);
        let x = relativeX % layerSpan;
        if (x < (-building.w - 120)) x += layerSpan;
        if (x > viewW + 140 || x + building.w < -140) return;

        const hue = (layerTone + (building.accentShift || 0) + 360) % 360;
        const accent = `hsla(${(hue + 22) % 360}, 100%, 66%, 0.6)`;
        const glow = `hsla(${(hue + 12) % 360}, 100%, 62%, 0.28)`;
        const windowCore = building.windowPalette === 'magenta' ? magentaCore : cyanCore;
        const windowHot = building.windowPalette === 'magenta' ? magentaHot : cyanHot;
        const buildingAlpha = 0.34 + (building.opacity * 0.4);

        ctx.save();
        ctx.globalAlpha = buildingAlpha;

        const { roofX, roofY, roofW, topMost } = buildBuildingSilhouette(ctx, building, x);

        // Gradientes de corpo cached por prédio — sem alocação recorrente
        ctx.fillStyle = getBuildingBodyGrad(ctx, building, x, topMost);
        ctx.fill();
        ctx.fillStyle = getBuildingSideGloss(ctx, building, x);
        ctx.fill();

        // Rim light sem clip — substituímos o clip por fillRect simples com
        // gradiente horizontal, que produz o mesmo efeito visual. Elimina
        // o custo de stencil (ctx.clip + ctx.restore) por prédio.
        if (quality >= 0.82 && building.parallax > 0.25) {
            const rimColor = building.windowPalette === 'magenta'
                ? 'rgba(255, 130, 200, 0.55)'
                : 'rgba(140, 230, 255, 0.55)';
            // Cache do rimGrad por prédio (depende apenas de x e paleta)
            const rimKey = `${x}|${building.windowPalette}`;
            if (!building._rimGradCache || building._rimGradCache.key !== rimKey) {
                const rimGrad = ctx.createLinearGradient(x, 0, x + 7, 0);
                rimGrad.addColorStop(0, rimColor);
                rimGrad.addColorStop(1, 'rgba(0,0,0,0)');
                building._rimGradCache = { key: rimKey, grad: rimGrad };
            }
            ctx.globalAlpha = 0.32;
            ctx.fillStyle = building._rimGradCache.grad;
            ctx.fillRect(x, building.y - 60, 7, building.h + 80);
            ctx.globalAlpha = buildingAlpha;
        }

        // Contorno — shadowBlur batched: setamos uma vez, desenhamos todos
        // de uma vez ao final do forEach (aqui mantemos inline pois é um
        // stroke por prédio, o custo de toggle já é mínimo com apenas 1 set).
        ctx.strokeStyle = accent;
        ctx.lineWidth = 1;
        ctx.shadowBlur = quality >= 0.88 ? 4 : 0;
        ctx.shadowColor = glow;
        ctx.stroke();
        ctx.shadowBlur = 0;

        if (quality >= 0.82) {
            const ribCount = Math.max(2, Math.floor(building.w / 54));
            ctx.globalAlpha = 0.16;
            ctx.strokeStyle = 'rgba(150, 220, 255, 0.2)';
            ctx.beginPath();
            for (let rib = 1; rib <= ribCount; rib++) {
                const ribX = x + ((building.w / (ribCount + 1)) * rib);
                ctx.moveTo(ribX, building.y + 6);
                ctx.lineTo(ribX, building.y + building.h);
            }
            ctx.stroke();
            ctx.globalAlpha = buildingAlpha;
        }

        if (quality >= 0.78 && building.parallax > 0.3) {
            ctx.fillStyle = 'rgba(80, 130, 180, 0.5)';
            ctx.globalAlpha = 0.07;
            const floorEnd = building.y + building.h - 12;
            for (let fy = building.y + 22; fy < floorEnd; fy += 32) {
                ctx.fillRect(x + 4, fy, building.w - 8, 1);
            }
            ctx.globalAlpha = buildingAlpha;
        }

        drawBuildingRoof(ctx, building, roofX, roofY, roofW, accent, glow, quality);

        // Janelas via offscreen canvas — 1 drawImage em vez de 400-2000 fillRect
        if (quality >= 0.72) {
            const flashBoost = building.flashTimer > 0 ? ((building.flashTimer / 10) * 0.22) : 0;
            if (!building._winFlickerOffset) {
                building._winFlickerOffset = (building.x * 7 + building.w * 3) % WINDOW_UPDATE_INTERVAL;
            }
            updateWindowCanvas(building, quality, frameBucket, flashBoost, windowCore, windowHot, cyanCore, cyanHot, magentaCore, magentaHot);
            ctx.globalAlpha = buildingAlpha;
            ctx.drawImage(building._winCanvas, x, building.y);
        }

        ctx.globalAlpha = 1;
        drawBuildingSigns(ctx, building, x, quality);
        ctx.globalAlpha = buildingAlpha;

        if (quality >= 0.78 && Array.isArray(building.neonStrips)) {
            ctx.globalAlpha = 0.22;
            for (let s = 0; s < building.neonStrips.length; s++) {
                const stripX = x + (building.w * building.neonStrips[s]);
                const stripGrad = ctx.createLinearGradient(stripX, building.y, stripX, building.y + building.h);
                stripGrad.addColorStop(0, 'rgba(255, 105, 194, 0.7)');
                stripGrad.addColorStop(0.45, 'rgba(100, 237, 255, 0.34)');
                stripGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
                ctx.strokeStyle = stripGrad;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(stripX, building.y + 8);
                ctx.lineTo(stripX, building.y + building.h - 12);
                ctx.stroke();
            }
        }

        ctx.globalAlpha = 1;
        ctx.fillStyle = accent;
        ctx.globalAlpha = 0.12;
        const panelH = Math.min(36, building.h * 0.15);
        ctx.fillRect(x + 8, building.y + building.h * 0.42, building.w * 0.18, panelH);
        ctx.fillRect(x + building.w * 0.62, building.y + building.h * 0.24, building.w * 0.14, panelH * 0.72);
        ctx.fillRect(x + building.w * 0.28, building.y + building.h * 0.58, building.w * 0.1, panelH * 0.62);

        ctx.fillStyle = getBuildingFadeGrad(ctx, building);
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
