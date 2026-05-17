import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist', 'itch-html5');

async function copyPath(path) {
    await cp(join(root, path), join(dist, path), { recursive: true });
}

function injectBeforeNeedle(source, needle, insertion) {
    if (source.includes(insertion.trim())) return source;
    if (!source.includes(needle)) {
        throw new Error(`Needle not found while building itch package: ${needle}`);
    }
    return source.replace(needle, `${insertion}${needle}`);
}

function patchIndexHtml(html) {
    let next = html
        .replace('href="/manifest.webmanifest', 'href="../manifest.webmanifest')
        .replaceAll('href="/assets/', 'href="../assets/');

    next = injectBeforeNeedle(
        next,
        '</head>',
        '    <link rel="stylesheet" href="../styles/itch.css?v=itch-fix-1" />\n    <script>globalThis.AETHERIS_PLATFORM = \'itch\';</script>\n'
    );

    next = next.replace(
        '<div id="vignette"></div>',
        '<div id="vignette"></div>\n        <button type="button" id="itch-fullscreen-btn" aria-label="Open in fullscreen" title="Open in fullscreen">FULLSCREEN</button>'
    );

    next = next.replace(
        /<span class="stat-label">[^<]*NCIA<\/span>/,
        '<span class="stat-label" data-i18n="hud.distance">DISTANCE</span>'
    );
    next = next.replace(
        /<h1 id="overlay-title">[^<]*<\/h1>/,
        '<h1 id="overlay-title">CRITICAL SYSTEM</h1>'
    );
    next = next.replace(
        /<p id="overlay-msg"([^>]*)>[^<]*<\/p>/,
        '<p id="overlay-msg"$1>CONNECTION LOST</p>'
    );
    next = next.replace(
        /<button class="touch-btn touch-move" type="button" data-mobile-key="arrowleft"([^>]*)>[^<]*<\/button>/,
        '<button class="touch-btn touch-move" type="button" data-mobile-key="arrowleft"$1>LEFT</button>'
    );
    next = next.replace(
        /<button class="touch-btn touch-move" type="button" data-mobile-key="arrowright"([^>]*)>[^<]*<\/button>/,
        '<button class="touch-btn touch-move" type="button" data-mobile-key="arrowright"$1>RIGHT</button>'
    );

    next = injectBeforeNeedle(
        next,
        '</body>',
        '    <script type="module" src="../src/itch-fullscreen.js?v=itch-fix-1"></script>\n'
    );

    return next;
}

function patchManifest(manifest) {
    const data = JSON.parse(manifest);
    data.id = '.';
    data.start_url = 'public/index.html?source=homescreen';
    data.scope = '.';

    for (const icon of data.icons || []) {
        if (icon.src?.startsWith('/')) icon.src = icon.src.slice(1);
    }
    for (const screenshot of data.screenshots || []) {
        if (screenshot.src?.startsWith('/')) screenshot.src = screenshot.src.slice(1);
    }

    return `${JSON.stringify(data, null, 2)}\n`;
}

const rootIndex = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>AETHERIS: Permadeath Record</title>
  <meta http-equiv="refresh" content="0; url=public/index.html">
  <script>location.replace('public/index.html');</script>
</head>
<body>
  <a href="public/index.html">Open AETHERIS</a>
</body>
</html>
`;

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });

await Promise.all([
    copyPath('assets'),
    copyPath('src'),
    copyPath('styles'),
    copyPath('public')
]);

await writeFile(join(dist, 'index.html'), rootIndex, 'utf8');
await writeFile(
    join(dist, 'public', 'index.html'),
    patchIndexHtml(await readFile(join(dist, 'public', 'index.html'), 'utf8')),
    'utf8'
);
await writeFile(
    join(dist, 'manifest.webmanifest'),
    patchManifest(await readFile(join(root, 'manifest.webmanifest'), 'utf8')),
    'utf8'
);

console.log(`itch package ready: ${dist}`);
