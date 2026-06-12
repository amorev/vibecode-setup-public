import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from '../users/entities/user.entity';
import { SettingsEntity } from '../settings/entities/settings.entity';
import { ReminderEntity } from '../reminders/entities/reminder.entity';
import { EventEntity } from '../events/entities/event.entity';

const ENTITIES = [UserEntity, SettingsEntity, ReminderEntity, EventEntity];

const dbType = process.env.DB_TYPE || 'sqlite';

const databaseConfig =
  dbType === 'postgres'
    ? {
        type: 'postgres' as const,
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432', 10),
        username: process.env.DB_USERNAME || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
        database: process.env.DB_DATABASE || 'vibe_setup_ui',
        entities: ENTITIES,
        synchronize: true,
      }
    : {
        type: 'sqlite' as const,
        database: process.env.DB_SQLITE_PATH || './data/database.sqlite',
        entities: ENTITIES,
        synchronize: true,
      };

@Module({
  imports: [
    TypeOrmModule.forRoot({
      ...databaseConfig,
      logging: process.env.DB_LOGGING === 'true',
    }),
  ],
})
export class DatabaseModule {}
