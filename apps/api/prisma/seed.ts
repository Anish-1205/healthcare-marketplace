/* eslint-disable no-console */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { seedDatabase, type ScenarioState } from '../src/demo/seed';

async function main() {
  const prisma = new PrismaClient();
  const arg = process.argv.find((value) => value.startsWith('--scenario='))?.split('=')[1];
  const scenarioState = (arg ?? process.env.DEMO_SCENARIO_STATE ?? 'ready') as ScenarioState;
  if (scenarioState !== 'ready' && scenarioState !== 'complete') {
    throw new Error(`Unknown scenario "${scenarioState}". Use "ready" or "complete".`);
  }

  const started = Date.now();
  try {
    await seedDatabase(prisma, { scenarioState, log: (message) => console.log(message) });
    console.log(`Seed complete in ${((Date.now() - started) / 1000).toFixed(1)}s. Demo password: Demo@123`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
