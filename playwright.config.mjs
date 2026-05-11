import { defineConfig } from '@playwright/test';

export default defineConfig({
    testDir: './e2e',
    timeout: 30_000,
    use: {
        baseURL: 'http://127.0.0.1:4173',
        browserName: 'chromium',
        trace: 'retain-on-failure'
    },
    webServer: {
        command: 'node scripts/static-server.mjs',
        url: 'http://127.0.0.1:4173/public/index.html',
        reuseExistingServer: false,
        timeout: 20_000
    }
});
