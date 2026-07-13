import { expect, test } from '@playwright/test';

test('opens with login screen when no account is signed in', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.goto('/public/index.html');

    await expect(page.locator('#auth-gate')).toBeVisible();
    await expect(page.locator('#auth-title')).toContainText('Enter AETHERIS');
    await expect(page.locator('#leaderboard-modal')).toBeHidden();

    await page.locator('#guest-continue-btn').click();
    await expect(page.locator('#auth-gate')).toBeHidden();
    await expect(page.locator('#pilot-mode')).toContainText('GUEST');
});

test('language toggle switches the game to pt-BR discreetly', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.goto('/public/index.html');

    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await page.locator('#language-toggle').click();

    await expect(page.locator('html')).toHaveAttribute('lang', 'pt-BR');
    await expect(page.locator('#language-toggle')).toContainText('EN');
    await expect(page.locator('#auth-title')).toContainText('Entrar no AETHERIS');

    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('lang', 'pt-BR');
    await expect(page.locator('#auth-title')).toContainText('Entrar no AETHERIS');
});

test('leaderboard opens only by command and appears as a centered dialog before the run', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.goto('/public/index.html');

    await page.locator('#guest-continue-btn').click();
    await expect(page.locator('#leaderboard-modal')).toBeHidden();

    await page.locator('#leaderboard-open-btn').click();
    const modal = page.locator('#leaderboard-modal');
    await expect(modal).toBeVisible();
    await expect(page.locator('#leaderboard-list')).toContainText('NO VERIFIED SCORES');

    const box = await page.locator('.leaderboard-dialog').boundingBox();
    // Dialog is horizontally centered over the stage
    const center = box.x + box.width / 2;
    expect(Math.abs(center - 683)).toBeLessThan(60);

    await page.locator('#leaderboard-close-btn').click();
    await expect(modal).toBeHidden();
});

test('shop close button is visible on desktop and closes the shop', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.goto('/public/index.html');

    await page.locator('#guest-continue-btn').click();
    await page.locator('#quick-shop-btn').click();

    await expect(page.locator('#shop-modal')).toBeVisible();
    await expect(page.locator('#shop-close-btn')).toBeVisible();

    await page.locator('#shop-close-btn').click();
    await expect(page.locator('#shop-modal')).toBeHidden();
});

test('signup creates a real account on the test server and enters the game', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.goto('/public/index.html');

    const username = `e2e${Date.now().toString(36)}`;
    await page.locator('[data-auth-mode="signup"]').click();
    await page.locator('#account-username').fill(username);
    await page.locator('#account-display').fill('E2E Pilot');
    await page.locator('#account-password').fill('SenhaForte123');
    await page.locator('#account-submit-btn').click();

    await expect(page.locator('#auth-gate')).toBeHidden();
    await expect(page.locator('#pilot-mode')).toContainText('ACCOUNT');
    await expect(page.locator('#pilot-name')).toContainText(/E2E Pilot/i);
    await expect(page.locator('#leaderboard-name-input')).toBeDisabled();

    await page.locator('#account-open-btn').click();
    await page.locator('#account-logout-btn').click();
    await expect(page.locator('#auth-gate')).toBeVisible();
    await expect(page.locator('#account-mode')).toContainText('GUEST');
});

test('leaderboard does not appear during gameplay', async ({ page }) => {
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
