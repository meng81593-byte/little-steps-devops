import { expect, test } from '@playwright/test';
test('production game loads required assets without browser errors', async ({ page, request }) => {
    const errors: string[] = [];
    const failedAssets: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('response', response => {
        if (response.url().includes('/assets/') && response.status() >= 400) failedAssets.push(response.url());
    });
    for (const asset of ['/healthz', '/bundle.js', '/assets/start.png', '/assets/map0.json']) {
        expect((await request.get(asset)).ok(), asset).toBeTruthy();
    }
    await page.goto('/');
    await expect(page.locator('canvas')).toBeVisible();
    await expect.poll(() => page.evaluate(() => document.querySelector('canvas')?.width)).toBe(960);
    await page.screenshot({ path: 'test-results/menu.png' });
    expect(errors).toEqual([]);
    expect(failedAssets).toEqual([]);
});
