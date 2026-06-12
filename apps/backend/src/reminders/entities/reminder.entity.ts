import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { UserEntity } from '../../users/entities/user.entity';

@Entity('reminder')
export class ReminderEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @Column({ name: 'user_id' })
  userId: number;

  @Column()
  text: string;

  @Column({ type: 'datetime' })
  scheduledAt: Date;

  /** true = recurring reminder, false = one-time */
  @Column({ default: false })
  isRecurring: boolean;

  /** ISO day-of-week numbers (1=Mon … 7=Sun), stored as JSON. Only meaningful when isRecurring = true */
  @Column({ type: 'simple-array', nullable: true })
  weekdays: number[] | null;

  /** true = already sent to Telegram (for one-time reminders) */
  @Column({ default: false })
  isSent: boolean;

  /** Timestamp of the last time this reminder was sent to Telegram (for recurring dedup) */
  @Column({ type: 'datetime', nullable: true })
  lastSent: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
