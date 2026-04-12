import { CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { Column } from 'typeorm';
import { ParkingLocationEntity } from './ParkingLocation.entity';
import { UserEntity } from './User.entity';

@Entity('driver_favorites')
export class DriverFavoriteEntity {
  @PrimaryColumn({ name: 'user_id', type: 'text' })
  userId!: string;

  @PrimaryColumn({ name: 'facility_id', type: 'text' })
  facilityId!: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity;

  @ManyToOne(() => ParkingLocationEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'facility_id' })
  facility!: ParkingLocationEntity;

  @Column({ name: 'notify_on_availability', type: 'boolean', default: true })
  notifyOnAvailability!: boolean;

  @Column({ name: 'notify_on_price_drop', type: 'boolean', default: true })
  notifyOnPriceDrop!: boolean;

  @Column({ name: 'last_seen_available_spaces', type: 'integer', nullable: true })
  lastSeenAvailableSpaces!: number | null;

  @Column({ name: 'last_seen_price_per_hour', type: 'double precision', nullable: true })
  lastSeenPricePerHour!: number | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
