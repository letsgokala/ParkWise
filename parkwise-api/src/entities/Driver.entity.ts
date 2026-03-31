import { Column, CreateDateColumn, Entity, JoinColumn, OneToOne, PrimaryColumn } from 'typeorm';
import { UserEntity } from './User.entity';

@Entity('drivers')
export class DriverEntity {
  @PrimaryColumn({ name: 'user_id', type: 'text' })
  userId!: string;

  @OneToOne(() => UserEntity, (user) => user.driver, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity;

  @Column({ name: 'phone_number', type: 'text' })
  phoneNumber!: string;

  @Column({ name: 'account_status', type: 'text', default: 'Active' })
  accountStatus!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
