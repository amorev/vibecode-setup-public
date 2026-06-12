<script setup lang="ts">
// Тестовая страница для проверки деплоя.
// Доступна без авторизации по пути /deploy-test
const buildTime = new Date().toISOString();
</script>

<template>
  <div class="flex min-h-[calc(100vh-8rem)] items-center justify-center py-10">
    <div class="w-full max-w-lg">
      <div class="surface-card p-8 text-center">
        <div class="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-soft">
          <svg class="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>

        <h1 class="text-2xl font-semibold text-slate-950 dark:text-white">
          это новая страница для тестирования деплоймента
        </h1>

        <p class="mt-3 text-sm text-slate-500 dark:text-slate-400">
          Если ты видишь этот текст — фронтенд собрался, залился и отдаётся приложением.
        </p>

        <div class="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left text-xs dark:border-slate-800 dark:bg-slate-900/50">
          <p class="text-slate-500 dark:text-slate-400">Build timestamp (время сборки этого бандла):</p>
          <p class="mt-1 font-mono text-slate-950 dark:text-white break-all">{{ buildTime }}</p>
        </div>

        <div class="mt-8">
          <router-link to="/" class="btn-primary inline-block">
            На главную
          </router-link>
        </div>
      </div>
    </div>
  </div>
</template>
