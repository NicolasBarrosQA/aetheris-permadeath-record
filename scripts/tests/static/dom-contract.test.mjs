import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readFile('public/index.html', 'utf8');

test('contrato de UI exige login gate e ranking modal central', () => {
    [
        'auth-gate',
        'account-form',
        'guest-continue-btn',
        'leaderboard-open-btn',
        'leaderboard-modal',
        'leaderboard-close-btn',
        'leaderboard-list',
        'pilot-strip'
    ].forEach(id => {
        assert.match(html, new RegExp(`id="${id}"`), `Elemento obrigatorio ausente: #${id}`);
    });

    assert.doesNotMatch(html, /id="leaderboard-panel"/);
    assert.match(html, /\[ L \] LEADERBOARD/);
    assert.match(html, /id="language-toggle"/);
});

test('html de producao nao carrega fixture visual de ranking', () => {
    assert.doesNotMatch(html, /QA RUNNER/i);
    assert.doesNotMatch(html, /E2E PILOT/i);
});
