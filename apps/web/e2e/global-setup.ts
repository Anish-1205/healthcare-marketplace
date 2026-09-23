import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';

// Use the same isolated, migrated and seeded database as the API integration suite.
export default async function globalSetup() {
  const cwd = path.resolve(process.cwd(), '../api');
  const requireApi = createRequire(path.join(cwd, 'package.json'));
  execFileSync(process.execPath, [requireApi.resolve('tsx/cli'), 'tests/prepare-e2e.ts'], { cwd, env: process.env, stdio: 'inherit' });
}
