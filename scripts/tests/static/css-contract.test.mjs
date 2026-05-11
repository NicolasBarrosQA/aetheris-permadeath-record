import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const css = await readFile('styles/main.css', 'utf8');

function countMatches(pattern) {
    return [...css.matchAll(pattern)].length;
}

test('CSS principal mantem blocos balanceados', () => {
    assert.equal(countMatches(/\{/g), countMatches(/\}/g));
});

test('animacoes e picker da tela inicial nao ficam duplicados', () => {
    assert.equal(countMatches(/@keyframes\s+float-clouds/g), 1);
    assert.equal(countMatches(/@keyframes\s+pulse-hint/g), 1);
    assert.equal(countMatches(/@keyframes\s+frame-breathe/g), 1);
    assert.equal(countMatches(/@keyframes\s+hp-scan/g), 1);
    assert.equal(countMatches(/@keyframes\s+drift-lines/g), 1);
    assert.equal(countMatches(/^#difficulty-picker\s*\{/gm), 1);
});
