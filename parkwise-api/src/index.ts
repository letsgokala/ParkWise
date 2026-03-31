import { app } from './app';
import { env } from './config/env';
import { AppDataSource } from './db/data-source';

async function bootstrap() {
  await AppDataSource.initialize();
  await AppDataSource.runMigrations();

  app.listen(env.port, () => {
    console.log(`ParkWise API running on http://localhost:${env.port}`);
  });
}

bootstrap().catch((error) => {
  console.error('Failed to initialize database:', error);
  process.exit(1);
});
