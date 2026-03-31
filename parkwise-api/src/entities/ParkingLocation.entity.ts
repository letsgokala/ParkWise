import { Column, CreateDateColumn, Entity, OneToOne, PrimaryColumn } from 'typeorm';
import { ParkingAdminEntity } from './ParkingAdmin.entity';

@Entity('parking_locations')
export class ParkingLocationEntity {
  @PrimaryColumn({ type: 'text' })
  id!: string;

  @Column({ name: 'facility_name', type: 'text' })
  facilityName!: string;

  @Column({ type: 'text' })
  address!: string;

  @Column({ type: 'double precision' })
  latitude!: number;

  @Column({ type: 'double precision' })
  longitude!: number;

  @Column({ name: 'total_spaces', type: 'integer' })
  totalSpaces!: number;

  @Column({ name: 'available_spaces', type: 'integer' })
  availableSpaces!: number;

  @Column({ name: 'price_per_hour', type: 'double precision' })
  pricePerHour!: number;

  @Column({ type: 'text' })
  status!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @OneToOne(() => ParkingAdminEntity, (parkingAdmin) => parkingAdmin.facility)
  parkingAdmin?: ParkingAdminEntity;
}
