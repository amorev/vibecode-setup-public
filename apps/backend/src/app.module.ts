import { Module, OnModuleInit } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { SettingsModule } from './settings/settings.module';
import { RemindersModule } from './reminders/reminders.module';
import { EventsModule } from './events/events.module';
import { UsersService } from './users/users.service';

@Module({
  imports: [
    DatabaseModule,
    AuthModule,
    UsersModule,
    SettingsModule,
    RemindersModule,
    EventsModule,
  ],
})
export class AppModule implements OnModuleInit {
  constructor(
    private readonly usersService: UsersService,
  ) {}

  async onModuleInit() {
    // Seed default admin on startup if no users exist
    await this.seedAdmin();
    console.log('Database seeded if needed.');
  }

  private async seedAdmin() {
    const count = await this.usersService.count();
    if (count.total > 0) return;

    const login = process.env.ADMIN_LOGIN || 'admin';
    const password = process.env.ADMIN_PASSWORD || 'admin';

    try {
      await this.usersService.create({ login, password, role: 'admin' });
      console.log(`Admin "${login}" created (password: ${password})`);
    } catch (e: any) {
      // User already exists (race condition during seed)
      console.log(`Admin "${login}" already exists.`);
    }
  }
}
