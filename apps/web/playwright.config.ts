import { defineConfig } from '@playwright/test';
import { API_PORT, API_URL, WEB_PORT, WEB_URL } from './e2e/environment';

// Playwright needs taskkill to stop child servers on Windows, including IDE shells
// whose PATH omits System32.
if (process.platform === 'win32') process.env.PATH = `${process.env.SystemRoot ?? 'C:\\Windows'}\\System32;${process.env.PATH ?? ''}`;

export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.ts',
  fullyParallel: false,
  workers: 1,
  timeout: 30_000,
  use: {
    baseURL: WEB_URL,
    channel: 'msedge',
    headless: true,
    trace: 'retain-on-failure',
  },
  webServer: [
    {
      command: 'pnpm --dir ../api exec tsx src/server.ts',
      url: `${API_URL}/health`,
      env: { PORT: String(API_PORT), DATABASE_URL: process.env.TEST_DATABASE_URL ?? 'postgresql://carebridge:carebridge@localhost:5433/carebridge_test?schema=public', CORS_ORIGIN: WEB_URL, LOG_REQUESTS: 'false' },
      reuseExistingServer: false,
      timeout: 30_000,
    },
    {
      command: `pnpm dev --host 127.0.0.1 --port ${WEB_PORT} --strictPort`,
      url: WEB_URL,
      env: { VITE_API_URL: API_URL },
      reuseExistingServer: false,
      timeout: 30_000,
    },
  ],
});
