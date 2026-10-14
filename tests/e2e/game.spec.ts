import { expect, test } from '@playwright/test';
test('production game reaches home and unlocks the next trail without browser errors', async ({ page, request }) => {
    const errors: string[] = [];
    const failedAssets: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('response', response => {
        if (response.url().includes('/assets/') && response.status() >= 400) failedAssets.push(response.url());
    });
    for (const asset of [process.env.HEALTH_PATH ?? 'healthz', 'bundle.js', 'assets/start.png', 'assets/map0.json']) {
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
    await page.screenshot({ path: 'test-results/pixel-intro.png' });
    await page.locator('canvas').click({ position: { x: 480, y: 430 } });
    await expect.poll(() => page.evaluate(() => Boolean(window.littleStepsGame?.scene.getScene('MainScene').children.getByName('level-intro')))).toBe(false);
    await expect.poll(() => page.evaluate(() => window.littleStepsGame?.scene.getScene('MainScene').children.getByName('dialogue-blocker')?.listenerCount('pointerdown'))).toBe(1);
    await page.locator('canvas').click({ position: { x: 480, y: 570 } });
    await expect.poll(() => page.evaluate(() => Boolean(window.littleStepsGame?.scene.getScene('MainScene').children.getByName('tutorial-dialogue')))).toBe(false);
    await page.locator('canvas').click({ position: { x: 300, y: 400 } });
    await expect.poll(() => page.evaluate(() => window.littleStepsGame?.registry.get('node')), { timeout: 10_000 }).toBe(1);
    await expect.poll(() => page.evaluate(() => window.littleStepsGame?.registry.get('resources'))).toMatchObject({ time: 50, stamina: 30, bones: 0 });
    await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    await page.screenshot({ path: 'test-results/tutorial.png' });
    // Complete the actual tutorial through pointer input: dismiss each lesson,
    // collect the bone, reach home, then use the unlocked next-trail button.
    const dismissLesson = async () => {
        await expect.poll(() => page.evaluate(() => window.littleStepsGame?.scene.getScene('MainScene').children.getByName('dialogue-blocker')?.listenerCount('pointerdown'))).toBe(1);
        await page.locator('canvas').click({ position: { x: 480, y: 570 } });
        await expect.poll(() => page.evaluate(() => Boolean(window.littleStepsGame?.scene.getScene('MainScene').children.getByName('tutorial-dialogue')))).toBe(false);
    };
    await dismissLesson();
    await page.locator('canvas').click({ position: { x: 480, y: 250 } });
    await expect.poll(() => page.evaluate(() => window.littleStepsGame?.registry.get('node'))).toBe(2);
    await expect.poll(() => page.evaluate(() => window.littleStepsGame?.registry.get('resources'))).toMatchObject({ time: 35, stamina: 20, bones: 1 });
    await dismissLesson();
    await page.locator('canvas').click({ position: { x: 660, y: 360 } });
    await expect.poll(() => page.evaluate(() => window.littleStepsGame?.registry.get('node'))).toBe(4);
    await page.locator('canvas').click({ position: { x: 830, y: 420 } });
    await expect.poll(() => page.evaluate(() => window.littleStepsGame?.registry.get('goalReached'))).toBe(true);
    await expect.poll(() => page.evaluate(() => window.littleStepsGame?.registry.get('finalResources'))).toMatchObject({ time: 15, stamina: 10, bones: 1 });
    await expect.poll(() => page.evaluate(() => localStorage.getItem('little-steps-progress-v1'))).toBe('[0]');
    await expect.poll(() => page.evaluate(() => {
        const popup = window.littleStepsGame?.scene.getScene('HudScene').children.getByName('win-popup');
        return popup && 'alpha' in popup ? popup.alpha : undefined;
    })).toBe(1);
    await page.screenshot({ path: 'test-results/pixel-victory.png' });
    await page.locator('canvas').click({ position: { x: 628, y: 429 } });
    await expect.poll(() => page.evaluate(() => window.littleStepsGame?.registry.get('levelIndex'))).toBe(1);
    expect(errors).toEqual([]);
    expect(failedAssets).toEqual([]);
});
