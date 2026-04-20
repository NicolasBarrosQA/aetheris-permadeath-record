/*
 * Implementação da classe Enemy. Inimigos perseguem o jogador quando
 * detectam sua proximidade e caem das plataformas se não houver suporte.
 * Possuem uma barra de vida e concedem recompensas ao serem derrotados.
 */

import state from '../core/state.js';
import { spawnParticles, spawnText } from '../systems/particles.js';
import { SFX } from '../core/audio.js';
import { storage, save } from '../core/storage.js';

export default class Enemy {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.w = 40;
        this.h = 40;
        this.maxHp = 50 + (state.game.difficulty * 15);
        this.hp = this.maxHp;
        this.baseSpeed = 2.0 + (state.game.difficulty * 0.8);
        this.vx = 0;
        this.vy = 0;
        this.dir = -1;
        this.alert = false;
        this.bob = Math.random() * 100;
        this.grounded = false;
        this.drawY = y;
    }

    /**
     * Atualiza lógica de perseguição e movimento. Enemigos detectam o
     * jogador a uma certa distância e mudam direção nas bordas das
     * plataformas.
     */
    update() {
        if (!state.game.started) return;
        this.bob += 0.1;
        let floatY = Math.sin(this.bob) * 2;
        let distToPlayer = state.player.x - this.x;
        let distY = Math.abs(state.player.y - this.y);
        if (Math.abs(distToPlayer) < 500 && distY < 200) {
            this.dir = Math.sign(distToPlayer);
            this.alert = true;
        } else {
            this.alert = false;
        }
        // recalcula velocidade base com dificuldade atual
        this.baseSpeed = 2.0 + (state.game.difficulty * 0.8);
        let currentSpeed = this.alert ? this.baseSpeed * 1.5 : this.baseSpeed;
        this.vx = currentSpeed;
        // Função auxiliar para encontrar suporte abaixo
        const findSupport = (xPos, yPos) => {
            // Usa uma "area de pe" interna para evitar suporte quando o
            // inimigo esta quase todo fora da plataforma.
            const footInset = 8;
            let best = null;
            let bestDiff = Infinity;
            for (let p of state.platforms) {
                if (xPos + this.w - footInset > p.x && xPos + footInset < p.x + p.w) {
                    const diff = p.y - (yPos + this.h);
                    if (diff >= -6 && diff <= 24 && diff < bestDiff) {
                        best = p;
                        bestDiff = diff;
                    }
                }
            }
            return best;
        };
        // previne cair das plataformas invertendo direção se não houver suporte
        let intendedX = this.x + this.vx * this.dir;
        let support = findSupport(intendedX, this.y);
        if (!support && this.grounded) {
            this.dir *= -1;
            intendedX = this.x + this.vx * this.dir;
            support = findSupport(intendedX, this.y);
        }
        this.x = intendedX;
        if (support) {
            this.y = support.y - this.h;
            this.vy = 0;
            this.grounded = true;
            const edge = 10;
            const minX = support.x;
            const maxX = support.x + support.w - this.w;
            // Clamp horizontal para impedir que o sprite atravesse o limite.
            if (this.x < minX) {
                this.x = minX;
                this.dir = 1;
            } else if (this.x > maxX) {
                this.x = maxX;
                this.dir = -1;
            }
            if (this.x <= support.x + edge) this.dir = 1;
            if (this.x + this.w >= support.x + support.w - edge) this.dir = -1;
        } else {
            this.grounded = false;
            this.vy = Math.min(this.vy + 0.6, 10);
            this.y += this.vy;
        }
        if (this.y > 1000) this.hp = 0;
        this.drawY = this.y + floatY;
    }

    /**
     * Aplica dano ao inimigo. Ao morrer, concede moedas ao jogador e
     * dispara efeitos visuais e sonoros.
     * @param {number} dmg Valor do dano
     */
    takeDamage(dmg) {
        this.hp -= dmg;
        spawnParticles(this.x + this.w / 2, this.y, 8, '#ffaa00', 1);
        spawnText(dmg, this.x, this.y, '#fff');
        if (this.hp <= 0) {
            const reward = 2 + Math.floor(Math.random() * 4);
            storage.totalCoins += reward;
            state.game.coins += reward;
            save();
            spawnText('+' + reward + ' CR', this.x, this.y - 20, '#ffd700');
            spawnParticles(this.x + this.w / 2, this.y, 15, '#ffd700', 2);
            SFX.coin();
        }
    }

    /**
     * Desenha o inimigo na posição atual. Inclui brilho, barra de HP e
     * olhos que mudam de cor quando alerta.
     */
    draw() {
        const ctx = state.ctx;
        let dY = this.drawY || this.y;
        let color = this.alert ? '#ffaa00' : '#ff3355';
        let grad = ctx.createLinearGradient(this.x, dY, this.x, dY + this.h);
        grad.addColorStop(0, color);
        grad.addColorStop(1, '#330000');
        ctx.fillStyle = grad;
        ctx.shadowBlur = 18;
        ctx.shadowColor = color;
        ctx.fillRect(this.x, dY, this.w, this.h);
        ctx.strokeStyle = 'rgba(255,255,255,0.2)';
        ctx.strokeRect(this.x - 1, dY - 1, this.w + 2, this.h + 2);
        // visor
        ctx.fillStyle = '#000';
        ctx.fillRect(this.x + 5, dY + 10, 30, 10);
        ctx.fillStyle = this.alert ? '#fff' : '#ff0000';
        let eyeX = this.dir === 1 ? this.x + 20 : this.x + 10;
        ctx.shadowBlur = 5;
        ctx.shadowColor = '#fff';
        ctx.fillRect(eyeX, dY + 12, 6, 6);
        ctx.shadowBlur = 0;
        // barra de HP
        ctx.fillStyle = '#333';
        ctx.fillRect(this.x, dY - 8, this.w, 4);
        ctx.fillStyle = color;
        ctx.fillRect(this.x, dY - 8, this.w * (this.hp / this.maxHp), 4);
        // reflexo inferior
        let under = ctx.createLinearGradient(this.x, dY + this.h, this.x, dY + this.h + 12);
        under.addColorStop(0, `${color}55`);
        under.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = under;
        ctx.fillRect(this.x, dY + this.h, this.w, 12);
    }
}
