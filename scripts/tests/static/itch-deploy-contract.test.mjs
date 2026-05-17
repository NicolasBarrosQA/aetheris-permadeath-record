import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('itch build and deploy pipeline are declared', async () => {
    const pkg = JSON.parse(await readFile('package.json', 'utf8'));
    const workflow = await readFile('.github/workflows/qa.yml', 'utf8');
    const buildScript = await readFile('scripts/build-itch.mjs', 'utf8');
    const platform = await readFile('src/platform.js', 'utf8');

    assert.equal(pkg.scripts['build:itch'], 'node scripts/build-itch.mjs');
    assert.match(workflow, /deploy-itch:/);
    assert.match(workflow, /ITCH_API_KEY/);
    assert.match(workflow, /hzp-apolo\/aetheris-permadeath-record:html5/);
    assert.match(buildScript, /AETHERIS_PLATFORM/);
    assert.match(buildScript, /itch-fullscreen\.js/);
    assert.match(buildScript, /styles\/itch\.css/);
    assert.match(platform, /aetheris-permadeath-record\.netlify\.app/);
});
