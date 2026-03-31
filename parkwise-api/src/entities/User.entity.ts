import { Column, CreateDateColumn, Entity, OneToOne, PrimaryColumn } from 'typeorm';
import { DriverEntity } from './Driver.entity';
import { ParkingAdminEntity } from './ParkingAdmin.entity';

@Entity('users')
export class UserEntity {
  @PrimaryColumn({ type: 'text' })
  id!: string;

  @Column({ type: 'text', unique: true })
  email!: string;

  @Column({ name: 'password_hash', type: 'text' })
  passwordHash!: string;

  @Column({ type: 'text' })
  role!: string;

  @Column({ name: 'display_name', type: 'text' })
  displayName!: string;

  @Column({ name: 'phone_number', type: 'text', nullable: true })
  phoneNumber!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @OneToOne(() => DriverEntity, (driver) => driver.user)
  driver?: DriverEntity;

  @OneToOne(() => ParkingAdminEntity, (parkingAdmin) => parkingAdmin.user)
  parkingAdmin?: ParkingAdminEntity;
}
