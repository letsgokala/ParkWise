import { CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
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

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
