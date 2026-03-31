import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { env } from '../config/env';
import { DriverEntity } from '../entities/Driver.entity';
import { ParkingAdminEntity } from '../entities/ParkingAdmin.entity';
import { ParkingLocationEntity } from '../entities/ParkingLocation.entity';
import { UserEntity } from '../entities/User.entity';
import { InitialSchema1711843200000 } from './migrations/1711843200000-InitialSchema';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: env.postgres.host,
  port: env.postgres.port,
  username: env.postgres.username,
  password: env.postgres.password,
  database: env.postgres.database,
  entities: [UserEntity, DriverEntity, ParkingLocationEntity, ParkingAdminEntity],
  migrations: [InitialSchema1711843200000],
  synchronize: false,
  logging: false,
});
