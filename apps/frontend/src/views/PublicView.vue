<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { getUserCount, type UserCountResponse } from '@/api/users';

const userCount = ref<UserCountResponse>({ total: 0, adminCount: 0 });
const loading = ref(true);
const error = ref<string | null>(null);

const title = 'Панель управления пользователями';
const description = 'Это публичная страница. Здесь отображается общая статистика системы.';

onMounted(async () => {
  loading.value = true;
  try {
    userCount.value = await getUserCount();
  } catch (e: any) {
    error.value = 'Не удалось загрузить статистику';
    console.error(e);
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div class="flex min-h-[calc(100vh-8rem)] items-center justify-center py-10">
    <div class="w-full max-w-lg">
      <div class="surface-card p-8 text-center">
        <div class="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-soft">
          <svg class="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
          </svg>
        </div>

        <h1 class="text-2xl font-semibold text-slate-950 dark:text-white">{{ title }}</h1>
        <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">{{ description }}</p>

        <div v-if="loading" class="mt-8 flex justify-center">
          <div class="h-10 w-10 animate-spin rounded-full border-b-2 border-brand-600"></div>
        </div>

        <div v-else-if="error" class="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
          {{ error }}
        </div>

        <div v-else class="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div class="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center dark:border-slate-800 dark:bg-slate-900/50">
            <p class="text-sm text-slate-500 dark:text-slate-400">Всего пользователей</p>
            <p class="mt-2 text-5xl font-bold text-slate-950 dark:text-white">{{ userCount.total }}</p>
          </div>
          <div class="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center dark:border-slate-800 dark:bg-slate-900/50">
            <p class="text-sm text-slate-500 dark:text-slate-400">Администраторов</p>
            <p class="mt-2 text-5xl font-bold text-brand-600 dark:text-brand-500">{{ userCount.adminCount }}</p>
          </div>
        </div>

        <div class="mt-8">
          <router-link to="/login" class="btn-primary inline-block">
            Войти в админ-панель
          </router-link>
        </div>
      </div>
    </div>
  </div>
</template>
