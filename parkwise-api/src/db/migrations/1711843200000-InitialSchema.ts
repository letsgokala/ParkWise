import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { MigrationInterface, QueryRunner } from 'typeorm';
import { seedFacilities } from '../seeds/seedFacilities';
import { env } from '../../config/env';

export class InitialSchema1711843200000 implements MigrationInterface {
  name = 'InitialSchema1711843200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('driver', 'parking_admin', 'sys_admin')),
        display_name TEXT NOT NULL,
        phone_number TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS parking_locations (
        id TEXT PRIMARY KEY,
        facility_name TEXT NOT NULL,
        address TEXT NOT NULL,
        latitude DOUBLE PRECISION NOT NULL,
        longitude DOUBLE PRECISION NOT NULL,
        total_spaces INTEGER NOT NULL CHECK (total_spaces >= 0),
        available_spaces INTEGER NOT NULL CHECK (available_spaces >= 0),
        price_per_hour DOUBLE PRECISION NOT NULL CHECK (price_per_hour >= 0),
        status TEXT NOT NULL CHECK (status IN ('Pending', 'Verified', 'Full', 'Suspended')),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS drivers (
        user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        phone_number TEXT NOT NULL,
        account_status TEXT NOT NULL DEFAULT 'Active' CHECK (account_status IN ('Active', 'Suspended', 'Banned')),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS parking_admins (
        user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        facility_id TEXT UNIQUE REFERENCES parking_locations(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    for (const facility of seedFacilities) {
      await queryRunner.query(
        `
          INSERT INTO parking_locations (
            id, facility_name, address, latitude, longitude,
            total_spaces, available_spaces, price_per_hour, status
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          ON CONFLICT (id) DO NOTHING
        `,
        [
          facility.id,
          facility.facilityName,
          facility.address,
          facility.latitude,
          facility.longitude,
          facility.totalSpaces,
          facility.availableSpaces,
          facility.pricePerHour,
          facility.status,
        ]
      );
    }

    const sysAdminPasswordHash = await bcrypt.hash(env.systemAdmin.password, 10);
    const sysAdminId = randomUUID();
    await queryRunner.query(
      `
        INSERT INTO users (id, email, password_hash, role, display_name)
        VALUES ($1, $2, $3, 'sys_admin', $4)
        ON CONFLICT (email) DO NOTHING
      `,
      [sysAdminId, env.systemAdmin.email, sysAdminPasswordHash, env.systemAdmin.name]
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS parking_admins`);
    await queryRunner.query(`DROP TABLE IF EXISTS drivers`);
    await queryRunner.query(`DROP TABLE IF EXISTS parking_locations`);
    await queryRunner.query(`DROP TABLE IF EXISTS users`);
  }
}
