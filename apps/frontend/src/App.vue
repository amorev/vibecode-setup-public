<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useTheme } from '@/composables/useTheme';

const router = useRouter();
const { theme, setTheme, toggleTheme, isDark } = useTheme();

const isAuthenticated = ref(!!localStorage.getItem('auth_token'));

const updateAuthState = () => {
  isAuthenticated.value = !!localStorage.getItem('auth_token');
};

onMounted(() => {
  window.addEventListener('hashchange', updateAuthState);
});

onUnmounted(() => {
  window.removeEventListener('hashchange', updateAuthState);
});
</script>

<template>
  <div class="min-h-screen bg-slate-50 transition-colors duration-200 dark:bg-slate-950">
    <!-- Header (shown on every page) -->
    <header v-if="isAuthenticated" class="sticky top-0 z-40 border-b border-slate-200/80 bg-white/80 backdrop-blur-xl transition-colors duration-200 dark:border-slate-800 dark:bg-slate-950/80">
      <div class="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <button class="flex items-center gap-3 text-left" @click="router.push('/')">
          <span class="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-soft">
            <svg class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
            </svg>
          </span>
          <span>
            <span class="block text-lg font-semibold text-slate-950 dark:text-white">User Management</span>
            <span class="block text-sm text-slate-500 dark:text-slate-400">Шаблоны приложения</span>
          </span>
        </button>

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
          <button @click="router.push('/reminders')" class="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800">
            <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"/></svg>
            Напоминания
          </button>
          <button @click="router.push('/admin/users')" class="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800">
            <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M12 11c0 1.657-1.343 3-3 3S6 12.657 6 11V8a6 6 0 1 1 12 0v3c0 3.314-2.686 6-6 6h-1"/><path stroke-linecap="round" stroke-linejoin="round" d="M9 14v2a3 3 0 1 0 6 0v-2"/></svg>
            Админ
          </button>
        </div>
      </div>
    </header>

    <main class="mx-auto flex min-h-[calc(100vh-88px)] max-w-7xl flex-col">
      <router-view />
    </main>
  </div>
</template>
