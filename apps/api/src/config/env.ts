import 'dotenv/config';
import { z } from 'zod';

const DEV_JWT_SECRET = 'carebridge-dev-only-jwt-secret-change-me-0001';

const booleanFromString = z
  .enum(['true', 'false', '1', '0'])
  .transform((value) => value === 'true' || value === '1');

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters').default(DEV_JWT_SECRET),
  JWT_EXPIRES_IN: z.string().default('12h'),
  DEMO_MODE: booleanFromString.default(true),
  DEMO_SCENARIO_STATE: z.enum(['ready', 'complete']).default('ready'),
  LOG_REQUESTS: booleanFromString.default(true),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues.map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`).join('\n');
  // eslint-disable-next-line no-console
  console.error(`Invalid environment configuration:\n${issues}`);
  process.exit(1);
}

export const env = parsed.data;

if (env.NODE_ENV === 'production' && env.JWT_SECRET === DEV_JWT_SECRET) {
  // eslint-disable-next-line no-console
  console.error('Refusing to start: set a real JWT_SECRET in production.');
  process.exit(1);
}

export const isProduction = env.NODE_ENV === 'production';
/** Dev-only helpers such as demo data reset are never available in production. */
export const devToolsEnabled = env.DEMO_MODE && !isProduction;
