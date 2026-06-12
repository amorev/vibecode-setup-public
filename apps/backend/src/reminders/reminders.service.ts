import { Injectable, NotFoundException, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import * as cron from 'node-cron';
import { ReminderEntity } from './entities/reminder.entity';
import { CreateReminderDto } from './dto/create-reminder.dto';
import { UpdateReminderDto } from './dto/update-reminder.dto';
import { SettingsService } from '../settings/settings.service';
import { UsersService } from '../users/users.service';

export interface ReminderResponse {
  id: number;
  userId: number;
  text: string;
  scheduledAt: Date;
  isRecurring: boolean;
  weekdays: number[] | null;
  isSent: boolean;
  lastSent: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class RemindersService implements OnModuleInit {
  private readonly logger = new Logger(RemindersService.name);

  constructor(
    @InjectRepository(ReminderEntity)
    private readonly remindersRepo: Repository<ReminderEntity>,
    private readonly settingsService: SettingsService,
    private readonly usersService: UsersService,
  ) {}

  async onModuleInit() {
    // Schedule cron to run every minute
    cron.schedule('* * * * *', async () => {
      try {
        await this.processDueReminders();
      } catch (error) {
        this.logger.error('Cron job error: ' + JSON.stringify(error));
      }
    });
    this.logger.log('Reminder cron job scheduled (every minute)');
  }

  /** Map entity to response DTO */
  private toResponse(entity: ReminderEntity): ReminderResponse {
    return {
      id: entity.id,
      userId: entity.userId,
      text: entity.text,
      scheduledAt: entity.scheduledAt,
      isRecurring: entity.isRecurring,
      weekdays: entity.weekdays,
      isSent: entity.isSent,
      lastSent: entity.lastSent,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }

  async findAll(userId: number, showPast = false): Promise<ReminderResponse[]> {
    const now = new Date();

    if (showPast) {
      // Return all reminders for user (past + future)
      const reminders = await this.remindersRepo.find({
        where: { userId },
        order: { scheduledAt: 'DESC' },
      });
      return reminders.map(this.toResponse);
    }

    // Future reminders only (scheduledAt >= now)
    // For recurring reminders we always show them (they repeat)
    const upcomingNonRecurring = await this.remindersRepo.find({
      where: [
        {
          userId,
          isRecurring: false,
          scheduledAt: MoreThanOrEqual(now),
        },
      ],
      order: { scheduledAt: 'ASC' },
    });

    const recurring = await this.remindersRepo.find({
      where: [
        {
          userId,
          isRecurring: true,
        },
      ],
      order: { createdAt: 'DESC' },
    });

    // Combine: recurring first (sorted by creation), then upcoming non-recurring
    const result = [
      ...recurring.map(this.toResponse),
      ...upcomingNonRecurring.map(this.toResponse),
    ];

    return result;
  }

  async findOne(userId: number, id: number): Promise<ReminderResponse | null> {
    const reminder = await this.remindersRepo.findOne({
      where: { userId, id },
    });
    if (!reminder) return null;
    return this.toResponse(reminder);
  }

  async create(userId: number, dto: CreateReminderDto): Promise<ReminderResponse> {
    const reminder = this.remindersRepo.create({
      userId,
      text: dto.text,
      scheduledAt: dto.scheduledAt,
      isRecurring: dto.isRecurring ?? false,
      weekdays: dto.isRecurring && dto.weekdays ? dto.weekdays : null,
    });
    await this.remindersRepo.save(reminder);
    return this.toResponse(reminder);
  }

  async update(userId: number, id: number, dto: UpdateReminderDto): Promise<ReminderResponse> {
    const reminder = await this.remindersRepo.findOne({
      where: { userId, id },
    });
    if (!reminder) {
      throw new NotFoundException(`Напоминание #${id} не найдено`);
    }

    if (dto.text !== undefined) reminder.text = dto.text;
    if (dto.scheduledAt !== undefined) reminder.scheduledAt = dto.scheduledAt;
    if (dto.isRecurring !== undefined) reminder.isRecurring = dto.isRecurring;
    if (dto.weekdays !== undefined) {
      reminder.weekdays = reminder.isRecurring ? dto.weekdays : null;
    }

    await this.remindersRepo.save(reminder);
    return this.toResponse(reminder);
  }

  async remove(userId: number, id: number): Promise<void> {
    const result = await this.remindersRepo.delete({ userId, id });
    if (result.affected === 0) {
      throw new NotFoundException(`Напоминание #${id} не найдено`);
    }
  }

  // ─── Cron: find due reminders and send via Telegram ────────────────

  /** Called every minute by the cron job. */
  private async processDueReminders() {
    this.logger.log('─── Cron tick: checking reminders ───');

    const settings = await this.settingsService.get();
    if (!settings.telegramBotToken || !settings.telegramChatId) {
      this.logger.log('Telegram not configured — skipping');
      return;
    }

    const now = new Date();
    this.logger.log(`Checking at ${now.toISOString()}`);

    // 1) One-time reminders: scheduledAt <= now AND not yet sent
    const dueOnetime = await this.remindersRepo.find({
      where: {
        isRecurring: false,
        isSent: false,
        scheduledAt: LessThanOrEqual(now),
      },
      order: { scheduledAt: 'ASC' },
      relations: ['user'],
    });
    this.logger.log(`One-time due: ${dueOnetime.length}`);

    // 2) Recurring reminders: check if today matches weekdays AND scheduled time has passed AND not sent today
    const allRecurring = await this.remindersRepo.find({
      where: {
        isRecurring: true,
      },
      relations: ['user'],
    });
    this.logger.log(`Total recurring: ${allRecurring.length}`);

    const dueRecurring: ReminderEntity[] = [];
    const todayDay = now.getDay() === 0 ? 7 : now.getDay();
    const todayStr = now.toISOString().slice(0, 10);

    for (const r of allRecurring) {
      if (!r.weekdays || !r.weekdays.includes(todayDay)) {
        continue;
      }

      const scheduledToday = new Date(`${todayStr}T${r.scheduledAt.toTimeString().slice(0, 8)}`);
      if (scheduledToday > now) {
        continue;
      }

      const lastSent = r.lastSent ? new Date(r.lastSent) : null;
      if (lastSent && lastSent.toISOString().slice(0, 10) === todayStr) {
        this.logger.log(`  Recurring #${r.id} already sent today — skip`);
        continue;
      }

      dueRecurring.push(r);
    }
    this.logger.log(`Recurring due: ${dueRecurring.length}`);

    const dueReminders = [...dueOnetime, ...dueRecurring];
    if (dueReminders.length === 0) {
      this.logger.log('No reminders to send this tick');
      return;
    }

    this.logger.log(`Sending ${dueReminders.length} reminder(s) to Telegram...`);

    for (const reminder of dueReminders) {
      await this.sendToTelegram(settings.telegramBotToken, settings.telegramChatId, reminder);
    }

    this.logger.log('─── Cron tick complete ───');
  }

  /** Send a single reminder to Telegram and mark as sent. */
  private async sendToTelegram(botToken: string, chatId: string, reminder: ReminderEntity) {
    const userName = reminder.user?.login || `User #${reminder.userId}`;

    const text = reminder.isRecurring
      ? `🔁 ${reminder.text}\n👤 ${userName}`
      : `⏰ ${reminder.text}\n👤 ${userName}`;

    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text,
        }),
      });

      const data = await response.json();

      if (!data.ok) {
        this.logger.error(`Telegram send failed for reminder #${reminder.id}: ${data.description}`);
        return;
      }

      // Mark one-time as sent; recurring as "sent today"
      if (!reminder.isRecurring) {
        reminder.isSent = true;
      }
      reminder.lastSent = new Date();
      await this.remindersRepo.save(reminder);
      this.logger.log(`Reminder #${reminder.id} sent to Telegram`);
    } catch (error) {
      this.logger.error(`Network error sending reminder #${reminder.id}: ${JSON.stringify(error)}`);
    }
  }
}
