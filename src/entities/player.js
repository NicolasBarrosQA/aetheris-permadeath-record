/*
 * Implementação da classe Player. Responsável pelo controle de movimento,
 * física, colisões, dash, salto duplo, dano e desenho do personagem.
 * A lógica foi transcrita fielmente do protótipo, apenas adaptando as
 * referências para acessar o estado global via módulo state e demais
 * dependências via import.
 */

import state from '../core/state.js';
import { PHYS, SKINS_DB, COIN_LABEL, BALANCE } from '../config.js';
import { storage, save } from '../core/storage.js';
import { SFX } from '../core/audio.js';
import { spawnParticles, spawnShockwave, spawnText } from '../systems/particles.js';
import { rectIntersect } from '../core/utils.js';
import { getSkinSprite } from '../core/sprites.js';

export default class Player {
    constructor() {
        this.x = 100;
        this.y = 300;
        this.w = 30;
        this.h = 50;
        this.vx = 0;
        this.vy = 0;
        this.maxHp = 100;
        this.hp = 100;
        this.jumps = 0;
        this.coyote = 0;
        this.jumpBuffer = 0;
        this.dashCd = 0;
        this.dashTimer = 0;
        this.attackCd = 0;
        this.invul = 0;
        this.facing = 1;
        this.isDashing = false;
        this.grounded = false;
        this.wasGrounded = false;
        this.stepTimer = 0;
        this.runCycle = 0;
        this.bodyBob = 0;
        this.lean = 0;
        this.updateSkin();
    }

    /**
     * Atualiza a skin equipada consultando o banco de skins e o estado de
     * persistência.
     */
    updateSkin() {
        this.skin = SKINS_DB.find(s => s.id === storage.currentSkinId) || SKINS_DB[0];
    }

    /**
     * Inicia um dash horizontal, aplicando velocidade e invulnerabilidade.
     */
    startDash() {
        this.isDashing = true;
        this.dashTimer = PHYS.dashDuration;
        this.invul = 15;
        this.vy = 0;
        this.vx = PHYS.dashSpeed * this.facing;
        SFX.dash();
        spawnShockwave(this.x + this.w / 2, this.y + this.h / 2, this.skin.glow);
        state.attackEffects.push({
            kind: 'dashBurst',
            x: this.x + this.w / 2,
            y: this.y + this.h / 2,
            radius: 14,
            color: this.skin.glow,
            alpha: 0.84,
            life: 8,
            growth: 5.6,
            fade: 0.74
        });
        state.camera.shake = 8;
    }

    /**
     * Atualiza a física e lida com entrada de controle. Chamado a cada
     * quadro pelo motor. Muitas variáveis globais são lidas através de
     * state.
     */
    update() {
        if (!state.game.running || state.game.shopOpen) return;

        const left = state.keys['arrowleft'] || state.keys['a'];
        const right = state.keys['arrowright'] || state.keys['d'];

        // Ajuste de velocidade em função da distância percorrida
        const distM = state.game.dist / 10;
        // Early boost cresce 0.2 a cada 500m, limitado a 1.0. Os valores
        // são configuráveis em BALANCE.speed.
        const ebInterval = BALANCE.speed.earlyBoostInterval;
        const ebStep = BALANCE.speed.earlyBoostStep;
        const ebMax = BALANCE.speed.earlyBoostMax;
        const earlyBoost = Math.min(Math.floor(distM / ebInterval) * ebStep, ebMax);
        // Extra boost começa após um certo ponto e cresce 0.05 a cada 1500m.
        const xAfter = BALANCE.speed.extraBoostAfter;
        const xInterval = BALANCE.speed.extraBoostInterval;
        const xStep = BALANCE.speed.extraBoostStep;
        const xMax = BALANCE.speed.extraBoostMax;
        const extraBoost = Math.min(Math.floor(Math.max(0, distM - xAfter) / xInterval) * xStep, xMax);
        const speedMult = 1 + earlyBoost + extraBoost;

        // Inicia corrida ao apertar seta/A/D antes do start
        if ((left || right) && !state.game.started) {
            if (typeof state.startGameRun === 'function') state.startGameRun();
        }

        // Decrementa coyote time e jump buffer
        this.coyote = Math.max(0, this.coyote - 1);
        this.jumpBuffer = Math.max(0, this.jumpBuffer - 1);

        // Captura da tecla de pulo (space / w / seta cima) convertida em flag
        if (state.keys['spacepress']) {
            this.jumpBuffer = PHYS.jumpBufferFrames;
            state.keys['spacepress'] = false;
        }

        // Aceleração horizontal
        const accel = (this.grounded ? PHYS.runAccel : PHYS.airAccel) * speedMult;
        if (right) {
            this.vx += accel;
            this.facing = 1;
        } else if (left) {
            if (state.game.started) {
                this.vx -= accel;
                this.facing = -1;
            }
        } else if (!this.isDashing) {
            // aplica fricção quando nenhuma direção é pressionada
            this.vx *= this.grounded ? PHYS.friction : PHYS.airFriction;
            if (Math.abs(this.vx) < 0.05) this.vx = 0;
        }

        // Limita velocidade horizontal de acordo com o estado (chão/ar) e dificuldade
        let maxSpeed = ((this.grounded ? PHYS.maxGroundSpeed : PHYS.maxAirSpeed) +
            (state.game.difficulty * (this.grounded ? 0.6 : 0.4))) * speedMult;

        if (!this.isDashing) {
            if (this.vx > maxSpeed) this.vx = maxSpeed;
            if (this.vx < -maxSpeed) this.vx = -maxSpeed;
        }

        // Dash manual (C ou Shift) quando disponível
        if (!state.cheatFlight &&
            (state.keys['c'] || state.keys['shift']) &&
            this.dashCd <= 0 &&
            !this.isDashing &&
            state.game.started) {
            this.startDash();
        }

        // Comportamento durante o dash
        if (this.dashTimer > 0 && !state.cheatFlight) {
            this.dashTimer--;
            this.vx = PHYS.dashSpeed * this.facing;
            this.vy = 0;

            if (state.game.frames % 2 === 0) {
                state.ghosts.push({
                    x: this.x,
                    y: this.y,
                    w: this.w,
                    h: this.h,
                    c: this.skin.c1,
                    alpha: 0.6,
                    life: 10
                });
            }

            if (this.dashTimer === 0) {
                this.isDashing = false;
                this.dashCd = PHYS.dashCooldown;
            }
        } else if (this.dashCd > 0) {
            this.dashCd--;
        }

        // Lógica de pulo com coyote time e jump buffer quando cheat não está ativo
        if (!state.cheatFlight) {
            if (this.jumpBuffer > 0 && (this.grounded || this.coyote > 0) && !this.isDashing) {
                this.vy = PHYS.jumpForce;
                this.grounded = false;
                this.jumps = 1;
                this.jumpBuffer = 0;
                SFX.jump();
                spawnParticles(this.x + this.w / 2, this.y + this.h, 8, this.skin.glow, 1);
            } else if (this.jumpBuffer > 0 && this.jumps < 2 && !this.isDashing) {
                this.vy = PHYS.doubleJumpForce;
                this.jumps++;
                this.jumpBuffer = 0;
                SFX.jump();
                spawnShockwave(this.x + this.w / 2, this.y + this.h / 2, this.skin.glow);
            }
        }

        // Ataque (Z) quando em tempo de recarga
        if (state.keys['z'] && this.attackCd <= 0 && state.game.started && !state.cheatFlight) {
            this.attack();
            this.attackCd = 18;
            SFX.swoosh();
        }

        if (this.attackCd > 0) this.attackCd--;
        if (this.invul > 0) this.invul--;

        // Gravidade ou movimento de voo livre
        if (!state.cheatFlight && !this.isDashing) {
            this.vy += PHYS.gravity;
        }

        if (state.cheatFlight) {
            const up = state.keys['arrowup'] || state.keys['w'];
            const down = state.keys['arrowdown'] || state.keys['s'];

            if (up) this.vy = -6;
            else if (down) this.vy = 6;
            else this.vy *= 0.8;

            this.grounded = false;
            this.coyote = 0;
        }

        // Armazena estado de chão do quadro anterior
        this.wasGrounded = this.grounded;
        this.grounded = false;

        // Atualiza posição
        this.x += this.vx;
        this.y += this.vy;

        // Mata se cair demais
        if (!state.cheatFlight && this.y > 820) this.takeDamage(100);

        // Atualiza distância percorrida e checa novo recorde em tempo real
        if (state.game.started && this.x > state.game.dist) {
            state.game.dist = Math.floor(this.x);
            if (state.game.dist > storage.highScore &&
                storage.highScore > 0 &&
                !state.game.newRecordReached) {
                state.game.newRecordReached = true;
                SFX.record();
                spawnText('NEW RECORD!', this.x, this.y - 80, '#ffd700');
                spawnParticles(this.x, this.y, 40, '#ffd700', 1);
            }
        }

        // Checa colisões com plataformas, moedas e inimigos
        this.checkCollisions();

        // Efeito de aterrissagem
        if (this.grounded && !this.wasGrounded) {
            spawnParticles(this.x + this.w / 2, this.y + this.h, 12, '#7cfbff', 1);
        }

        // Efeito de rastro quando se move rápido (agora também no ar)
        const horizontalSpeed = Math.abs(this.vx);
        const movingFast = !state.cheatFlight &&
            horizontalSpeed > 0.6 &&
            !this.isDashing;

        if (movingFast) {
            this.runCycle += 0.08 * horizontalSpeed;
            this.bodyBob = 0;
            this.lean = 0;
            this.stepTimer = Math.max(0, this.stepTimer - 1);

            if (this.stepTimer === 0) {
                this.spawnRunTrail(horizontalSpeed);
                this.stepTimer = Math.max(1, 6 - Math.floor(horizontalSpeed));
            }
        } else {
            this.stepTimer = 0;
            this.runCycle *= 0.9;
            this.bodyBob = 0;
            this.lean = 0;
        }

        // Aplica caps absolutos de velocidade. Estes limites são
        // definidos em BALANCE.speed e são aplicados após todos os
        // multiplicadores e fricções. O dash ignora esses caps.
        if (!this.isDashing) {
            const cap = this.grounded ? BALANCE.speed.maxGroundSpeed : BALANCE.speed.maxAirSpeed;
            if (this.vx > cap) this.vx = cap;
            if (this.vx < -cap) this.vx = -cap;
        }
    }

    /**
     * Gera um rastro atrás do jogador enquanto corre. Usa a cor da skin.
     * @param {number} horizontalSpeed Velocidade horizontal atual
     */
    spawnRunTrail(horizontalSpeed) {
        const tailLen = 18 + Math.min(horizontalSpeed * 1.8, 16);
        const tailH = this.h;
        const gap = 6;
        const baseY = this.y;
        const anchorX = this.facing === 1 ? this.x - gap : this.x + this.w + gap;
        const intensity = 0.2 + Math.min(horizontalSpeed * 0.015, 0.12);
        const tailColor = this.skin.glow || this.skin.c1;

        state.particles.push({
            trail: true,
            dir: -this.facing,
            x: anchorX,
            y: baseY,
            w: tailLen,
            h: tailH,
            color: tailColor,
            alpha: intensity,
            life: 10
        });

        state.particles.push({
            x: anchorX + (this.facing === 1 ? -tailLen : tailLen),
            y: baseY + tailH / 2,
            vx: (Math.random() - 0.5) * 0.8,
            vy: -1,
            life: 12,
            color: tailColor,
            alpha: 0.4
        });
    }

    /**
     * Verifica colisões com plataformas, moedas e inimigos.
     */
    checkCollisions() {
        // Colisão com plataformas e espinhos
        state.platforms.forEach(p => {
            if (this.x + this.w > p.x + 5 &&
                this.x < p.x + p.w - 5 &&
                this.y + this.h >= p.y &&
                this.y + this.h <= p.y + p.h + 20 &&
                this.vy >= 0) {

                // Checa espinhos
                if (p.spikeInfo && this.invul === 0) {
                    let spikeStart = p.spikeInfo.x;
                    let spikeEnd = p.spikeInfo.x + p.spikeInfo.w;
                    if (this.x + this.w > spikeStart + 10 &&
                        this.x < spikeEnd - 10) {
                        this.takeDamage(30);
                        this.vy = -12;
                        spawnParticles(this.x + this.w / 2, this.y + this.h, 10, '#ff0000', 1);
                        return;
                    }
                }

                this.vy = 0;
                this.y = p.y - this.h;
                this.grounded = true;
                this.coyote = PHYS.coyoteFrames;
                this.jumps = 0;
            }
        });

        // Coleta de moedas
        for (let i = state.coins.length - 1; i >= 0; i--) {
            let c = state.coins[i];
            if (this.x < c.x + 25 && this.x + this.w > c.x - 25 &&
                this.y < c.y + 25 && this.y + this.h > c.y - 25) {
                state.coins.splice(i, 1);
                storage.totalCoins++;
                state.game.coins++;
                save();
                SFX.coin();
                spawnText('+1 ' + COIN_LABEL.trim(), c.x, c.y, '#ffd700');
                spawnParticles(c.x, c.y, 8, '#ffd700', 2);
            }
        }

        // Colisão com inimigos
        state.enemies.forEach(e => {
            if (Math.abs(this.x - e.x) < 30 && Math.abs(this.y - e.y) < 30) {
                if (this.isDashing) {
                    e.takeDamage(100);
                    state.camera.shake = 5;
                    SFX.hit();
                } else {
                    this.takeDamage(20);
                    this.vx = -12 * this.facing;
                    this.vy = -6;
                }
            }
        });
    }

    /**
     * Executa um ataque em área em torno do jogador. Desenha um arco
     * luminoso e causa dano aos inimigos dentro do alcance.
     */
    attack() {
        const range = 90;
        const atkX = this.facing === 1 ? this.x + this.w : this.x - range;

        state.attackEffects.push({
            kind: 'ring',
            x: this.x + this.w / 2,
            y: this.y + this.h / 2,
            radius: range,
            color: this.skin.glow,
            alpha: 0.9,
            life: 6
        });
        state.attackEffects.push({
            kind: 'slash',
            x: this.x + this.w / 2 + this.facing * 22,
            y: this.y + this.h * 0.48,
            radius: 30,
            color: this.skin.glow,
            alpha: 0.95,
            life: 8,
            growth: 6.2,
            fade: 0.76,
            arc: Math.PI * 0.9,
            angle: this.facing === 1 ? -0.35 : Math.PI + 0.35,
            spin: this.facing === 1 ? 0.24 : -0.24
        });
        spawnParticles(this.x + this.w / 2 + this.facing * 24, this.y + this.h * 0.5, 12, this.skin.glow, 1);

        // Checa inimigos no alcance
        state.enemies.forEach(e => {
            if (rectIntersect(atkX, this.y, range, this.h, e.x, e.y, e.w, e.h)) {
                e.takeDamage(35);
                e.vx = 8 * this.facing;
                spawnText('CRIT!', e.x, e.y, this.skin.glow);
                state.attackEffects.push({
                    kind: 'impact',
                    x: e.x + e.w / 2,
                    y: e.y + e.h / 2,
                    radius: 12,
                    color: '#ffd98f',
                    alpha: 0.9,
                    life: 9,
                    growth: 4.2,
                    fade: 0.8
                });
                state.camera.shake = 4;
                SFX.hit();
            }
        });
    }

    /**
     * Reduz HP do jogador, aplicando invulnerabilidade e finalizando o
     * jogo quando o HP chega a zero. Efeitos visuais e sonoros são
     * disparados. Não causa dano quando cheat de voo está ativo.
     * @param {number} amount Quantidade de dano
     */
    takeDamage(amount) {
        if (this.invul > 0) return;
        if (state.cheatFlight) return;

        this.hp -= amount;
        if (this.hp < 0) this.hp = 0;
        this.invul = 50;

        state.camera.shake = 12;
        SFX.hit();
        spawnText('DANGER', this.x, this.y, '#ff3355');
        spawnParticles(this.x, this.y, 15, '#ff3355', 2);

        if (this.hp <= 0) {
            if (typeof state.gameOver === 'function') state.gameOver();
        }
    }

    /**
     * Desenha o jogador, incluindo sombras, brilhos e fantasmas durante o
     * dash. Respeita a invulnerabilidade piscando.
     */
    draw() {
        const ctx = state.ctx;

        // fantasmas do dash
        state.ghosts.forEach((g, i) => {
            const ghostGrad = ctx.createLinearGradient(g.x, g.y, g.x, g.y + g.h);
            ghostGrad.addColorStop(0, 'rgba(255,255,255,0.35)');
            ghostGrad.addColorStop(1, g.c);
            ctx.fillStyle = ghostGrad;
            ctx.globalAlpha = g.alpha * 0.85;
            ctx.shadowBlur = 12;
            ctx.shadowColor = g.c;
            ctx.fillRect(g.x, g.y, g.w, g.h);
            ctx.shadowBlur = 0;
            g.alpha -= 0.1;
            g.life--;
            if (g.life <= 0) state.ghosts.splice(i, 1);
        });
        ctx.globalAlpha = 1;

        // pisca quando invulnerável
        if (this.invul > 0 && Math.floor(state.game.frames / 4) % 2 === 0) return;

        const leanAngle = this.lean || 0;
        const bob = this.bodyBob || 0;

        ctx.save();
        ctx.translate(this.x + this.w / 2, this.y + this.h / 2 + bob);
        ctx.rotate(leanAngle);
        ctx.translate(-this.w / 2, -this.h / 2);

        // tenta pegar o sprite da skin atual
        const spriteEntry = getSkinSprite(this.skin.id);

        // se tiver sprite carregado, desenha e sai da função
        if (spriteEntry && spriteEntry.loaded) {
            const img = spriteEntry.img;

            const imgW = img.naturalWidth || img.width || this.w;
            const imgH = img.naturalHeight || img.height || this.h;

            const scale = Math.min(this.w / imgW, this.h / imgH);
            const drawW = imgW * scale;
            const drawH = imgH * scale;

            const dx = (this.w - drawW) / 2;
            const dy = (this.h - drawH) / 2;

            ctx.fillStyle = 'rgba(0, 0, 0, 0.34)';
            ctx.beginPath();
            ctx.ellipse(this.w * 0.5, this.h + 4, this.w * 0.5, 6, 0, 0, Math.PI * 2);
            ctx.fill();

            ctx.shadowBlur = 28;
            ctx.shadowColor = this.skin.glow || '#0ff';

            // espelha o sprite quando estiver virado para a esquerda
            if (this.facing === -1) {
                ctx.translate(this.w, 0);
                ctx.scale(-1, 1);
            }

            ctx.drawImage(img, dx, dy, drawW, drawH);
            ctx.shadowBlur = 0;
            ctx.globalAlpha = 0.35;
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.1;
            ctx.strokeRect(dx + 1, dy + 1, drawW - 2, drawH - 2);
            ctx.globalAlpha = 1;

            ctx.restore();
            return;
        }

        // DESENHO PADRÃO (igual ao original) PARA TODAS AS SKINS SEM SPRITE
        let grad = ctx.createLinearGradient(0, 0, 0, this.h);
        grad.addColorStop(0, this.skin.c1);
        grad.addColorStop(1, this.skin.c2);
        ctx.fillStyle = grad;
        ctx.shadowBlur = 26;
        ctx.shadowColor = this.skin.glow;
        ctx.fillRect(0, 0, this.w, this.h);

        const edge = ctx.createLinearGradient(0, 0, this.w, this.h);
        edge.addColorStop(0, 'rgba(255,255,255,0.45)');
        edge.addColorStop(1, 'rgba(255,255,255,0.08)');
        ctx.strokeStyle = edge;
        ctx.lineWidth = 1.8;
        ctx.strokeRect(-1, -1, this.w + 2, this.h + 2);

        ctx.strokeStyle = 'rgba(255,255,255,0.12)';
        ctx.lineWidth = 0.9;
        ctx.strokeRect(2, 2, this.w - 4, this.h - 4);
        ctx.fillStyle = 'rgba(255,255,255,0.12)';
        ctx.fillRect(2, 2, this.w - 4, 6);

        // visor
        const visor = ctx.createLinearGradient(0, 0, 14, 0);
        visor.addColorStop(0, '#d6f7ff');
        visor.addColorStop(1, '#ffffff');
        ctx.fillStyle = visor;
        let visorX = this.facing === 1 ? this.w - 14 : 0;
        ctx.fillRect(visorX, 8, 14, 4);
        ctx.fillStyle = 'rgba(153, 240, 255, 0.6)';
        ctx.fillRect(visorX + 1, 8, 3, 4);

        ctx.restore();
    }
}
