import { defineConfig } from '@playwright/test';

const isCi = Boolean(process.env.CI);
const isNetlify = process.env.NETLIFY === 'true';

export default defineConfig({
    testDir: './e2e',
    timeout: 30_000,
    workers: 1,
    retries: isCi ? 1 : 0,
    reporter: isCi && !isNetlify ? [['list'], ['html', { open: 'never' }]] : 'list',
    use: {
        baseURL: 'http://127.0.0.1:4173',
        browserName: 'chromium',
        screenshot: 'only-on-failure',
        trace: 'retain-on-failure',
        // Permite apontar para um Chromium ja instalado (ex.: sandboxes sem
        // acesso ao download de browsers do Playwright).
        launchOptions: process.env.PW_CHROMIUM_PATH
            ? { executablePath: process.env.PW_CHROMIUM_PATH }
            : {}
    },
    webServer: {
        command: 'node scripts/static-server.mjs',
        url: 'http://127.0.0.1:4173/public/index.html',
        reuseExistingServer: false,
        timeout: 20_000
    }
});
