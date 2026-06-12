import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SettingsEntity } from './entities/settings.entity';
import { UpdateSettingsDto } from './dto/update-settings.dto';

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(SettingsEntity)
    private readonly settingsRepo: Repository<SettingsEntity>,
  ) {}

  /** Get the first (and only) settings row, creating one if it doesn't exist. */
  async get(): Promise<Omit<SettingsEntity, 'id' | 'createdAt' | 'updatedAt'>> {
    let settings = await this.settingsRepo.createQueryBuilder('s')
      .orderBy('s.id', 'ASC')
      .limit(1)
      .getOne();
    if (!settings) {
      settings = this.settingsRepo.create({});
      await this.settingsRepo.save(settings);
    }
    const { id: _, createdAt: __, updatedAt: ___, ...rest } = settings;
    return rest;
  }

  /** Update the first settings row. Creates one if it doesn't exist. */
  async update(dto: UpdateSettingsDto): Promise<Omit<SettingsEntity, 'id' | 'createdAt' | 'updatedAt'>> {
    let settings = await this.settingsRepo.createQueryBuilder('s')
      .orderBy('s.id', 'ASC')
      .limit(1)
      .getOne();
    if (!settings) {
      settings = this.settingsRepo.create({});
    }

    if (dto.telegramBotToken !== undefined) {
      settings.telegramBotToken = dto.telegramBotToken || null;
    }
    if (dto.telegramChatId !== undefined) {
      settings.telegramChatId = dto.telegramChatId || null;
    }

    await this.settingsRepo.save(settings);
    const { id: _, createdAt: __, updatedAt: ___, ...rest } = settings;
    return rest;
  }

  /** Send a test message "тест" to the configured Telegram chat. */
  async sendTestMessage(): Promise<{ ok: boolean; message: string }> {
    const settings = await this.settingsRepo.createQueryBuilder('s')
      .orderBy('s.id', 'ASC')
      .limit(1)
      .getOne();

    if (!settings?.telegramBotToken) {
      return { ok: false, message: 'Токен бота не установлен' };
    }
    if (!settings?.telegramChatId) {
      return { ok: false, message: 'Chat ID не установлен' };
    }

    const url = `https://api.telegram.org/bot${settings.telegramBotToken}/sendMessage`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: settings.telegramChatId,
        text: 'тест',
      }),
    });

    const data = await response.json();

    if (!data.ok) {
      return {
        ok: false,
        message: data.description || `Telegram API error ${response.status}`,
      };
    }

    return { ok: true, message: 'Тестовое сообщение отправлено' };
  }
}
