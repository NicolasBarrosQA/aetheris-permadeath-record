/*
 * Módulo responsável por gerar partículas, ondas de choque e textos
 * flutuantes. Apenas adiciona objetos nas listas apropriadas do estado;
 * a atualização e remoção ocorre no motor (engine.js).
 */

import state from '../core/state.js';

/**
 * Cria um conjunto de partículas. A vida, velocidade e tamanho são
 * aleatorizados de maneira idêntica ao protótipo.
 * @param {number} x Posição X inicial
 * @param {number} y Posição Y inicial
 * @param {number} n Quantidade de partículas
 * @param {string} c Cor base
 * @param {number} type Tipo de emissão (1 = pequenas, 2 = grandes)
 */
export function spawnParticles(x, y, n, c, type) {
    for (let i = 0; i < n; i++) {
        state.particles.push({
            x,
            y,
            vx: (Math.random() - 0.5) * (type === 1 ? 5 : 10),
            vy: (Math.random() - 0.5) * (type === 1 ? 5 : 10),
            life: 20 + Math.random() * 20,
            color: c,
            alpha: 1
        });
    }
}

/**
 * Cria uma onda de choque com raio inicial pequeno que se expande. A vida
 * determina a duração da expansão e é processada no motor.
 * @param {number} x Centro X da onda
 * @param {number} y Centro Y da onda
 * @param {string} color Cor da onda
 */
export function spawnShockwave(x, y, color) {
    state.particles.push({
        x,
        y,
        isWave: true,
        radius: 10,
        life: 20,
        color: color
    });
}

/**
 * Exibe um texto flutuante na tela. O texto se move para cima e desaparece
 * após alguns quadros. A opacidade não é controlada aqui; a remoção
 * ocorre no motor.
 * @param {string|number} txt Texto a ser exibido
 * @param {number} x Posição X inicial
 * @param {number} y Posição Y inicial
 * @param {string} c Cor do texto
 */
export function spawnText(txt, x, y, c) {
    state.texts.push({ txt, x, y, life: 50, color: c, alpha: 1 });
}