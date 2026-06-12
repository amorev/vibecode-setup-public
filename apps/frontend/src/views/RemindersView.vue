<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue';
import {
  getReminders,
  createReminder,
  updateReminder,
  deleteReminder,
  type Reminder,
  type CreateReminderRequest,
} from '@/api/reminders';

const WEEKDAYS = [
  { value: 1, label: 'Пн' },
  { value: 2, label: 'Вт' },
  { value: 3, label: 'Ср' },
  { value: 4, label: 'Чт' },
  { value: 5, label: 'Пт' },
  { value: 6, label: 'Сб' },
  { value: 7, label: 'Вс' },
];

const WEEKDAY_FULL = ['', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];

const reminders = ref<Reminder[]>([]);
const showPast = ref(false);
const loading = ref(false);
const saving = ref(false);

// Modal state
const modalOpen = ref(false);
const editingId = ref<number | null>(null);
const formText = ref('');
const formDate = ref('');
const formTime = ref('');
const formIsRecurring = ref(false);
const formWeekdays = ref<number[]>([]);

// Form validation
const formError = ref('');

const loadReminders = async () => {
  loading.value = true;
  try {
    reminders.value = await getReminders(showPast.value);
  } catch (e: any) {
    console.error(e);
  } finally {
    loading.value = false;
  }
};

const openCreate = () => {
  editingId.value = null;
  formText.value = '';
  formDate.value = '';
  formTime.value = '';
  formIsRecurring.value = false;
  formWeekdays.value = [];
  formError.value = '';
  modalOpen.value = true;
};

const openEdit = async (r: Reminder) => {
  editingId.value = r.id;
  formText.value = r.text;
  const dt = new Date(r.scheduledAt);
  // Use local date/time parts, not UTC
  const localYear = dt.getFullYear();
  const localMonth = String(dt.getMonth() + 1).padStart(2, '0');
  const localDay = String(dt.getDate()).padStart(2, '0');
  const localHour = String(dt.getHours()).padStart(2, '0');
  const localMinute = String(dt.getMinutes()).padStart(2, '0');
  formDate.value = `${localYear}-${localMonth}-${localDay}`;
  formTime.value = `${localHour}:${localMinute}`;
  formIsRecurring.value = r.isRecurring;
  formWeekdays.value = r.weekdays ? [...r.weekdays].sort((a, b) => a - b) : [];
  formError.value = '';
  // Wait for Vue to process the reactive updates before showing the modal
  await nextTick();
  modalOpen.value = true;
};

const closeModal = () => {
  modalOpen.value = false;
};

const validateForm = (): boolean => {
  formError.value = '';
  if (!formText.value.trim()) {
    formError.value = 'Введите текст напоминания';
    return false;
  }
  if (!formDate.value || !formTime.value) {
    formError.value = 'Выберите дату и время';
    return false;
  }
  if (formIsRecurring.value && formWeekdays.value.length === 0) {
    formError.value = 'Выберите хотя бы один день недели';
    return false;
  }
  return true;
};

const handleSubmit = async () => {
  if (!validateForm()) return;

  const scheduledAt = new Date(`${formDate.value}T${formTime.value}`).toISOString();

  const data: CreateReminderRequest = {
    text: formText.value.trim(),
    scheduledAt,
    isRecurring: formIsRecurring.value,
    weekdays: formIsRecurring.value ? formWeekdays.value : undefined,
  };

  saving.value = true;
  try {
    if (editingId.value) {
      await updateReminder(editingId.value, data);
    } else {
      await createReminder(data);
    }
    closeModal();
    await loadReminders();
  } catch (e: any) {
    formError.value = e.response?.data?.message || 'Ошибка сохранения';
  } finally {
    saving.value = false;
  }
};

const handleDelete = async (id: number) => {
  if (!confirm('Удалить напоминание?')) return;
  try {
    await deleteReminder(id);
    await loadReminders();
  } catch (e) {
    console.error(e);
  }
};

const toggleWeekday = (day: number) => {
  const idx = formWeekdays.value.indexOf(day);
  if (idx >= 0) {
    formWeekdays.value.splice(idx, 1);
  } else {
    formWeekdays.value.push(day);
  }
};

const formatDate = (dateStr: string) => {
  const dt = new Date(dateStr);
  return dt.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

const formatTime = (dateStr: string) => {
  const dt = new Date(dateStr);
  return dt.toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

const isPast = (scheduledAt: string) => {
  return new Date(scheduledAt) < new Date();
};

const pastWeekdays = (weekdays: number[] | null) => {
  if (!weekdays) return '';
  return weekdays
    .sort((a, b) => a - b)
    .map((d) => WEEKDAY_FULL[d])
    .join(', ');
};

onMounted(() => {
  loadReminders();
});
</script>

<template>
  <div class="flex-1 p-4 sm:p-6 lg:p-8">
    <div class="mx-auto max-w-3xl">
      <!-- Header -->
      <div class="mb-6 flex items-center justify-between">
        <h1 class="text-2xl font-bold text-slate-900 dark:text-white">Напоминания</h1>
        <button
          @click="openCreate"
          class="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-medium text-white shadow-soft transition hover:bg-brand-700"
        >
          <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Новое
        </button>
      </div>

      <!-- Show past toggle -->
      <div class="mb-4 flex items-center gap-2">
        <label class="flex items-center gap-2 cursor-pointer">
          <input
            v-model="showPast"
            type="checkbox"
            class="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-600 dark:border-slate-600 dark:bg-slate-800"
            @change="loadReminders"
          />
          <span class="text-sm text-slate-600 dark:text-slate-400">Показать прошедшие</span>
        </label>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="flex justify-center py-12">
        <div class="h-8 w-8 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
      </div>

      <!-- Empty state -->
      <div v-else-if="reminders.length === 0" class="rounded-2xl border border-dashed border-slate-300 py-16 text-center dark:border-slate-700">
        <svg class="mx-auto h-12 w-12 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
        </svg>
        <p class="mt-4 text-sm text-slate-500 dark:text-slate-400">
          {{ showPast ? 'Нет напоминаний' : 'Нет напоминаний. Создайте первое!' }}
        </p>
      </div>

      <!-- List -->
      <div v-else class="space-y-2">
        <div
          v-for="reminder in reminders"
          :key="reminder.id"
          class="group relative flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 transition hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
          :class="{ 'opacity-50': isPast(reminder.scheduledAt) && !reminder.isRecurring }"
        >
          <!-- Icon -->
          <div class="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" :class="reminder.isRecurring ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-500' : isPast(reminder.scheduledAt) ? 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500' : 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-500'">
            <svg v-if="reminder.isRecurring" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
            </svg>
            <svg v-else class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>

          <!-- Content -->
          <div class="min-w-0 flex-1">
            <p class="text-sm font-medium text-slate-900 dark:text-white">{{ reminder.text }}</p>
            <div class="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
              <span>{{ formatDate(reminder.scheduledAt) }}</span>
              <span>{{ formatTime(reminder.scheduledAt) }}</span>
              <span v-if="reminder.isRecurring" class="rounded-md bg-amber-100 px-1.5 py-0.5 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                {{ pastWeekdays(reminder.weekdays) }}
              </span>
              <span v-if="isPast(reminder.scheduledAt) && !reminder.isRecurring" class="rounded-md bg-slate-100 px-1.5 py-0.5 text-slate-500 dark:bg-slate-800 dark:text-slate-500">
                Прошло
              </span>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex shrink-0 items-center gap-1 opacity-0 transition group-hover:opacity-100">
            <button
              @click="openEdit(reminder)"
              class="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
              title="Редактировать"
            >
              <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
              </svg>
            </button>
            <button
              @click="handleDelete(reminder.id)"
              class="rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400"
              title="Удалить"
            >
              <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <!-- Modal -->
      <Teleport to="body">
        <div v-if="modalOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4">
          <!-- Backdrop -->
          <div class="absolute inset-0 bg-black/40" @click="closeModal" />

          <!-- Dialog -->
          <div class="relative w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div class="p-6">
              <h2 class="text-lg font-semibold text-slate-900 dark:text-white">
                {{ editingId ? 'Редактировать напоминание' : 'Новое напоминание' }}
              </h2>

              <!-- Text -->
              <div class="mt-4">
                <label class="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Текст напоминания
                </label>
                <input
                  v-model="formText"
                  type="text"
                  placeholder="Что нужно сделать?"
                  class="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500"
                />
              </div>

              <!-- Date & Time -->
              <div class="mt-4 flex gap-3">
                <div class="flex-1">
                  <label class="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Дата
                  </label>
                  <input
                    v-model="formDate"
                    type="date"
                    class="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                  />
                </div>
                <div class="flex-1">
                  <label class="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Время
                  </label>
                  <input
                    v-model="formTime"
                    type="time"
                    class="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>

              <!-- Recurring toggle -->
              <div class="mt-4">
                <label class="flex items-center gap-2 cursor-pointer">
                  <input
                    v-model="formIsRecurring"
                    type="checkbox"
                    class="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-600 dark:border-slate-600 dark:bg-slate-800"
                  />
                  <span class="text-sm text-slate-700 dark:text-slate-300">Регулярное напоминание</span>
                </label>

                <!-- Weekdays selector -->
                <div v-show="formIsRecurring" class="mt-3 flex gap-2">
                  <button
                    v-for="day in WEEKDAYS"
                    :key="day.value"
                    @click="toggleWeekday(day.value)"
                    class="flex h-9 w-11 items-center justify-center rounded-lg text-xs font-medium transition"
                    :class="formWeekdays.includes(day.value)
                      ? 'bg-brand-600 text-white shadow-sm'
                      : 'border border-slate-300 bg-white text-slate-600 hover:border-slate-400 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-400 dark:hover:border-slate-500'"
                  >
                    {{ day.label }}
                  </button>
                </div>
              </div>

              <!-- Error -->
              <p v-if="formError" class="mt-3 text-xs text-red-600 dark:text-red-400">{{ formError }}</p>
            </div>

            <!-- Footer -->
            <div class="flex items-center justify-end gap-2 border-t border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
              <button
                @click="closeModal"
                class="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                Отмена
              </button>
              <button
                @click="handleSubmit"
                :disabled="saving"
                class="rounded-xl bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-soft transition hover:bg-brand-700 disabled:opacity-50"
              >
                {{ saving ? 'Сохранение...' : editingId ? 'Сохранить' : 'Создать' }}
              </button>
            </div>
          </div>
        </div>
      </Teleport>
    </div>
  </div>
</template>
