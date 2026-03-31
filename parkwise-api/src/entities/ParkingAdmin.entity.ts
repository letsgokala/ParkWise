import { CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToOne, PrimaryColumn, Column } from 'typeorm';
import { ParkingLocationEntity } from './ParkingLocation.entity';
import { UserEntity } from './User.entity';

@Entity('parking_admins')
export class ParkingAdminEntity {
  @PrimaryColumn({ name: 'user_id', type: 'text' })
  userId!: string;

  @OneToOne(() => UserEntity, (user) => user.parkingAdmin, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity;

  @Column({ name: 'facility_id', type: 'text', nullable: true, unique: true })
  facilityId!: string | null;

  @ManyToOne(() => ParkingLocationEntity, (facility) => facility.parkingAdmin, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'facility_id' })
  facility!: ParkingLocationEntity | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
