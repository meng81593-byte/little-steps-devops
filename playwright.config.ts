import { defineConfig } from '@playwright/test';
export default defineConfig({
    testDir: './tests/e2e',
    timeout: 30_000,
    retries: process.env.CI ? 1 : 0,
    reporter: [['list'], ['html', { open: 'never' }]],
    use: {
        baseURL: process.env.BASE_URL ?? 'http://127.0.0.1:8080',
        viewport: { width: 960, height: 640 },
        screenshot: 'only-on-failure',
        trace: 'retain-on-failure',
        launchOptions: { args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] },
    },
    webServer: process.env.BASE_URL ? undefined : {
        command: 'npm run serve',
        url: 'http://127.0.0.1:8080/healthz',
        reuseExistingServer: !process.env.CI,
    },
});
