import { defineConfig } from '@playwright/test';
const localUrl = `http://127.0.0.1:${process.env.PORT ?? '8080'}`;
export default defineConfig({
    testDir: './tests/e2e',
    timeout: 90_000,
    retries: process.env.CI ? 1 : 0,
    reporter: [['list'], ['html', { open: 'never' }]],
    use: {
        channel: process.env.PLAYWRIGHT_CHANNEL,
        baseURL: process.env.BASE_URL ?? localUrl,
        viewport: { width: 960, height: 640 },
        screenshot: 'only-on-failure',
        trace: 'retain-on-failure',
        launchOptions: { args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] },
    },
    webServer: process.env.BASE_URL ? undefined : {
        command: 'npm run serve',
        url: `${localUrl}/healthz`,
        reuseExistingServer: !process.env.CI,
    },
});
