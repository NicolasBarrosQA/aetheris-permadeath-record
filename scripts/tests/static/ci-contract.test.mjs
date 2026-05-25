import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const packageJson = JSON.parse(await readFile('package.json', 'utf8'));
const workflow = await readFile('.github/workflows/qa.yml', 'utf8');
const netlifyToml = await readFile('netlify.toml', 'utf8');
const playwrightConfig = await readFile('playwright.config.mjs', 'utf8');

test('scripts de qualidade cobrem piramide e gate de release', () => {
    const scripts = packageJson.scripts || {};
    assert.match(scripts['test:static'], /check-syntax/);
    assert.match(scripts['test:static'], /scripts\/tests\/static|\*\.test\.mjs/);
    assert.match(scripts['test:unit'], /node --test/);
    assert.match(scripts['test:integration'], /node --test/);
    assert.match(scripts['test:e2e'], /playwright test/);
    assert.match(scripts['ci:verify'], /smoke:leaderboard/);
    assert.match(scripts['ci:verify'], /npm audit/);
});

test('Netlify so publica depois do gate de qualidade', () => {
    assert.match(netlifyToml, /command\s*=\s*"npm run ci:netlify"/);
    assert.match(netlifyToml, /publish\s*=\s*"\."/);
});

test('Netlify preserva rotas de API declaradas nas Functions', () => {
    assert.doesNotMatch(netlifyToml, /from\s*=\s*"\/api\/(?:account|leaderboard)\*/);
    assert.doesNotMatch(netlifyToml, /to\s*=\s*"\/\.netlify\/functions\/(?:account|leaderboard)/);
});

test('Netlify roda E2E sem publicar relatorio HTML no site', () => {
    assert.match(playwrightConfig, /process\.env\.NETLIFY/);
    assert.match(playwrightConfig, /isCi\s*&&\s*!isNetlify/);
    assert.match(netlifyToml, /from\s*=\s*"\/playwright-report\/\*"/);
    assert.match(netlifyToml, /from\s*=\s*"\/test-results\/\*"/);
    assert.match(netlifyToml, /status\s*=\s*404/);
    assert.match(netlifyToml, /force\s*=\s*true/);
});

test('GitHub Actions separa checks para diagnostico de QA', () => {
    assert.match(workflow, /name: Quality Gate/);
    assert.match(workflow, /static-contracts:/);
    assert.match(workflow, /unit-integration:/);
    assert.match(workflow, /e2e:/);
    assert.match(workflow, /security:/);
});

test('GitHub Actions publica Netlify somente depois do itch', () => {
    assert.match(workflow, /deploy-netlify:/);
    assert.match(workflow, /needs:\s*\[static-contracts, unit-integration, e2e, security, deploy-itch\]/);
    assert.match(workflow, /NETLIFY_SITE_ID:\s*7df12356-b0bd-465c-9875-4445ac9965f1/);
    assert.match(workflow, /NETLIFY_AUTH_TOKEN/);
    assert.match(workflow, /netlify-cli@26\.0\.2 deploy/);
    assert.match(workflow, /--prod/);
    assert.match(workflow, /--no-build/);
    assert.match(workflow, /ITCH_API_KEY secret is not set; refusing/);
});
