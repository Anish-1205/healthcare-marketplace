import { applyTestEnv } from './test-env';

// Runs in each test worker before any app module (and its PrismaClient) is imported.
applyTestEnv();
