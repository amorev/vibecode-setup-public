import api from './index';

export interface Reminder {
  id: number;
  userId: number;
  text: string;
  scheduledAt: string;
  isRecurring: boolean;
  weekdays: number[] | null;
  isSent: boolean;
  lastSent: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateReminderRequest {
  text: string;
  scheduledAt: Date | string;
  isRecurring?: boolean;
  weekdays?: number[];
}

export interface UpdateReminderRequest {
  text?: string;
  scheduledAt?: Date | string;
  isRecurring?: boolean;
  weekdays?: number[] | null;
}

export const getReminders = async (showPast = false): Promise<Reminder[]> => {
  const response = await api.get<Reminder[]>('/api/reminders', {
    params: { showPast },
  });
  return response.data;
};

export const createReminder = async (data: CreateReminderRequest): Promise<Reminder> => {
  const response = await api.post<Reminder>('/api/reminders', data);
  return response.data;
};

export const updateReminder = async (id: number, data: UpdateReminderRequest): Promise<Reminder> => {
  const response = await api.patch<Reminder>(`/api/reminders/${id}`, data);
  return response.data;
};

export const deleteReminder = async (id: number): Promise<void> => {
  await api.delete(`/api/reminders/${id}`);
};
