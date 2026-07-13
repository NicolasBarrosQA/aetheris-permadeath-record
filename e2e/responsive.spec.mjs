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
async function settledBox(locator) {
    await locator.evaluate(element => Promise.all(
        element.getAnimations({ subtree: true }).map(animation => animation.finished)
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
            for (const selector of ['#leaderboard-open-btn', '#quick-shop-btn', '#account-open-btn', '[data-difficulty="medium"]']) {
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

    test('touch buttons are visible and meet the 44px target size', async ({ page }) => {
        await page.goto('/public/index.html');
        await enterAsGuest(page);

        // O container tem altura zero (clusters posicionados de forma
        // absoluta); a visibilidade real e a dos botoes.
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
    });

    test('keyboard hint chips are hidden on touch layouts', async ({ page }) => {
        await page.goto('/public/index.html');
        await enterAsGuest(page);
        await expect(page.locator('#start-controls')).toBeHidden();
    });
});

test.describe('desktop layout', () => {
    test.use({ viewport: { width: 1366, height: 768 } });

    test('difficulty rail sits left and systems rail sits right', async ({ page }) => {
        await page.goto('/public/index.html');
        await enterAsGuest(page);

        const difficulty = await page.locator('#difficulty-picker').boundingBox();
        const actions = await page.locator('#pre-run-actions').boundingBox();
        expect(difficulty.x + difficulty.width).toBeLessThan(1366 / 2);
        expect(actions.x).toBeGreaterThan(1366 / 2);

        // Pilot strip flows below the actions without overlapping.
        const pilot = await page.locator('#pilot-strip').boundingBox();
        expect(pilot.y).toBeGreaterThanOrEqual(actions.y + actions.height);
    });

    test('start CTA is visible before the run and gone during it', async ({ page }) => {
        await page.goto('/public/index.html');
        await enterAsGuest(page);

        await expect(page.locator('#start-cta')).toBeVisible();
        await page.keyboard.down('d');
        await expect(page.locator('#start-cta')).toBeHidden();
        await page.keyboard.up('d');
    });
});
