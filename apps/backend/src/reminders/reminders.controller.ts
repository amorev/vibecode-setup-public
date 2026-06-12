import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query, Request } from '@nestjs/common';
import { RemindersService } from './reminders.service';
import { CreateReminderDto } from './dto/create-reminder.dto';
import { UpdateReminderDto } from './dto/update-reminder.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('reminders')
@UseGuards(JwtAuthGuard)
export class RemindersController {
  constructor(private readonly remindersService: RemindersService) {}

  /** GET /api/reminders?showPast=true — list reminders for current user */
  @Get()
  findAll(@Request() req, @Query('showPast') showPast?: string) {
    const userId = req.user.id;
    return this.remindersService.findAll(userId, showPast === 'true');
  }

  @Get(':id')
  findOne(@Request() req, @Param('id') id: string) {
    return this.remindersService.findOne(req.user.id, parseInt(id, 10));
  }

  @Post()
  create(@Request() req, @Body() dto: CreateReminderDto) {
    return this.remindersService.create(req.user.id, dto);
  }

  @Patch(':id')
  update(@Request() req, @Param('id') id: string, @Body() dto: UpdateReminderDto) {
    return this.remindersService.update(req.user.id, parseInt(id, 10), dto);
  }

  @Delete(':id')
  remove(@Request() req, @Param('id') id: string) {
    return this.remindersService.remove(req.user.id, parseInt(id, 10));
  }
}
