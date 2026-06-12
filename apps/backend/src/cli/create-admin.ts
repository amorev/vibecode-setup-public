import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { UsersService } from '../users/users.service';
import { UsersModule } from '../users/users.module';
import { DatabaseModule } from '../database/database.module';
import { Module } from '@nestjs/common';

@Module({
  imports: [DatabaseModule, UsersModule],
})
class CliModule {}

async function createAdmin(login: string, password: string) {
  const app = await NestFactory.createApplicationContext(CliModule);
  const usersService = app.get(UsersService);

  try {
    const user = await usersService.create({ login, password, role: 'admin' });
    console.log(`✅ Администратор "${user.login}" создан (id: ${user.id})`);
  } catch (error: any) {
    if (error.response) {
      console.error(`❌ Ошибка: ${error.response.message}`);
    } else {
      console.error(`❌ Ошибка: ${error.message || error}`);
    }
    process.exit(1);
  } finally {
    await app.close();
  }
}

// CLI: npx ts-node src/cli/create-admin.ts <login> <password>
// or: npm run create-admin -- login password
const [login, password] = process.argv.slice(2);

if (!login || !password) {
  console.log('Использование: npx ts-node src/cli/create-admin.ts <login> <password>');
  console.log('Пример: npx ts-node src/cli/create-admin.ts admin admin123');
  process.exit(1);
}

createAdmin(login, password);
