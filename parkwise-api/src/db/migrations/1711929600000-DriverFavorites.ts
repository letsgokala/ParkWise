import { MigrationInterface, QueryRunner } from 'typeorm';

export class DriverFavorites1711929600000 implements MigrationInterface {
  name = 'DriverFavorites1711929600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS driver_favorites (
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        facility_id TEXT NOT NULL REFERENCES parking_locations(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (user_id, facility_id)
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS driver_favorites`);
  }
}
