import { expect, test } from '@playwright/test';
test('production game loads and performs the first tutorial move without browser errors', async ({ page, request }) => {
    const errors: string[] = [];
    const failedAssets: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('response', response => {
        if (response.url().includes('/assets/') && response.status() >= 400) failedAssets.push(response.url());
    });
    for (const asset of ['healthz', 'bundle.js', 'assets/start.png', 'assets/map0.json']) {
        expect((await request.get(asset)).ok(), asset).toBeTruthy();
    }
    await page.goto('./');
    await expect(page.locator('canvas')).toBeVisible();
    await expect.poll(() => page.evaluate(() => window.littleStepsGame?.scene.isActive('MenuScene')), { timeout: 15_000 }).toBe(true);
    await expect.poll(() => page.evaluate(() => window.littleStepsGame?.textures.exists('menu_bg'))).toBe(true);
    await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    await expect.poll(() => page.evaluate(() => document.querySelector('canvas')?.width)).toBe(960);
    await page.screenshot({ path: 'test-results/menu.png' });
    await page.locator('canvas').click({ position: { x: 750, y: 180 } });
    await expect.poll(() => page.evaluate(() => {
        const panel = window.littleStepsGame?.scene.getScene('MenuScene').children.getByName('level-select');
        return Boolean(panel && 'visible' in panel && panel.visible);
    })).toBe(true);
    await page.locator('canvas').click({ position: { x: 480, y: 207 } });
    await expect.poll(() => page.evaluate(() => window.littleStepsGame?.scene.isActive('MainScene')), { timeout: 15_000 }).toBe(true);
    await expect.poll(() => page.evaluate(() => window.littleStepsGame?.registry.get('node'))).toBe(0);
    await expect.poll(() => page.evaluate(() => {
        const intro = window.littleStepsGame?.scene.getScene('MainScene').children.getByName('level-intro');
        return intro && 'y' in intro ? intro.y : undefined;
    })).toBe(320);
    await page.locator('canvas').click({ position: { x: 480, y: 420 } });
    await expect.poll(() => page.evaluate(() => Boolean(window.littleStepsGame?.scene.getScene('MainScene').children.getByName('level-intro')))).toBe(false);
    await expect.poll(() => page.evaluate(() => window.littleStepsGame?.scene.getScene('MainScene').children.getByName('dialogue-blocker')?.listenerCount('pointerdown'))).toBe(1);
    await page.locator('canvas').click({ position: { x: 480, y: 570 } });
    await expect.poll(() => page.evaluate(() => Boolean(window.littleStepsGame?.scene.getScene('MainScene').children.getByName('tutorial-dialogue')))).toBe(false);
    await page.locator('canvas').click({ position: { x: 300, y: 400 } });
    await expect.poll(() => page.evaluate(() => window.littleStepsGame?.registry.get('node')), { timeout: 10_000 }).toBe(1);
    await expect.poll(() => page.evaluate(() => window.littleStepsGame?.registry.get('resources'))).toMatchObject({ time: 50, stamina: 30, bones: 0 });
    await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    await page.screenshot({ path: 'test-results/tutorial.png' });
    expect(errors).toEqual([]);
    expect(failedAssets).toEqual([]);
});
