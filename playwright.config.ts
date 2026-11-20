import { defineConfig, devices } from '@playwright/test';

const PORT = 4173;
const CI = !!process.env.CI;

/**
 * End-to-end tests run the built app in demo mode (nobody signed in), so they never touch the farm
 * records. The Supabase settings below point nowhere and override the real ones in .env.
 */
export default defineConfig({
  testDir: 'e2e',
  // *.e2e.ts, not *.spec.ts / *.test.ts, so Vitest doesn't pick these up.
  testMatch: '**/*.e2e.ts',
  fullyParallel: true,
  forbidOnly: CI,
  retries: CI ? 1 : 0,
  reporter: CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    ...devices['Pixel 7'],
    baseURL: `http://localhost:${PORT}`,
    // The PWA service worker would cache pages between tests.
    serviceWorkers: 'block',
    trace: 'on-first-retry',
  },
  webServer: {
    command: `npx vite build && npx vite preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !CI,
    timeout: 120_000,
    env: {
      VITE_SUPABASE_URL: 'http://127.0.0.1:54321',
      VITE_SUPABASE_ANON_KEY: 'e2e-placeholder-key',
    },
  },
});
