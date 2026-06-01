import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { z } from 'zod';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const rootEnvPath = path.resolve(currentDir, '../../../.env');
const apiEnvPath = path.resolve(currentDir, '../../.env');

// Root .env is the single source of truth; an API-local .env can override.
dotenv.config({ path: rootEnvPath });
dotenv.config({ path: apiEnvPath, override: false });

// Backwards-compatible fallback: if DATABASE_URL is not provided but legacy
// PG* variables are, build the connection string from them.
if (!process.env.DATABASE_URL && process.env.PGHOST) {
  const user = encodeURIComponent(process.env.PGUSER || 'postgres');
  const password = encodeURIComponent(process.env.PGPASSWORD || '');
  const host = process.env.PGHOST;
  const port = process.env.PGPORT || '5432';
  const database = process.env.PGDATABASE || 'parkwise';
  process.env.DATABASE_URL = `postgresql://${user}:${password}@${host}:${port}/${database}?schema=public`;
}

const isProduction = process.env.NODE_ENV === 'production';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  CLIENT_URL: z.string().url().default('http://localhost:3000'),
  API_URL: z.string().url().default('http://localhost:4000'),
  // Defaulted so importing the app never hard-crashes in dev/test; a real URL
  // must be provided via .env to actually connect (see README).
  DATABASE_URL: z
    .string()
    .min(1)
    .default('postgresql://parkwise:parkwise@localhost:5432/parkwise?schema=public'),
  SESSION_SECRET: z
    .string()
    .min(16, 'SESSION_SECRET must be at least 16 characters')
    .default('parkwise-dev-session-secret-change-me'),
  SESSION_TTL_HOURS: z.coerce.number().int().positive().default(168),
  APP_ENCRYPTION_KEY: z.string().default('parkwise-dev-encryption-key-change-me-please'),
  COOKIE_SECURE: z
    .string()
    .optional()
    .transform((v) => v === 'true'),
  SYS_ADMIN_EMAIL: z.string().email().default('sysadmin@parkwise.local'),
  SYS_ADMIN_PASSWORD: z.string().min(8).default('ParkWiseAdmin123!'),
  SYS_ADMIN_NAME: z.string().default('System Admin'),
  ROUTING_PROVIDER_URL: z.string().optional().default(''),
  GOOGLE_MAPS_API_KEY: z.string().optional().default(''),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // Fail fast with a readable message rather than crashing deep in a query.
  console.error('❌ Invalid environment configuration:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

const data = parsed.data;

// Propagate the resolved URL so the Prisma client (which reads raw process.env)
// picks up defaults / PG*-derived values when DATABASE_URL was not set directly.
process.env.DATABASE_URL = data.DATABASE_URL;

if (isProduction) {
  if (data.SESSION_SECRET.includes('change-me')) {
    throw new Error('SESSION_SECRET must be set to a strong value in production.');
  }
  if (data.APP_ENCRYPTION_KEY.includes('change-me')) {
    throw new Error('APP_ENCRYPTION_KEY must be set to a strong value in production.');
  }
}

export const env = {
  nodeEnv: data.NODE_ENV,
  isProduction,
  isTest: data.NODE_ENV === 'test',
  port: data.PORT,
  clientUrl: data.CLIENT_URL,
  apiUrl: data.API_URL,
  databaseUrl: data.DATABASE_URL,
  sessionSecret: data.SESSION_SECRET,
  sessionTtlHours: data.SESSION_TTL_HOURS,
  encryptionKey: data.APP_ENCRYPTION_KEY,
  cookieSecure: data.COOKIE_SECURE ?? false,
  systemAdmin: {
    email: data.SYS_ADMIN_EMAIL.toLowerCase(),
    password: data.SYS_ADMIN_PASSWORD,
    name: data.SYS_ADMIN_NAME,
  },
  routingProviderUrl: data.ROUTING_PROVIDER_URL,
  googleMapsApiKey: data.GOOGLE_MAPS_API_KEY,
} as const;
