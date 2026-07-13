import test from 'node:test';
import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';

const html = await readFile('public/index.html', 'utf8');
const manifest = JSON.parse(await readFile('manifest.webmanifest', 'utf8'));
const serviceWorker = await readFile('sw.js', 'utf8');
const pwaModule = await readFile('src/pwa.js', 'utf8');
const netlifyToml = await readFile('netlify.toml', 'utf8');

test('index.html declara manifest, icones e registro do PWA', () => {
    assert.match(html, /rel="manifest"/);
    assert.match(html, /apple-touch-icon/);
    assert.match(html, /name="theme-color"/);
    assert.match(html, /viewport-fit=cover/);
    assert.match(html, /src\/pwa\.js/);
    assert.match(html, /id="pwa-install-btn"/);
    assert.match(html, /id="rotate-overlay"/);
});

test('manifest esta completo para instalacao', () => {
    assert.ok(manifest.name.includes('AETHERIS'));
    assert.ok(manifest.start_url);
    assert.ok(['fullscreen', 'standalone', 'minimal-ui'].includes(manifest.display));
    assert.equal(manifest.orientation, 'landscape');
    const pngSizes = manifest.icons.filter(icon => icon.type === 'image/png').map(icon => icon.sizes);
    assert.ok(pngSizes.includes('192x192'));
    assert.ok(pngSizes.includes('512x512'));
    assert.ok(manifest.icons.some(icon => (icon.purpose || '').includes('maskable')));
    assert.ok(Array.isArray(manifest.screenshots) && manifest.screenshots.length >= 1);
});

test('assets declarados no manifest existem no repositorio', async () => {
    const assets = [...manifest.icons, ...(manifest.screenshots || [])].map(entry => entry.src.replace(/^\//, ''));
    for (const asset of assets) {
        await assert.doesNotReject(access(asset), `Asset do manifest ausente: ${asset}`);
    }
});

test('service worker cobre shell, ignora API e limpa caches antigos', () => {
    assert.match(serviceWorker, /addEventListener\('install'/);
    assert.match(serviceWorker, /addEventListener\('activate'/);
    assert.match(serviceWorker, /addEventListener\('fetch'/);
    assert.match(serviceWorker, /\/api\//);
    assert.match(serviceWorker, /\/public\/index\.html/);
    assert.match(serviceWorker, /caches\.delete/);
});

test('registro do PWA e protegido contra itch e contextos inseguros', () => {
    assert.match(pwaModule, /platform\.isItch/);
    assert.match(pwaModule, /serviceWorker/);
    assert.match(pwaModule, /beforeinstallprompt/);
});

test('Netlify nao deixa o service worker preso em cache', () => {
    assert.match(netlifyToml, /for\s*=\s*"\/sw\.js"/);
    assert.match(netlifyToml, /no-cache/);
});
