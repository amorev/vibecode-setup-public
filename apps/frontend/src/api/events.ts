import api from './index';

export interface Event {
  id: number;
  title: string;
  description: string;
  link: string;
  eventDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface EventFilters {
  title?: string;
  description?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface PaginatedEvents {
  items: Event[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreateEventRequest {
  title: string;
  description: string;
  link: string;
  eventDate: string;
}

export interface UpdateEventRequest {
  title?: string;
  description?: string;
  link?: string;
  eventDate?: string;
}

export interface EventsQueryParams extends EventFilters {
  page?: number;
  limit?: number;
}

const buildParams = (params: EventsQueryParams = {}) => {
  const out: Record<string, string | number> = {};
  if (params.title) out.title = params.title;
  if (params.description) out.description = params.description;
  if (params.dateFrom) out.dateFrom = params.dateFrom;
  if (params.dateTo) out.dateTo = params.dateTo;
  if (params.page) out.page = params.page;
  if (params.limit) out.limit = params.limit;
  return out;
};

export const getEvents = async (params: EventsQueryParams = {}): Promise<PaginatedEvents> => {
  const response = await api.get<PaginatedEvents>('/api/events', { params: buildParams(params) });
  return response.data;
};

export const getEvent = async (id: number): Promise<Event> => {
  const response = await api.get<Event>(`/api/events/${id}`);
  return response.data;
};

export const createEvent = async (data: CreateEventRequest): Promise<Event> => {
  const response = await api.post<Event>('/api/events', data);
  return response.data;
};

export const updateEvent = async (id: number, data: UpdateEventRequest): Promise<Event> => {
  const response = await api.patch<Event>(`/api/events/${id}`, data);
  return response.data;
};

export const deleteEvent = async (id: number): Promise<void> => {
  await api.delete(`/api/events/${id}`);
};