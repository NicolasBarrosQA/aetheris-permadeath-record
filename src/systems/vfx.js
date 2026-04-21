import state from '../core/state.js';
import { BOOST_TYPES, VIRTUAL_HEIGHT, VIRTUAL_WIDTH } from '../config.js';
import { getBoostSprite } from '../core/boostSprites.js';

function getViewMetrics() {
    const viewW = state.view?.worldWidth || VIRTUAL_WIDTH;
    const viewH = state.view?.worldHeight || VIRTUAL_HEIGHT;

    return {
        viewW,
        viewH
    };
}

export function drawBoostPickup(ctx, boost) {
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

export function drawScreenPostFX() {
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

    ctx.globalAlpha = 0.07 + motionEffect * 0.05;
    ctx.fillStyle = `rgba(88, 215, 255, ${0.24 + pulse * 0.1})`;
    ctx.fillRect(0, 0, 3, viewH);
    ctx.fillStyle = 'rgba(255, 103, 163, 0.28)';
    ctx.fillRect(viewW - 3, 0, 3, viewH);
    ctx.globalAlpha = 1;
    ctx.restore();
}
