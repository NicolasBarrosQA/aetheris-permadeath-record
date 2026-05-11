import { expect, test } from '@playwright/test';

test('abre com tela de login quando nao existe conta logada', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.goto('/public/index.html');

    await expect(page.locator('#auth-gate')).toBeVisible();
    await expect(page.locator('#auth-title')).toContainText('Entrar no AETHERIS');
    await expect(page.locator('#leaderboard-modal')).toBeHidden();

    await page.locator('#guest-continue-btn').click();
    await expect(page.locator('#auth-gate')).toBeHidden();
    await expect(page.locator('#pilot-mode')).toContainText('CONVIDADO');
});

test('ranking abre somente por comando e fica centralizado antes da corrida', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.goto('/public/index.html');

    await page.locator('#guest-continue-btn').click();
    await expect(page.locator('#leaderboard-modal')).toBeHidden();

    await page.locator('#leaderboard-open-btn').click();
    const modal = page.locator('#leaderboard-modal');
    await expect(modal).toBeVisible();
    await expect(page.locator('#leaderboard-list')).toContainText('SEM PONTUACOES VERIFICADAS');

    const box = await page.locator('.leaderboard-dialog').boundingBox();
    expect(box.x).toBeGreaterThan(300);
    expect(box.x + box.width).toBeLessThan(1066);

    await page.locator('#leaderboard-close-btn').click();
    await expect(modal).toBeHidden();
});

test('signup cria conta real no servidor de teste e libera a entrada', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.goto('/public/index.html');

    const username = `e2e${Date.now().toString(36)}`;
    await page.locator('[data-auth-mode="signup"]').click();
    await page.locator('#account-username').fill(username);
    await page.locator('#account-display').fill('E2E Pilot');
    await page.locator('#account-password').fill('SenhaForte123');
    await page.locator('#account-submit-btn').click();

    await expect(page.locator('#auth-gate')).toBeHidden();
    await expect(page.locator('#pilot-mode')).toContainText('CONTA');
    await expect(page.locator('#pilot-name')).toContainText(/E2E Pilot/i);
    await expect(page.locator('#leaderboard-name-input')).toBeDisabled();

    await page.locator('#account-open-btn').click();
    await page.locator('#account-logout-btn').click();
    await expect(page.locator('#auth-gate')).toBeVisible();
    await expect(page.locator('#account-mode')).toContainText('CONVIDADO');
});

test('ranking nao aparece durante gameplay', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/public/index.html');

    await page.locator('#guest-continue-btn').click();
    await expect(page.locator('#leaderboard-open-btn')).toBeVisible();

    await page.keyboard.down('d');
    await expect(page.locator('#start-hint')).toBeHidden();
    await page.keyboard.up('d');
    await page.keyboard.press('l');
    await expect(page.locator('#leaderboard-modal')).toBeHidden();
});
