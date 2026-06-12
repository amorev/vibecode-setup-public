import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
  BadRequestException,
} from '@nestjs/common';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { Public } from '../auth/public.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from '../auth/admin.guard';

/**
 * Parse a date string into a Date. Accepts ISO strings and YYYY-MM-DD (treated as start of day).
 * Returns undefined when the input is empty / undefined.
 */
function parseFilterDate(value: string | undefined, endOfDay = false): Date | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;

  // Accept YYYY-MM-DD as a date-only value
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const iso = endOfDay ? `${trimmed}T23:59:59.999Z` : `${trimmed}T00:00:00.000Z`;
    const d = new Date(iso);
    if (isNaN(d.getTime())) {
      throw new BadRequestException(`Некорректная дата: ${value}`);
    }
    return d;
  }

  const d = new Date(trimmed);
  if (isNaN(d.getTime())) {
    throw new BadRequestException(`Некорректная дата: ${value}`);
  }
  return d;
}

@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  /** GET /api/events — public paginated list with filters */
  @Public()
  @Get()
  findAll(
    @Query('title') title?: string,
    @Query('description') description?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit?: number,
  ) {
    return this.eventsService.findAll(
      {
        title,
        description,
        dateFrom: parseFilterDate(dateFrom, false),
        dateTo: parseFilterDate(dateTo, true),
      },
      { page: page ?? 1, limit: limit ?? 10 },
    );
  }

  /** GET /api/events/:id — public single event */
  @Public()
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.eventsService.findOne(id);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post()
  create(@Body() dto: CreateEventDto) {
    return this.eventsService.create(dto);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateEventDto) {
    return this.eventsService.update(id, dto);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.eventsService.remove(id);
  }
}