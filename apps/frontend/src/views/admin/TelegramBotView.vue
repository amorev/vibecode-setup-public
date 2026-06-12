<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { getSettings, updateSettings, sendTestMessage, type TelegramSettings } from '@/api/settings';

const settings = ref<TelegramSettings>({ telegramBotToken: null, telegramChatId: null });
const loading = ref(true);
const saving = ref(false);
const error = ref<string | null>(null);
const success = ref<string | null>(null);
const testLoading = ref(false);
const testResult = ref<string | null>(null);

const botToken = ref('');
const chatId = ref('');
const hasChanges = ref(false);

const loadSettings = async () => {
  loading.value = true;
  error.value = null;
  try {
    const data = await getSettings();
    settings.value = data;
    botToken.value = data.telegramBotToken || '';
    chatId.value = data.telegramChatId || '';
  } catch (e: any) {
    error.value = 'Не удалось загрузить настройки';
    console.error(e);
  } finally {
    loading.value = false;
  }
};

const checkChanges = () => {
  hasChanges.value =
    botToken.value !== (settings.value.telegramBotToken || '') ||
    chatId.value !== (settings.value.telegramChatId || '');
};

const save = async () => {
  error.value = null;
  success.value = null;
  saving.value = true;
  try {
    const data = await updateSettings({
      telegramBotToken: botToken.value || '',
      telegramChatId: chatId.value || '',
    });
    settings.value = data;
    hasChanges.value = false;
    success.value = 'Настройки сохранены';
    setTimeout(() => (success.value = null), 3000);
  } catch (e: any) {
    error.value = e.response?.data?.message || 'Ошибка сохранения настроек';
  } finally {
    saving.value = false;
  }
};

const handleTest = async () => {
  testResult.value = null;
  testLoading.value = true;
  try {
    const result = await sendTestMessage();
    testResult.value = result.message;
  } catch (e: any) {
    testResult.value = e.response?.data?.message || 'Ошибка отправки';
  } finally {
    testLoading.value = false;
  }
};

onMounted(() => {
  loadSettings();
});
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">Telegram бот</h2>
        <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">Настройка уведомлений через Telegram</p>
      </div>
      <button
        v-if="hasChanges"
        @click="save"
        :disabled="saving"
        class="btn-primary"
      >
        <span v-if="saving" class="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"></span>
        {{ saving ? 'Сохранение...' : 'Сохранить' }}
      </button>
    </div>

    <!-- Messages -->
    <div v-if="error" class="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
      {{ error }}
    </div>
    <div v-if="success" class="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-200">
      {{ success }}
    </div>

    <!-- Settings form -->
    <div v-if="loading" class="surface-card flex min-h-[200px] items-center justify-center">
      <div class="h-10 w-10 animate-spin rounded-full border-b-2 border-brand-600"></div>
    </div>

    <div v-else class="surface-card p-6 space-y-6">
      <!-- Bot Token -->
      <div>
        <label class="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
          Telegram Bot Token
        </label>
        <input
          v-model="botToken"
          @input="checkChanges"
          type="text"
          class="input-base font-mono"
          placeholder="123456789:ABCdefGhIjKlMnOpQrStUvWxYz"
        />
        <p class="mt-2 text-xs text-slate-400 dark:text-slate-500">
          Получите токен у <a href="https://t.me/BotFather" target="_blank" rel="noopener" class="text-brand-600 hover:text-brand-700 dark:text-brand-400">@BotFather</a>. Создайте бота командой <code class="rounded bg-slate-100 px-1 dark:bg-slate-800">/newbot</code> и скопируйте токен.
        </p>
      </div>

      <!-- Chat ID -->
      <div>
        <label class="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
          Telegram Chat ID
        </label>
        <input
          v-model="chatId"
          @input="checkChanges"
          type="text"
          class="input-base font-mono"
          placeholder="-1001234567890 или 123456789"
        />
        <p class="mt-2 text-xs text-slate-400 dark:text-slate-500">
          ID чата или пользователя, которому будут отправляться уведомления. Узнайте свой ID у бота <a href="https://t.me/useridbot" target="_blank" rel="noopener" class="text-brand-600 hover:text-brand-700 dark:text-brand-400">@useridbot</a>.
        </p>
      </div>

      <!-- Test button -->
      <div class="flex flex-col gap-3">
        <button
          @click="handleTest"
          :disabled="testLoading"
          class="btn-primary"
        >
          <span v-if="testLoading" class="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"></span>
          <svg v-else class="-ml-1 mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 0 0 2.22 0L21 8M5 19h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2z" /></svg>
          {{ testLoading ? 'Отправка...' : 'Отправить тестовое сообщение' }}
        </button>
        <div v-if="testResult" class="text-sm" :class="testResult === 'Тестовое сообщение отправлено' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'">
          {{ testResult }}
        </div>
      </div>

      <!-- Status -->
      <div class="flex flex-wrap gap-4 pt-2">
        <div class="flex items-center gap-2">
          <span class="inline-block h-2.5 w-2.5 rounded-full" :class="settings.telegramBotToken ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'"></span>
          <span class="text-xs text-slate-500 dark:text-slate-400">Токен: {{ settings.telegramBotToken ? 'установлен' : 'не установлен' }}</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="inline-block h-2.5 w-2.5 rounded-full" :class="settings.telegramChatId ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'"></span>
          <span class="text-xs text-slate-500 dark:text-slate-400">Chat ID: {{ settings.telegramChatId ? 'установлен' : 'не установлен' }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
