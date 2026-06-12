import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, Between, FindOptionsWhere } from 'typeorm';
import { EventEntity } from './entities/event.entity';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';

export interface EventFilters {
  title?: string;
  description?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedEvents {
  items: EventEntity[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class EventsService {
  constructor(
    @InjectRepository(EventEntity)
    private readonly eventsRepo: Repository<EventEntity>,
  ) {}

  /** Build a TypeORM where clause from filters. */
  private buildWhere(filters: EventFilters): FindOptionsWhere<EventEntity> {
    const where: FindOptionsWhere<EventEntity> = {};

    if (filters.title && filters.title.trim()) {
      where.title = Like(`%${filters.title.trim()}%`);
    }

    if (filters.description && filters.description.trim()) {
      where.description = Like(`%${filters.description.trim()}%`);
    }

    if (filters.dateFrom && filters.dateTo) {
      where.eventDate = Between(filters.dateFrom, filters.dateTo);
    } else if (filters.dateFrom) {
      where.eventDate = Between(filters.dateFrom, new Date('9999-12-31T23:59:59.999Z'));
    } else if (filters.dateTo) {
      where.eventDate = Between(new Date('1970-01-01T00:00:00.000Z'), filters.dateTo);
    }

    return where;
  }

  /** Paginated list of events with filters (public + admin). */
  async findAll(
    filters: EventFilters,
    pagination: PaginationParams,
  ): Promise<PaginatedEvents> {
    const where = this.buildWhere(filters);
    const page = Math.max(1, Math.floor(pagination.page));
    const limit = Math.max(1, Math.min(100, Math.floor(pagination.limit)));
    const skip = (page - 1) * limit;

    const [items, total] = await this.eventsRepo.findAndCount({
      where,
      order: { eventDate: 'ASC' },
      skip,
      take: limit,
    });

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async findOne(id: number): Promise<EventEntity> {
    const event = await this.eventsRepo.findOne({ where: { id } });
    if (!event) {
      throw new NotFoundException(`Мероприятие #${id} не найдено`);
    }
    return event;
  }

  async create(dto: CreateEventDto): Promise<EventEntity> {
    const event = this.eventsRepo.create({
      title: dto.title,
      description: dto.description,
      link: dto.link,
      eventDate: dto.eventDate,
    });
    await this.eventsRepo.save(event);
    return event;
  }

  async update(id: number, dto: UpdateEventDto): Promise<EventEntity> {
    const event = await this.findOne(id);
    if (dto.title !== undefined) event.title = dto.title;
    if (dto.description !== undefined) event.description = dto.description;
    if (dto.link !== undefined) event.link = dto.link;
    if (dto.eventDate !== undefined) event.eventDate = dto.eventDate;
    await this.eventsRepo.save(event);
    return event;
  }

  async remove(id: number): Promise<void> {
    const event = await this.findOne(id);
    await this.eventsRepo.remove(event);
  }
}