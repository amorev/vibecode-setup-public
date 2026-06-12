<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { getEvents, type Event, type PaginatedEvents } from '@/api/events';

const events = ref<Event[]>([]);
const pagination = ref<PaginatedEvents | null>(null);
const loading = ref(false);
const error = ref<string | null>(null);

// Filters
const filterTitle = ref('');
const filterDescription = ref('');
const filterDateFrom = ref('');
const filterDateTo = ref('');
const currentPage = ref(1);
const pageSize = 10;

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

  // Show first, last, current ±1
  const pages = new Set<number>([1, total, cur, cur - 1, cur + 1]);
  return [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
});

const showLeftEllipsis = computed(() => visiblePages.value[0] > 2);
const showRightEllipsis = computed(() => {
  const pages = visiblePages.value;
  return pages[pages.length - 1] < (pagination.value?.totalPages ?? 1) - 1;
});

onMounted(() => {
  loadEvents(1);
});
</script>

<template>
  <div class="flex-1 p-4 sm:p-6 lg:p-8">
    <div class="mx-auto max-w-5xl">
      <!-- Header -->
      <div class="mb-6">
        <h1 class="text-2xl font-bold text-slate-900 dark:text-white">Мероприятия</h1>
        <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Список предстоящих и прошедших мероприятий
        </p>
      </div>

      <!-- Filters -->
      <div class="surface-card mb-6 p-5">
        <h2 class="mb-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Фильтры</h2>
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label for="public-filter-title" class="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
              Название
            </label>
            <input
              id="public-filter-title"
              v-model="filterTitle"
              type="text"
              name="filterTitle"
              placeholder="Поиск по названию"
              class="input-base"
              @keydown.enter="applyFilters"
            />
          </div>
          <div>
            <label for="public-filter-description" class="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
              Описание
            </label>
            <input
              id="public-filter-description"
              v-model="filterDescription"
              type="text"
              name="filterDescription"
              placeholder="Поиск по описанию"
              class="input-base"
              @keydown.enter="applyFilters"
            />
          </div>
          <div>
            <label for="public-filter-date-from" class="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
              Дата с
            </label>
            <input
              id="public-filter-date-from"
              v-model="filterDateFrom"
              type="date"
              name="filterDateFrom"
              class="input-base"
            />
          </div>
          <div>
            <label for="public-filter-date-to" class="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
              Дата по
            </label>
            <input
              id="public-filter-date-to"
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
      <div v-if="error" class="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
        {{ error }}
      </div>

      <!-- Loading -->
      <div v-if="loading" class="flex justify-center py-12">
        <div class="h-10 w-10 animate-spin rounded-full border-b-2 border-brand-600" />
      </div>

      <!-- Empty state -->
      <div v-else-if="events.length === 0" class="surface-card flex flex-col items-center justify-center px-6 py-16 text-center">
        <svg class="h-12 w-12 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
        </svg>
        <p class="mt-4 text-sm text-slate-500 dark:text-slate-400">
          Мероприятий не найдено. Попробуйте изменить фильтры.
        </p>
      </div>

      <!-- List -->
      <div v-else class="space-y-3">
        <a
          v-for="event in events"
          :key="event.id"
          :href="event.link"
          target="_blank"
          rel="noopener noreferrer"
          class="surface-card block p-5 transition hover:border-brand-400 hover:shadow-md"
        >
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div class="min-w-0 flex-1">
              <h3 class="text-base font-semibold text-slate-900 dark:text-white">
                {{ event.title }}
              </h3>
              <p class="mt-1 line-clamp-3 text-sm text-slate-600 dark:text-slate-400">
                {{ event.description }}
              </p>
            </div>
            <div class="shrink-0 text-right text-xs text-slate-500 dark:text-slate-400">
              <div class="font-medium text-slate-700 dark:text-slate-300">
                {{ formatDate(event.eventDate) }}
              </div>
              <div>{{ formatTime(event.eventDate) }}</div>
            </div>
          </div>
          <div class="mt-3 flex items-center gap-1 text-xs text-brand-600 dark:text-brand-500">
            <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
            </svg>
            <span class="truncate">{{ event.link }}</span>
          </div>
        </a>
      </div>

      <!-- Pagination -->
      <nav
        v-if="pagination && pagination.totalPages > 1"
        class="mt-6 flex items-center justify-center gap-1"
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
        class="mt-3 text-center text-xs text-slate-500 dark:text-slate-400"
      >
        Всего: {{ pagination.total }} · Страница {{ currentPage }} из {{ pagination.totalPages }}
      </div>
    </div>
  </div>
</template>