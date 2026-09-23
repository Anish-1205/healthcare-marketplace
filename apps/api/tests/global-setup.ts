/* eslint-disable no-console */
import { execSync } from 'node:child_process';
import path from 'node:path';
import { applyTestEnv, TEST_DATABASE_URL } from './test-env';

/** Migrate and seed the test database once per test run. */
export default async function globalSetup() {
  applyTestEnv();
  const cwd = path.resolve(__dirname, '..');
  const env = { ...process.env, DATABASE_URL: TEST_DATABASE_URL };

  try {
    execSync('npx prisma migrate deploy', { cwd, env, stdio: 'pipe' });
  } catch (error) {
    const output = (error as { stderr?: Buffer; stdout?: Buffer }).stderr?.toString() || String(error);
    throw new Error(
      `Could not migrate the test database (${TEST_DATABASE_URL.replace(/:[^:@]+@/, ':***@')}).\n` +
        `Is PostgreSQL running (pnpm db:up) and does the database exist?\n\n${output.trim()}`,
    );
  }

  const { PrismaClient } = await import('@prisma/client');
  const { seedDatabase } = await import('../src/demo/seed');
  const prisma = new PrismaClient({ datasources: { db: { url: TEST_DATABASE_URL } } });
  try {
    await seedDatabase(prisma, { scenarioState: 'ready' });
  } finally {
    await prisma.$disconnect();
  }
}
