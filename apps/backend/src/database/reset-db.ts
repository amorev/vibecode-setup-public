import 'dotenv/config';
import { DataSource } from 'typeorm';
import { UserEntity } from '../users/entities/user.entity';

const dbType = process.env.DB_TYPE || 'sqlite';

const dataSource = new DataSource(
  dbType === 'postgres'
    ? {
        type: 'postgres' as const,
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432', 10),
        username: process.env.DB_USERNAME || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
        database: process.env.DB_DATABASE || 'vibe_setup_ui',
        entities: [UserEntity],
        synchronize: true,
      }
    : {
        type: 'sqlite' as const,
        database: process.env.DB_SQLITE_PATH || './data/database.sqlite',
        entities: [UserEntity],
        synchronize: true,
      }
);

async function resetDatabase() {
  await dataSource.initialize();
  console.log('Dropping and recreating database schema...');
  await dataSource.query('DROP TABLE IF EXISTS "user"');
  await dataSource.synchronize(true);
  console.log('Database reset complete.');
  await dataSource.destroy();
  process.exit(0);
}

resetDatabase().catch((err) => {
  console.error('Failed to reset database:', err);
  process.exit(1);
});
