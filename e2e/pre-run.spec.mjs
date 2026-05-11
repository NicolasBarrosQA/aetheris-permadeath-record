import { expect, test } from '@playwright/test';

test('painel pre-corrida aparece em desktop e some ao iniciar', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.goto('/public/index.html');

    const panel = page.locator('#leaderboard-panel');
    await expect(panel).toBeVisible();
    await expect(page.locator('#leaderboard-list')).toContainText('QA RUNNER');

    await page.keyboard.down('d');
    await expect(panel).toBeHidden();
    await page.keyboard.up('d');
});

test('painel pre-corrida aparece no mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/public/index.html');

    await expect(page.locator('#leaderboard-panel')).toBeVisible();
    await expect(page.locator('#account-mode')).toContainText('CONVIDADO');
});

test('conta opcional conecta e volta para convidado', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.goto('/public/index.html');

    await page.locator('#account-toggle-btn').click();
    await page.locator('#account-username').fill('e2e-runner');
    await page.locator('#account-password').fill('SenhaForte123');
    await page.locator('#account-submit-btn').click();

    await expect(page.locator('#account-mode')).toContainText('CONTA');
    await expect(page.locator('#account-name')).toContainText('E2E');
    await expect(page.locator('#leaderboard-name-input')).toBeDisabled();

    await page.locator('#account-toggle-btn').click();
    await page.locator('#account-logout-btn').click();

    await expect(page.locator('#account-mode')).toContainText('CONVIDADO');
    await expect(page.locator('#leaderboard-name-input')).toBeEnabled();
});
