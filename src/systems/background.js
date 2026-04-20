/*
 * Rotinas de desenho do fundo e das camadas de prédios, além da chuva.
 * Não altera estado global além de ler de state; apenas desenha no
 * contexto gráfico configurado em state.ctx.
 */

import state from '../core/state.js';
import { BUILDING_BASE, VIRTUAL_HEIGHT, VIRTUAL_WIDTH } from '../config.js';

/**
 * Desenha o céu com gradiente dinâmico, sol ou lua, estrelas e horizon.
 */
export function drawBackground() {
    const ctx = state.ctx;
    const cycleProg = state.game.time || 0;
    const isSun = cycleProg < 0.5;
    const phase = isSun ? (cycleProg / 0.5) : ((cycleProg - 0.5) / 0.5);
    const celestialX = 60 + phase * 780;
    const celestialY = 520 - Math.sin(phase * Math.PI) * 320;
    // céu
    let grad = ctx.createLinearGradient(0, 0, 0, 600);
    if (isSun) {
        grad.addColorStop(0, '#2b0d3d');
        grad.addColorStop(0.4, '#611258');
        grad.addColorStop(1, '#ff6b3d');
    } else {
        grad.addColorStop(0, '#040712');
        grad.addColorStop(1, '#071327');
    }
    // Não redefinimos a transformação aqui; ela já é definida no
    // início de drawGame(). Mantém-se a matriz atual para preservar
    // o devicePixelRatio aplicado pelo motor.
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);
    // corpo celeste
    ctx.save();
    if (isSun) {
        const rOuter = 70;
        ctx.save();
        ctx.beginPath();
        ctx.arc(celestialX, celestialY, rOuter, 0, Math.PI * 2);
        ctx.clip();
        let sunGrad = ctx.createLinearGradient(celestialX, celestialY - rOuter, celestialX, celestialY + rOuter);
        sunGrad.addColorStop(0, '#ffef9f');
        sunGrad.addColorStop(0.35, '#ff7f6e');
        sunGrad.addColorStop(1, '#ff1f80');
        ctx.fillStyle = sunGrad;
        ctx.fillRect(celestialX - rOuter, celestialY - rOuter, rOuter * 2, rOuter * 2);
        ctx.fillStyle = 'rgba(0,0,0,0.18)';
        for (let y = celestialY - rOuter; y < celestialY + rOuter; y += 14) {
            ctx.fillRect(celestialX - rOuter, y, rOuter * 2, 6);
        }
        ctx.restore();
        ctx.shadowBlur = 16;
        ctx.shadowColor = '#ff3f8c';
        ctx.strokeStyle = 'rgba(255, 200, 120, 0.45)';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(celestialX, celestialY, rOuter + 4, 0, Math.PI * 2);
        ctx.stroke();
    } else {
        const rOuter = 60;
        ctx.save();
        ctx.beginPath();
        ctx.arc(celestialX, celestialY, rOuter, 0, Math.PI * 2);
        ctx.clip();
        let moonGrad = ctx.createLinearGradient(celestialX, celestialY - rOuter, celestialX, celestialY + rOuter);
        moonGrad.addColorStop(0, '#e0f7ff');
        moonGrad.addColorStop(1, '#7ad1ff');
        ctx.fillStyle = moonGrad;
        ctx.fillRect(celestialX - rOuter, celestialY - rOuter, rOuter * 2, rOuter * 2);
        ctx.fillStyle = 'rgba(0,0,0,0.12)';
        for (let y = celestialY - rOuter; y < celestialY + rOuter; y += 14) {
            ctx.fillRect(celestialX - rOuter, y, rOuter * 2, 6);
        }
        ctx.restore();
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#9fd9ff';
        ctx.strokeStyle = 'rgba(150, 220, 255, 0.6)';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.arc(celestialX, celestialY, rOuter + 5, 0, Math.PI * 2);
        ctx.stroke();
    }
    ctx.restore();
    ctx.shadowBlur = 0;
    // estrelas
    let starOpac = isSun ? 0.2 : 0.9;
    ctx.fillStyle = '#fff';
    state.stars.forEach(s => {
        ctx.globalAlpha = Math.abs(Math.sin(state.game.frames * 0.05 + s.blink)) * starOpac;
        ctx.fillRect(s.x, s.y, s.size, s.size);
    });
    ctx.globalAlpha = 1;
    // horizonte
    let horizonGrad = ctx.createLinearGradient(0, 380, 0, 600);
    if (isSun) {
        horizonGrad.addColorStop(0, 'rgba(255,120,160,0.25)');
        horizonGrad.addColorStop(1, 'rgba(40,0,30,0.75)');
    } else {
        horizonGrad.addColorStop(0, 'rgba(80,160,255,0.08)');
        horizonGrad.addColorStop(1, 'rgba(0,0,0,0.7)');
    }
    ctx.fillStyle = horizonGrad;
    ctx.fillRect(0, 380, 900, 220);
    // grade no chão
    let gridHue = (state.game.dist / 100) % 360;
    let gridColor = `hsla(${gridHue}, 100%, 55%, 0.35)`;
    ctx.strokeStyle = gridColor;
    ctx.shadowBlur = 12;
    ctx.shadowColor = `hsla(${gridHue}, 100%, 60%, 0.35)`;
    ctx.beginPath();
    for (let i = 0; i < 900; i += 50) {
        ctx.moveTo(i, 600);
        ctx.lineTo(450, 200);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;
}

/**
 * Desenha uma camada de prédios. A cor é modulada pela distância e
 * sincronizada com as plataformas. Parallax é aplicado via atributo
 * parallax dos objetos do layer.
 * @param {Array} layer Lista de prédios
 * @param {number} camX Posição X da câmera (para parallax)
 */
export function drawLayer(layer, camX) {
    const ctx = state.ctx;
    const hueBase = (state.game.dist / 100) % 360;
    layer.forEach(b => {
        let relativeX = b.x - (camX * b.parallax);
        let modX = relativeX % 2000;
        if (modX < -200) modX += 2000;
        const hue = hueBase;
        const accent = `hsla(${hue}, 100%, 60%, 0.45)`;
        const glow = `hsla(${hue}, 100%, 60%, 0.18)`;
        const windows = `hsla(${(hue + 20) % 360}, 100%, 70%, 0.16)`;
        const body = BUILDING_BASE.body;
        const buildingAlpha = 0.35 + b.opacity * 0.35;
        ctx.save();
        ctx.globalAlpha = buildingAlpha;
        let grad = ctx.createLinearGradient(modX, b.y, modX, b.y + b.h);
        grad.addColorStop(0, body);
        grad.addColorStop(0.1, body);
        grad.addColorStop(1, 'rgba(0,0,0,0.92)');
        ctx.fillStyle = grad;
        ctx.fillRect(modX, b.y, b.w, b.h);
        // borda neon
        ctx.strokeStyle = accent;
        ctx.lineWidth = 1;
        ctx.shadowBlur = 3;
        ctx.shadowColor = glow;
        ctx.strokeRect(modX + 1, b.y + 0.5, b.w - 2, b.h - 1);
        ctx.shadowBlur = 0;
        // janelas / padrão
        ctx.fillStyle = windows;
        ctx.globalAlpha = 0.4 * b.opacity + 0.2;
        if (b.pattern === 'grid') {
            for (let wy = b.y + 14; wy < b.y + b.h - 18; wy += 18) {
                for (let wx = 6; wx < b.w - 10; wx += 14) {
                    ctx.fillRect(modX + wx, wy, 6, 8);
                }
            }
        } else if (b.pattern === 'stripes') {
            for (let wy = b.y + 16; wy < b.y + b.h - 24; wy += 24) {
                ctx.fillRect(modX + 6, wy, b.w - 12, 3);
            }
        } else if (b.pattern === 'bars') {
            for (let wx = 8; wx < b.w - 8; wx += 18) {
                ctx.fillRect(modX + wx, b.y + 10, 6, b.h - 20);
            }
        } else {
            for (let wy = b.y + 12; wy < b.y + b.h - 16; wy += 26) {
                ctx.fillRect(modX + 10, wy, b.w - 20, 3);
            }
        }
        ctx.globalAlpha = 1;
        // painéis de destaque
        ctx.fillStyle = accent;
        ctx.globalAlpha = 0.12;
        let panelH = Math.min(36, b.h * 0.15);
        ctx.fillRect(modX + 6, b.y + b.h * 0.44, b.w * 0.22, panelH);
        ctx.fillRect(modX + b.w * 0.64, b.y + b.h * 0.26, b.w * 0.18, panelH * 0.7);
        ctx.globalAlpha = 1;
        if (b.flashTimer > 0) {
            ctx.fillStyle = glow;
            ctx.fillRect(modX + 5, b.y + 10, b.w - 10, 5);
        }
        // fade inferior
        let fade = ctx.createLinearGradient(0, b.y + b.h * 0.7, 0, b.y + b.h);
        fade.addColorStop(0, 'rgba(0,0,0,0)');
        fade.addColorStop(1, 'rgba(0,0,0,0.3)');
        ctx.fillStyle = fade;
        ctx.fillRect(modX, b.y + b.h * 0.7, b.w, b.h * 0.3);
        ctx.restore();
    });
}

/**
 * Desenha a chuva (gotas e respingos) usando composição additive. Deve ser
 * chamado fora da transformação de mundo para ficar em coordenadas da tela.
 */
export function drawRainBackground() {
    const ctx = state.ctx;
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.lineWidth = 1.1;
    state.rainDrops.forEach(r => {
        ctx.strokeStyle = `rgba(80, 170, 255, ${r.alpha * 0.7})`;
        ctx.beginPath();
        ctx.moveTo(r.x, r.y);
        ctx.lineTo(r.x - 2, r.y - r.len);
        ctx.stroke();
    });
    state.rainSplashes.forEach(s => {
        let lifeNorm = s.life / s.maxLife;
        ctx.strokeStyle = `rgba(120,180,255, ${0.25 * lifeNorm})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.spread * (1 - lifeNorm), Math.PI, 2 * Math.PI);
        ctx.stroke();
    });
    ctx.restore();
}
