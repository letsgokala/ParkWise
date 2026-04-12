import { MigrationInterface, QueryRunner } from 'typeorm';

export class DriverFavoriteAlerts1712016000000 implements MigrationInterface {
  name = 'DriverFavoriteAlerts1712016000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE driver_favorites
      ADD COLUMN IF NOT EXISTS notify_on_availability BOOLEAN NOT NULL DEFAULT TRUE,
      ADD COLUMN IF NOT EXISTS notify_on_price_drop BOOLEAN NOT NULL DEFAULT TRUE,
      ADD COLUMN IF NOT EXISTS last_seen_available_spaces INTEGER,
      ADD COLUMN IF NOT EXISTS last_seen_price_per_hour DOUBLE PRECISION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE driver_favorites
      DROP COLUMN IF EXISTS last_seen_price_per_hour,
      DROP COLUMN IF EXISTS last_seen_available_spaces,
      DROP COLUMN IF EXISTS notify_on_price_drop,
      DROP COLUMN IF EXISTS notify_on_availability
    `);
  }
}
