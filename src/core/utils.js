/*
 * Funções utilitárias gerais. Por enquanto inclui apenas interseção de
 * retângulos, usada no ataque do jogador.
 */

/**
 * Verifica interseção de dois retângulos axis-aligned.
 * @param {number} x1 Posição X do retângulo A
 * @param {number} y1 Posição Y do retângulo A
 * @param {number} w1 Largura do retângulo A
 * @param {number} h1 Altura do retângulo A
 * @param {number} x2 Posição X do retângulo B
 * @param {number} y2 Posição Y do retângulo B
 * @param {number} w2 Largura do retângulo B
 * @param {number} h2 Altura do retângulo B
 * @returns {boolean} Verdadeiro se houver interseção
 */
export function rectIntersect(x1, y1, w1, h1, x2, y2, w2, h2) {
    return x2 < x1 + w1 && x2 + w2 > x1 && y2 < y1 + h1 && y2 + h2 > y1;
}