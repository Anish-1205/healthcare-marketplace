import { defineConfig } from '@playwright/test';

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
    baseURL: 'http://127.0.0.1:5174',
    channel: 'msedge',
    headless: true,
    trace: 'retain-on-failure',
  },
  webServer: [
    {
      command: 'pnpm --dir ../api exec tsx src/server.ts',
      url: 'http://127.0.0.1:4001/api/v1/health',
      env: { PORT: '4001', DATABASE_URL: process.env.TEST_DATABASE_URL ?? 'postgresql://carebridge:carebridge@localhost:5433/carebridge_test?schema=public', CORS_ORIGIN: 'http://127.0.0.1:5174', LOG_REQUESTS: 'false' },
      reuseExistingServer: false,
      timeout: 30_000,
    },
    {
      command: 'pnpm dev --host 127.0.0.1 --port 5174 --strictPort',
      url: 'http://127.0.0.1:5174',
      env: { VITE_API_URL: 'http://127.0.0.1:4001/api/v1' },
      reuseExistingServer: false,
      timeout: 30_000,
    },
  ],
});
