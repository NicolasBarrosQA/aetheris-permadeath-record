import { expect, test } from '@playwright/test';

test('manifest is reachable and declares an installable app', async ({ request }) => {
    const response = await request.get('/manifest.webmanifest');
    expect(response.ok()).toBeTruthy();

    const manifest = JSON.parse(await response.text());
    expect(manifest.name).toContain('AETHERIS');
    expect(manifest.start_url).toBeTruthy();
    expect(['fullscreen', 'standalone', 'minimal-ui']).toContain(manifest.display);
    expect(manifest.orientation).toBe('landscape');

    const pngIcons = (manifest.icons || []).filter(icon => icon.type === 'image/png');
    const sizes = pngIcons.map(icon => icon.sizes);
    expect(sizes).toContain('192x192');
    expect(sizes).toContain('512x512');
    expect(pngIcons.some(icon => (icon.purpose || '').includes('maskable'))).toBeTruthy();

    // Every declared icon and screenshot must actually exist.
    for (const asset of [...(manifest.icons || []), ...(manifest.screenshots || [])]) {
        const assetResponse = await request.get(asset.src);
        expect(assetResponse.ok(), `manifest asset missing: ${asset.src}`).toBeTruthy();
    }
});

test('service worker script is served from the origin root', async ({ request }) => {
    const response = await request.get('/sw.js');
    expect(response.ok()).toBeTruthy();
    expect(response.headers()['content-type']).toContain('javascript');

    const body = await response.text();
    expect(body).toContain('addEventListener(\'fetch\'');
    expect(body).toContain('/api/');
});

test('service worker registers and precaches the app shell', async ({ page }) => {
    await page.goto('/public/index.html');

    const registered = await page.evaluate(async () => {
        if (!('serviceWorker' in navigator)) return { supported: false };
        const registration = await navigator.serviceWorker.ready;
        return {
            supported: true,
            scope: registration.scope,
            active: Boolean(registration.active)
        };
    });

    expect(registered.supported).toBeTruthy();
    expect(registered.active).toBeTruthy();
    expect(registered.scope).toContain('127.0.0.1');

    const cachedShell = await page.evaluate(async () => {
        const keys = await caches.keys();
        const shellKey = keys.find(key => key.includes('shell'));
        if (!shellKey) return { keys, cached: [] };
        const cache = await caches.open(shellKey);
        const requests = await cache.keys();
        return { keys, cached: requests.map(request => new URL(request.url).pathname) };
    });

    expect(cachedShell.cached).toContain('/public/index.html');
    expect(cachedShell.cached).toContain('/styles/main.css');
    expect(cachedShell.cached).toContain('/src/main.js');
});

test('page keeps rendering the start screen with the service worker active', async ({ page }) => {
    await page.goto('/public/index.html');
    await page.evaluate(() => navigator.serviceWorker.ready);

    await page.reload();
    await expect(page.locator('#auth-gate')).toBeVisible();
    await page.locator('#guest-continue-btn').click();
    await expect(page.locator('#leaderboard-open-btn')).toBeVisible();
});
