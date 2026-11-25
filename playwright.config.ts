/**
 * End-to-end checks: WebKit with touch, against `vite preview` of the production build (service
 * worker included) at /solostudio/, at iPad portrait and iPad landscape.
 * No retries: a flaky check should show up as a failure, not hide behind a second run.
 */
import { defineConfig } from '@playwright/test'

const PORT = Number(process.env.PW_PORT) || 4174
const CI = !!process.env.CI

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  workers: process.env.PW_WORKERS ? Number(process.env.PW_WORKERS) : CI ? 2 : 3,
  forbidOnly: CI,
  retries: 0,
  reporter: 'list',
  timeout: 90_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: `http://localhost:${PORT}/solostudio/`,
    browserName: 'webkit',
    hasTouch: true,
    locale: 'en-GB',
    // Stand-ins answer for YouTube through request routing, which a service worker would bypass, so
    // workers are off except in the offline and update specs (they turn them on themselves).
    serviceWorkers: 'block',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'ipad-portrait', use: { viewport: { width: 820, height: 1180 }, deviceScaleFactor: 2 } },
    { name: 'ipad-landscape', use: { viewport: { width: 1180, height: 820 }, deviceScaleFactor: 2 } },
  ],
  webServer: {
    command: `npm run build && npx vite preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}/solostudio/`,
    reuseExistingServer: !CI,
    timeout: 300_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
})
