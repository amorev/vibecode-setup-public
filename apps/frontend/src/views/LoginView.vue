<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuth } from '@/composables/useAuth';

const router = useRouter();
const { login, loading, error } = useAuth();

const loginForm = ref({ login: '', password: '' });

const submit = async () => {
  if (!loginForm.value.login || !loginForm.value.password) return;
  const ok = await login(loginForm.value);
  if (ok) {
    router.push('/admin');
  }
};
</script>

<template>
  <div class="flex min-h-[calc(100vh-8rem)] items-center justify-center py-6 sm:py-10">
    <div class="w-full max-w-md">
      <div class="surface-card p-8">
        <div class="mb-8 text-center">
          <div class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-soft">
            <svg class="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
            </svg>
          </div>
          <h1 class="text-2xl font-semibold text-slate-950 dark:text-white">Вход в систему</h1>
          <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">Введите учётные данные для доступа к админ-панели</p>
        </div>

        <form @submit.prevent="submit" class="space-y-5">
          <div>
            <label class="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Логин</label>
            <input v-model="loginForm.login" type="text" class="input-base" placeholder="admin" />
          </div>

          <div>
            <label class="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Пароль</label>
            <input v-model="loginForm.password" type="password" class="input-base" placeholder="••••••••" />
          </div>

          <div v-if="error" class="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
            {{ error }}
          </div>

          <button type="submit" :disabled="loading" class="btn-primary w-full">
            <span v-if="loading" class="inline-flex items-center">
              <svg class="-ml-1 mr-2 h-4 w-4 animate-spin text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
              Вход...
            </span>
            <span v-else>Войти</span>
          </button>
        </form>

        <div class="mt-6 text-center">
          <router-link to="/" class="text-sm text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300">← Вернуться на главную</router-link>
        </div>
      </div>
    </div>
  </div>
</template>
