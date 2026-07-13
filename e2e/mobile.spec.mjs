import { expect, test } from '@playwright/test';

// Emulacao mobile real (hover: none / pointer: coarse), como um telefone.

test.describe('mobile landscape gameplay', () => {
    test.use({
        viewport: { width: 844, height: 390 },
        hasTouch: true,
        isMobile: true
    });

    test('full touch gameplay loop: start, move, jump, pause, resume', async ({ page }) => {
        await page.goto('/public/index.html');
        await page.locator('#guest-continue-btn').click();

        // Em paisagem nao ha aviso de rotacao.
        await expect(page.locator('#rotate-overlay')).toBeHidden();
        await expect(page.locator('#landscape-hint')).toBeHidden();

        await page.locator('#start-run-btn').click();
        await expect(page.locator('#start-hint')).toBeHidden();
        await expect(page.locator('[data-mobile-action="jump"]')).toBeVisible();
        await expect(page.locator('#rotate-overlay')).toBeHidden();

        // Segura a seta direita (pointerdown/up, como um dedo) e anda um
        // trecho curto: a plataforma inicial e plana e segura (~45m); uma
        // corrida cega mais longa morre nos espinhos e derruba o teste.
        const right = page.locator('[data-mobile-key="arrowright"]');
        const box = await right.boundingBox();
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.mouse.down();
        await page.waitForTimeout(600);
        await page.mouse.up();

        const distance = await page.locator('#ui-dist').innerText();
        expect(Number.parseInt(distance, 10)).toBeGreaterThan(0);

        // Pulo e dash respondem sem erro.
        await page.locator('[data-mobile-action="jump"]').click();
        await page.locator('[data-mobile-key="c"]').click();

        // Pausa pelo botao touch e retoma.
        await page.locator('[data-mobile-action="pause"]').click();
        await expect(page.locator('#pause-screen')).toBeVisible();
        await page.locator('#pause-resume-btn').click();
        await expect(page.locator('#pause-screen')).toBeHidden();
    });
});

test.describe('mobile portrait guidance', () => {
    test.use({
        viewport: { width: 390, height: 844 },
        hasTouch: true,
        isMobile: true
    });

    test('hub shows the landscape hint and the run shows the rotate overlay', async ({ page }) => {
        await page.goto('/public/index.html');
        await page.locator('#guest-continue-btn').click();

        await expect(page.locator('#landscape-hint')).toBeVisible();
        await expect(page.locator('#rotate-overlay')).toBeHidden();

        await page.locator('#start-run-btn').click();
        await expect(page.locator('#start-hint')).toBeHidden();
        await expect(page.locator('#rotate-overlay')).toBeVisible();
        await expect(page.locator('#rotate-overlay strong')).toContainText('ROTATE');
    });
});
