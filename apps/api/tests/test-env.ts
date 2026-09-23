/**
 * Integration tests run against a separate database so they never disturb live demo data.
 * Override with TEST_DATABASE_URL.
 */
export const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? 'postgresql://carebridge:carebridge@localhost:5433/carebridge_test?schema=public';

export function applyTestEnv() {
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = TEST_DATABASE_URL;
  process.env.DEMO_MODE = 'true';
  process.env.LOG_REQUESTS = 'false';
}
