import api from './index';

export interface TelegramSettings {
  telegramBotToken: string | null;
  telegramChatId: string | null;
}

export interface UpdateTelegramSettingsRequest {
  telegramBotToken?: string;
  telegramChatId?: string;
}

export const getSettings = async (): Promise<TelegramSettings> => {
  const response = await api.get<TelegramSettings>('/api/settings');
  return response.data;
};

export const updateSettings = async (
  data: UpdateTelegramSettingsRequest,
): Promise<TelegramSettings> => {
  const response = await api.patch<TelegramSettings>('/api/settings', data);
  return response.data;
};

export const sendTestMessage = async (): Promise<{ ok: boolean; message: string }> => {
  const response = await api.post<{ ok: boolean; message: string }>('/api/settings/send-test');
  return response.data;
};
