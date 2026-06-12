<script setup lang="ts">
import { ref, onMounted, computed, nextTick } from 'vue';
import {
  getEvents,
  createEvent,
  updateEvent,
  deleteEvent,
  type Event,
  type PaginatedEvents,
  type CreateEventRequest,
} from '@/api/events';

const events = ref<Event[]>([]);
const pagination = ref<PaginatedEvents | null>(null);
const loading = ref(false);
const saving = ref(false);
const error = ref<string | null>(null);

// Filters
const filterTitle = ref('');
const filterDescription = ref('');
const filterDateFrom = ref('');
const filterDateTo = ref('');
const currentPage = ref(1);
const pageSize = 10;

// Modal state
const modalOpen = ref(false);
const editingId = ref<number | null>(null);
const formTitle = ref('');
const formDescription = ref('');
const formLink = ref('');
const formDate = ref('');
const formTime = ref('');
const formError = ref('');

// Delete modal state
const deletingEvent = ref<Event | null>(null);
const deleteError = ref<string | null>(null);

const isEditMode = computed(() => editingId.value !== null);

const loadEvents = async (page = currentPage.value) => {
  loading.value = true;
  error.value = null;
  try {
    currentPage.value = page;
    const result = await getEvents({
      title: filterTitle.value.trim() || undefined,
      description: filterDescription.value.trim() || undefined,
      dateFrom: filterDateFrom.value || undefined,
      dateTo: filterDateTo.value || undefined,
      page,
      limit: pageSize,
    });
    events.value = result.items;
    pagination.value = result;
  } catch (e: any) {
    error.value = 'Не удалось загрузить мероприятия';
    console.error(e);
  } finally {
    loading.value = false;
  }
};

const applyFilters = async () => {
  await loadEvents(1);
};

const resetFilters = async () => {
  filterTitle.value = '';
  filterDescription.value = '';
  filterDateFrom.value = '';
  filterDateTo.value = '';
  await loadEvents(1);
};

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

const formatTime = (dateStr: string) => {
  return new Date(dateStr).toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

const visiblePages = computed<number[]>(() => {
  const total = pagination.value?.totalPages ?? 1;
  const cur = currentPage.value;
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = new Set<number>([1, total, cur, cur - 1, cur + 1]);
  return [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
});

const showLeftEllipsis = computed(() => visiblePages.value[0] > 2);
const showRightEllipsis = computed(() => {
  const pages = visiblePages.value;
  return pages[pages.length - 1] < (pagination.value?.totalPages ?? 1) - 1;
});

const resetForm = () => {
  editingId.value = null;
  formTitle.value = '';
  formDescription.value = '';
  formLink.value = '';
  formDate.value = '';
  formTime.value = '';
  formError.value = '';
};

const openCreate = async () => {
  resetForm();
  await nextTick();
  modalOpen.value = true;
};

const openEdit = async (e: Event) => {
  editingId.value = e.id;
  formTitle.value = e.title;
  formDescription.value = e.description;
  formLink.value = e.link;
  const dt = new Date(e.eventDate);
  const localYear = dt.getFullYear();
  const localMonth = String(dt.getMonth() + 1).padStart(2, '0');
  const localDay = String(dt.getDate()).padStart(2, '0');
  const localHour = String(dt.getHours()).padStart(2, '0');
  const localMinute = String(dt.getMinutes()).padStart(2, '0');
  formDate.value = `${localYear}-${localMonth}-${localDay}`;
  formTime.value = `${localHour}:${localMinute}`;
  formError.value = '';
  await nextTick();
  modalOpen.value = true;
};

const closeModal = () => {
  modalOpen.value = false;
};

const validateForm = (): boolean => {
  formError.value = '';
  if (!formTitle.value.trim()) {
    formError.value = 'Введите название мероприятия';
    return false;
  }
  if (!formDescription.value.trim()) {
    formError.value = 'Введите описание';
    return false;
  }
  if (!formLink.value.trim()) {
    formError.value = 'Введите ссылку';
    return false;
  }
  // Basic URL check
  try {
    new URL(formLink.value.trim());
  } catch {
    formError.value = 'Введите корректную ссылку (например, https://example.com)';
    return false;
  }
  if (!formDate.value || !formTime.value) {
    formError.value = 'Выберите дату и время';
    return false;
  }
  return true;
};

const handleSubmit = async () => {
  if (!validateForm()) return;

  const eventDate = new Date(`${formDate.value}T${formTime.value}`).toISOString();
  const data: CreateEventRequest = {
    title: formTitle.value.trim(),
    description: formDescription.value.trim(),
    link: formLink.value.trim(),
    eventDate,
  };

  saving.value = true;
  try {
    if (editingId.value) {
      await updateEvent(editingId.value, data);
    } else {
      await createEvent(data);
    }
    closeModal();
    await loadEvents();
  } catch (e: any) {
    formError.value = e.response?.data?.message || 'Ошибка сохранения';
  } finally {
    saving.value = false;
  }
};

const openDeleteModal = (e: Event) => {
  deletingEvent.value = e;
  deleteError.value = null;
};

const closeDeleteModal = () => {
  deletingEvent.value = null;
  deleteError.value = null;
};

const confirmDelete = async () => {
  if (!deletingEvent.value) return;
  const e = deletingEvent.value;
  deleteError.value = null;
  try {
    await deleteEvent(e.id);
    closeDeleteModal();
    // If we deleted the last item on a page, step back
    if (events.value.length === 1 && currentPage.value > 1) {
      await loadEvents(currentPage.value - 1);
    } else {
      await loadEvents();
    }
  } catch (err: any) {
    deleteError.value = err.response?.data?.message || 'Ошибка удаления';
  }
};

onMounted(() => {
  loadEvents(1);
});
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">
          Мероприятия
        </h2>
        <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Управление списком мероприятий
        </p>
      </div>
      <button @click="openCreate" class="btn-primary">
        <svg class="-ml-1 mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        Добавить мероприятие
      </button>
    </div>

    <!-- Filters -->
    <div class="surface-card p-5">
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label for="admin-filter-title" class="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
            Название
          </label>
          <input
            id="admin-filter-title"
            v-model="filterTitle"
            type="text"
            name="filterTitle"
            placeholder="Поиск по названию"
            class="input-base"
            @keydown.enter="applyFilters"
          />
        </div>
        <div>
          <label for="admin-filter-description" class="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
            Описание
          </label>
          <input
            id="admin-filter-description"
            v-model="filterDescription"
            type="text"
            name="filterDescription"
            placeholder="Поиск по описанию"
            class="input-base"
            @keydown.enter="applyFilters"
          />
        </div>
        <div>
          <label for="admin-filter-date-from" class="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
            Дата с
          </label>
          <input
            id="admin-filter-date-from"
            v-model="filterDateFrom"
            type="date"
            name="filterDateFrom"
            class="input-base"
          />
        </div>
        <div>
          <label for="admin-filter-date-to" class="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
            Дата по
          </label>
          <input
            id="admin-filter-date-to"
            v-model="filterDateTo"
            type="date"
            name="filterDateTo"
            class="input-base"
          />
        </div>
      </div>
      <div class="mt-4 flex flex-wrap items-center justify-end gap-2">
        <button @click="resetFilters" class="btn-secondary">Сбросить</button>
        <button @click="applyFilters" class="btn-primary">Применить</button>
      </div>
    </div>

    <!-- Error -->
    <div v-if="error" class="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
      {{ error }}
    </div>

    <!-- Loading -->
    <div v-if="loading" class="surface-card flex min-h-[200px] items-center justify-center">
      <div class="h-10 w-10 animate-spin rounded-full border-b-2 border-brand-600" />
    </div>

    <!-- Table -->
    <div v-else class="surface-card overflow-hidden">
      <table v-if="events.length > 0" class="w-full">
        <thead>
          <tr class="border-b border-slate-200 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-900/50">
            <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">ID</th>
            <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">Название</th>
            <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">Дата</th>
            <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">Ссылка</th>
            <th class="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">Действия</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-200 dark:divide-slate-800">
          <tr v-for="event in events" :key="event.id" class="transition hover:bg-slate-50 dark:hover:bg-slate-900/60">
            <td class="whitespace-nowrap px-6 py-4 text-sm text-slate-500 dark:text-slate-400">#{{ event.id }}</td>
            <td class="px-6 py-4">
              <p class="text-sm font-medium text-slate-900 dark:text-white">{{ event.title }}</p>
              <p class="mt-0.5 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">{{ event.description }}</p>
            </td>
            <td class="whitespace-nowrap px-6 py-4 text-sm text-slate-700 dark:text-slate-300">
              <div>{{ formatDate(event.eventDate) }}</div>
              <div class="text-xs text-slate-500 dark:text-slate-400">{{ formatTime(event.eventDate) }}</div>
            </td>
            <td class="max-w-[200px] truncate px-6 py-4 text-sm">
              <a :href="event.link" target="_blank" rel="noopener noreferrer" class="text-brand-600 hover:underline dark:text-brand-500">
                {{ event.link }}
              </a>
            </td>
            <td class="whitespace-nowrap px-6 py-4 text-right text-sm space-x-3">
              <button
                @click="openEdit(event)"
                class="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
              >
                Редактировать
              </button>
              <button
                @click="openDeleteModal(event)"
                class="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
              >
                Удалить
              </button>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-else class="flex flex-col items-center justify-center px-6 py-12 text-center">
        <p class="text-sm text-slate-500 dark:text-slate-400">
          Мероприятий пока нет. Нажмите «Добавить мероприятие», чтобы создать первое.
        </p>
      </div>
    </div>

    <!-- Pagination -->
    <nav
      v-if="pagination && pagination.totalPages > 1 && !loading"
      class="flex items-center justify-center gap-1"
      aria-label="Пагинация"
    >
      <button
        @click="loadEvents(currentPage - 1)"
        :disabled="currentPage <= 1"
        class="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
      >
        ‹
      </button>

      <template v-for="(page, idx) in visiblePages" :key="page">
        <span
          v-if="showLeftEllipsis && idx === 1"
          class="px-1 text-slate-400 dark:text-slate-500"
        >…</span>
        <span
          v-else-if="showRightEllipsis && idx === visiblePages.length - 2 && visiblePages[visiblePages.length - 1] !== pagination.totalPages - 1"
          class="px-1 text-slate-400 dark:text-slate-500"
        >…</span>
        <button
          @click="loadEvents(page)"
          class="min-w-[2.25rem] rounded-lg px-3 py-2 text-sm font-medium transition"
          :class="page === currentPage
            ? 'bg-brand-600 text-white shadow-sm'
            : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800'"
        >
          {{ page }}
        </button>
      </template>

      <button
        @click="loadEvents(currentPage + 1)"
        :disabled="currentPage >= pagination.totalPages"
        class="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
      >
        ›
      </button>
    </nav>

    <!-- Total info -->
    <div
      v-if="pagination && !loading"
      class="text-center text-xs text-slate-500 dark:text-slate-400"
    >
      Всего: {{ pagination.total }} · Страница {{ currentPage }} из {{ pagination.totalPages }}
    </div>

    <!-- Create / Edit modal -->
    <Teleport to="body">
      <div v-if="modalOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/40" @click="closeModal" />
        <div class="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
          <div class="p-6">
            <h2 class="text-lg font-semibold text-slate-900 dark:text-white">
              {{ isEditMode ? 'Редактировать мероприятие' : 'Новое мероприятие' }}
            </h2>

            <div class="mt-4 space-y-4">
              <div>
                <label for="event-form-title" class="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Название
                </label>
                <input
                  id="event-form-title"
                  v-model="formTitle"
                  type="text"
                  name="title"
                  placeholder="Название мероприятия"
                  class="input-base"
                />
              </div>

              <div>
                <label for="event-form-description" class="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Описание
                </label>
                <textarea
                  id="event-form-description"
                  v-model="formDescription"
                  name="description"
                  rows="4"
                  placeholder="Описание мероприятия"
                  class="input-base"
                />
              </div>

              <div>
                <label for="event-form-link" class="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Ссылка
                </label>
                <input
                  id="event-form-link"
                  v-model="formLink"
                  type="url"
                  name="link"
                  placeholder="https://example.com"
                  class="input-base"
                />
              </div>

              <div class="flex gap-3">
                <div class="flex-1">
                  <label for="event-form-date" class="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Дата проведения
                  </label>
                  <input
                    id="event-form-date"
                    v-model="formDate"
                    type="date"
                    name="eventDate"
                    class="input-base"
                  />
                </div>
                <div class="flex-1">
                  <label for="event-form-time" class="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Время
                  </label>
                  <input
                    id="event-form-time"
                    v-model="formTime"
                    type="time"
                    name="eventTime"
                    class="input-base"
                  />
                </div>
              </div>

              <p v-if="formError" class="text-xs text-red-600 dark:text-red-400">{{ formError }}</p>
            </div>
          </div>

          <div class="flex items-center justify-end gap-2 border-t border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
            <button @click="closeModal" class="btn-secondary">Отмена</button>
            <button @click="handleSubmit" :disabled="saving" class="btn-primary">
              {{ saving ? 'Сохранение...' : isEditMode ? 'Сохранить' : 'Создать' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Delete confirmation modal -->
    <Teleport to="body">
      <div
        v-if="deletingEvent"
        class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
        @click.self="closeDeleteModal"
      >
        <div class="surface-card w-full max-w-md p-6" role="dialog" aria-modal="true">
          <div class="flex items-start gap-3">
            <div class="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300">
              <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M9 3h6a1 1 0 011 1v3H8V4a1 1 0 011-1z" />
              </svg>
            </div>
            <div class="min-w-0 flex-1">
              <h3 class="text-base font-semibold text-slate-900 dark:text-slate-100">
                Удалить мероприятие?
              </h3>
              <p class="mt-1 text-sm text-slate-600 dark:text-slate-400">
                Мероприятие
                <span class="font-semibold text-slate-900 dark:text-white">«{{ deletingEvent.title }}»</span>
                будет безвозвратно удалено.
              </p>
            </div>
          </div>
          <div v-if="deleteError" class="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
            {{ deleteError }}
          </div>
          <div class="mt-6 flex justify-end gap-2">
            <button @click="closeDeleteModal" class="btn-secondary">Отмена</button>
            <button @click="confirmDelete" class="btn-danger">Удалить</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>