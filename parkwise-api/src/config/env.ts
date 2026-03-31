import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const rootEnvPath = path.resolve(currentDir, '../../../.env');

dotenv.config({ path: rootEnvPath });

export const env = {
  clientUrl: process.env.CLIENT_URL || 'http://localhost:3000',
  port: Number(process.env.PORT || 4000),
  jwtSecret: process.env.JWT_SECRET || 'parkwise-local-secret',
  postgres: {
    host: process.env.PGHOST || 'localhost',
    port: Number(process.env.PGPORT || 5432),
    username: process.env.PGUSER || 'postgres',
    password: process.env.PGPASSWORD || '',
    database: process.env.PGDATABASE || 'parkwise',
  },
  systemAdmin: {
    email: process.env.SYS_ADMIN_EMAIL || 'sysadmin@parkwise.local',
    password: process.env.SYS_ADMIN_PASSWORD || 'ParkWiseAdmin123!',
    name: process.env.SYS_ADMIN_NAME || 'System Admin',
  },
} as const;
