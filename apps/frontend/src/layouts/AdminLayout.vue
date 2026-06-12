<script setup lang="ts">
import { useAuth } from '@/composables/useAuth';
import { useTheme } from '@/composables/useTheme';
import { useRoute, useRouter } from 'vue-router';

const { user, logout } = useAuth();
const route = useRoute();
const router = useRouter();
const { theme, setTheme, toggleTheme, isDark } = useTheme();

const navItems = [
  { name: 'Пользователи', path: '/admin' },
  { name: 'Telegram бот', path: '/admin/telegram-bot' },
];

const isActive = (path: string) => route.path === path;
</script>

<template>
  <div class="min-h-screen bg-slate-50 transition-colors duration-200 dark:bg-slate-950">
    <header class="sticky top-0 z-40 border-b border-slate-200/80 bg-white/85 backdrop-blur-xl transition-colors duration-200 dark:border-slate-800 dark:bg-slate-950/85">
      <div class="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-white dark:bg-brand-600">
              <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 11c0 1.657-1.343 3-3 3S6 12.657 6 11V8a6 6 0 1 1 12 0v3c0 3.314-2.686 6-6 6h-1"/><path stroke-linecap="round" stroke-linejoin="round" d="M9 14v2a3 3 0 1 0 6 0v-2"/>
              </svg>
            </div>
            <div>
              <h1 class="text-xl font-semibold text-slate-950 dark:text-white">Admin Panel</h1>
              <p class="text-sm text-slate-500 dark:text-slate-400">Управление пользователями</p>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <div class="hidden rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-900 sm:flex">
              <button @click="setTheme('light')" class="rounded-lg px-3 py-2 text-xs font-medium transition" :class="theme === 'light' ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white' : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'">Light</button>
              <button @click="setTheme('system')" class="rounded-lg px-3 py-2 text-xs font-medium transition" :class="theme === 'system' ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white' : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'">System</button>
              <button @click="setTheme('dark')" class="rounded-lg px-3 py-2 text-xs font-medium transition" :class="theme === 'dark' ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white' : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'">Dark</button>
            </div>
            <button @click="toggleTheme" class="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800" :aria-label="isDark ? 'Светлая тема' : 'Тёмная тема'">
              <svg v-if="isDark" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M21 12.79A9 9 0 1 1 11.21 3c0 .24-.01.48-.01.72A9 9 0 0 0 20.28 12c.24 0 .48 0 .72-.01Z"/></svg>
              <svg v-else class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M12 3v2.25M12 18.75V21M4.72 4.72l1.59 1.59M17.69 17.69l1.59 1.59M3 12h2.25M18.75 12H21M4.72 19.28l1.59-1.59M17.69 6.31l1.59-1.59M15.75 12A3.75 3.75 0 1 1 8.25 12a3.75 3.75 0 0 1 7.5 0Z"/></svg>
            </button>
            <span class="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">{{ user?.login }}</span>
            <button @click="logout" class="btn-secondary border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900/50 dark:text-red-300 dark:hover:bg-red-950/40">Выйти</button>
          </div>
        </div>

        <nav class="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          <button v-for="item in navItems" :key="item.path" @click="router.push(item.path)" class="whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-medium transition" :class="isActive(item.path) ? 'bg-brand-600 text-white shadow-sm' : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800'">
            {{ item.name }}
          </button>
        </nav>
      </div>
    </header>

    <main class="mx-auto max-w-7xl px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
      <router-view />
    </main>
  </div>
</template>
