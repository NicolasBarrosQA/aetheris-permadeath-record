import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('itch account flow uses shared Netlify API with bearer session fallback', async () => {
    const platform = await readFile('src/platform.js', 'utf8');
    const leaderboardClient = await readFile('src/systems/leaderboard.js', 'utf8');
    const accountFunction = await readFile('netlify/functions/account.mts', 'utf8');
    const leaderboardFunction = await readFile('netlify/functions/leaderboard.mts', 'utf8');
    const http = await readFile('netlify/functions/_shared/http.mjs', 'utf8');

    assert.match(platform, /accountEnabled:\s*true/);
    assert.match(leaderboardClient, /const ACCOUNT_URL = apiUrl\('\/api\/account'\)/);
    assert.match(leaderboardClient, /ACCOUNT_TOKEN_KEY/);
    assert.match(leaderboardClient, /Authorization: `Bearer \$\{accountToken\}`/);
    assert.match(http, /Access-Control-Allow-Headers': 'Content-Type, Authorization'/);
    assert.match(http, /function getAccountToken/);
    assert.match(accountFunction, /req\.method === 'OPTIONS'/);
    assert.match(accountFunction, /sessionToken: result\.session\.token/);
    assert.match(accountFunction, /method: \['GET', 'POST', 'OPTIONS'\]/);
    assert.match(leaderboardFunction, /getAccountToken\(req\)/);
});
