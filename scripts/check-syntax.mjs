import { readdir } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { spawnSync } from 'node:child_process';

const roots = ['src', 'netlify/functions', 'scripts', 'e2e'];
const allowed = new Set(['.js', '.mjs', '.mts']);
const files = [];

async function collect(dir) {
    const entries = await readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
        const path = join(dir, entry.name);
        if (entry.isDirectory()) {
            await collect(path);
        } else if (allowed.has(extname(entry.name))) {
            files.push(path);
        }
    }
}

for (const root of roots) {
    await collect(root);
}

files.push('playwright.config.mjs');

for (const file of files) {
    const result = spawnSync(process.execPath, ['--check', file], {
        encoding: 'utf8'
    });

    if (result.status !== 0) {
        console.error(result.stderr || result.stdout);
        process.exit(result.status || 1);
    }
}

console.log(`syntax check passed (${files.length} files)`);
