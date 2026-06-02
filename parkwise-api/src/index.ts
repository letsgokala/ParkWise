import { app } from './app';
import { env } from './config/env';
import { prisma } from './lib/prisma';
import { ensureSystemAdmin } from './lib/bootstrap';

async function bootstrap(): Promise<void> {
  try {
    await prisma.$connect();
    await ensureSystemAdmin();
  } catch (error) {
    console.error(
      '⚠️  Database not ready. Run `npm run db:migrate` (and `npm run db:seed`) first.\n',
      error,
    );
  }

  app.listen(env.port, () => {
    console.log(`🚗 ParkWise API running on http://localhost:${env.port} (${env.nodeEnv})`);
  });
}

void bootstrap();
