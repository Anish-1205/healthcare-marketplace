import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 30_000,
  use: {
    baseURL: 'http://127.0.0.1:5173',
    channel: 'msedge',
    headless: true,
  },
  webServer: [
    {
      command: 'pnpm --dir ../api dev',
      url: 'http://127.0.0.1:4000/api/v1/health',
      reuseExistingServer: true,
      timeout: 30_000,
    },
    {
      command: 'pnpm dev --host 127.0.0.1',
      url: 'http://127.0.0.1:5173',
      reuseExistingServer: true,
      timeout: 30_000,
    },
  ],
});
