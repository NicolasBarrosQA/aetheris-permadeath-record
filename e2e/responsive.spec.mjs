import { expect, test } from '@playwright/test';

const VIEWPORTS = [
    { name: 'desktop 1920x1080', width: 1920, height: 1080, touch: false },
    { name: 'desktop 1366x768', width: 1366, height: 768, touch: false },
    { name: 'tablet 768x1024', width: 768, height: 1024, touch: true },
    { name: 'phone 390x844', width: 390, height: 844, touch: true },
    { name: 'phone 360x740', width: 360, height: 740, touch: true },
    { name: 'phone landscape 844x390', width: 844, height: 390, touch: true }
];

async function enterAsGuest(page) {
    await page.locator('#guest-continue-btn').click();
    await expect(page.locator('#auth-gate')).toBeHidden();
}

// Aguarda animacoes CSS de entrada antes de medir a geometria.
// Animacoes infinitas (ex.: pulso do START) sao ignoradas.
async function settledBox(locator) {
    await locator.evaluate(element => Promise.all(
        element.getAnimations({ subtree: true })
            .filter(animation => Number.isFinite(animation.effect?.getComputedTiming?.().endTime))
            .map(animation => animation.finished)
    ).catch(() => {}));
    return locator.boundingBox();
}

for (const vp of VIEWPORTS) {
    test.describe(`${vp.name}`, () => {
        test.use({
            viewport: { width: vp.width, height: vp.height },
            hasTouch: vp.touch
        });

        test('start screen fits the viewport without horizontal overflow', async ({ page }) => {
            await page.goto('/public/index.html');
            await enterAsGuest(page);

            const metrics = await page.evaluate(() => ({
                scrollWidth: document.documentElement.scrollWidth,
                innerWidth: window.innerWidth
            }));
            expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.innerWidth);

            // Core pre-run controls must be visible and inside the viewport.
            for (const selector of ['#start-run-btn', '#leaderboard-open-btn', '#quick-shop-btn', '#account-open-btn', '[data-difficulty="medium"]']) {
                const locator = page.locator(selector);
                await expect(locator).toBeVisible();
                const box = await locator.boundingBox();
                expect(box.x).toBeGreaterThanOrEqual(0);
                expect(box.y).toBeGreaterThanOrEqual(0);
                expect(box.x + box.width).toBeLessThanOrEqual(vp.width + 1);
                expect(box.y + box.height).toBeLessThanOrEqual(vp.height + 1);
            }
        });

        test('modals stay within the viewport', async ({ page }) => {
            const tolerance = 2;
            await page.goto('/public/index.html');

            const authBox = await settledBox(page.locator('#auth-gate .auth-dialog'));
            expect(authBox.x).toBeGreaterThanOrEqual(-tolerance);
            expect(authBox.x + authBox.width).toBeLessThanOrEqual(vp.width + tolerance);
            expect(authBox.y + authBox.height).toBeLessThanOrEqual(vp.height + tolerance);

            await enterAsGuest(page);

            await page.locator('#leaderboard-open-btn').click();
            const lbBox = await settledBox(page.locator('.leaderboard-dialog'));
            expect(lbBox.x).toBeGreaterThanOrEqual(-tolerance);
            expect(lbBox.x + lbBox.width).toBeLessThanOrEqual(vp.width + tolerance);
            await page.locator('#leaderboard-close-btn').click();

            await page.locator('#quick-shop-btn').click();
            await expect(page.locator('#shop-modal')).toBeVisible();
            const shopBox = await settledBox(page.locator('#shop-modal'));
            expect(shopBox.x).toBeGreaterThanOrEqual(-tolerance);
            expect(shopBox.x + shopBox.width).toBeLessThanOrEqual(vp.width + tolerance);
            expect(shopBox.y + shopBox.height).toBeLessThanOrEqual(vp.height + tolerance);
            await expect(page.locator('#shop-close-btn')).toBeVisible();
            await page.locator('#shop-close-btn').click();
        });
    });
}

test.describe('touch controls', () => {
    test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

    test('touch controls appear only during the run and meet the 44px target size', async ({ page }) => {
        await page.goto('/public/index.html');
        await enterAsGuest(page);

        // Antes da corrida o hub de menu e a unica interface.
        await expect(page.locator('[data-mobile-action="jump"]')).toBeHidden();

        await page.locator('#start-run-btn').click();
        await expect(page.locator('#start-hint')).toBeHidden();
        await expect(page.locator('[data-mobile-action="jump"]')).toBeVisible();

        for (const selector of [
            '[data-mobile-key="arrowleft"]',
            '[data-mobile-key="arrowright"]',
            '[data-mobile-action="jump"]',
            '[data-mobile-key="c"]'
        ]) {
            const box = await page.locator(selector).boundingBox();
            expect(box.width, `${selector} width`).toBeGreaterThanOrEqual(44);
            expect(box.height, `${selector} height`).toBeGreaterThanOrEqual(44);
        }

        // Ranking/loja ficam bloqueados durante a corrida: so PAUSE aparece.
        await expect(page.locator('[data-mobile-action="pause"]')).toBeVisible();
        await expect(page.locator('[data-mobile-action="ranking"]')).toBeHidden();
        await expect(page.locator('[data-mobile-action="shop"]')).toBeHidden();
    });

    test('keyboard hint chips are hidden on touch layouts', async ({ page }) => {
        await page.goto('/public/index.html');
        await enterAsGuest(page);
        await expect(page.locator('#start-controls')).toBeHidden();
    });
});

test.describe('desktop layout', () => {
    test.use({ viewport: { width: 1366, height: 768 } });

    test('menu hub is centered with the whole hierarchy inside one card', async ({ page }) => {
        await page.goto('/public/index.html');
        await enterAsGuest(page);

        const card = await settledBox(page.locator('.menu-card'));
        const center = card.x + card.width / 2;
        expect(Math.abs(center - 683)).toBeLessThan(20);

        // Difficulty > START > secondary actions > pilot identity, top to bottom.
        const difficulty = await page.locator('#difficulty-picker').boundingBox();
        const start = await page.locator('#start-run-btn').boundingBox();
        const actions = await page.locator('#pre-run-actions').boundingBox();
        const pilot = await page.locator('#pilot-strip').boundingBox();
        expect(start.y).toBeGreaterThan(difficulty.y);
        expect(actions.y).toBeGreaterThan(start.y);
        expect(pilot.y).toBeGreaterThanOrEqual(actions.y + actions.height - 1);
    });

    test('START RUN begins the run and dismisses the menu hub', async ({ page }) => {
        await page.goto('/public/index.html');
        await enterAsGuest(page);

        await expect(page.locator('#start-run-btn')).toBeVisible();
        await page.locator('#start-run-btn').click();
        await expect(page.locator('#start-hint')).toBeHidden();

        // Selecting a difficulty keeps the segmented control on screen.
        await page.reload();
        await enterAsGuest(page);
        await page.locator('[data-difficulty="hard"]').click();
        await expect(page.locator('#difficulty-picker')).toBeVisible();
        await expect(page.locator('[data-difficulty="hard"]')).toHaveClass(/selected/);
    });
});
