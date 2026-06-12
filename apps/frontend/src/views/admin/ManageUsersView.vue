<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { getUsers, createUser, updateUser, deleteUser, type PublicUser, type CreateUserRequest, type UpdateUserRequest } from '@/api/users';

const users = ref<PublicUser[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);
const showForm = ref(false);
const editingId = ref<number | null>(null);
const form = ref<CreateUserRequest>({ login: '', password: '', role: 'user' });
const formError = ref<string | null>(null);
const saving = ref(false);
const deletingId = ref<number | null>(null);

const isEditMode = computed(() => editingId.value !== null);

const loadUsers = async () => {
  loading.value = true;
  error.value = null;
  try {
    users.value = await getUsers();
  } catch (e: any) {
    error.value = 'Не удалось загрузить пользователей';
    console.error(e);
  } finally {
    loading.value = false;
  }
};

const resetForm = () => {
  form.value = { login: '', password: '', role: 'user' };
  editingId.value = null;
  formError.value = null;
  showForm.value = false;
};

const handleEdit = (user: PublicUser) => {
  editingId.value = user.id;
  form.value = { login: user.login, password: '', role: user.role };
  formError.value = null;
  showForm.value = true;
};

const submit = async () => {
  formError.value = null;
  if (!form.value.login) {
    formError.value = 'Заполните логин';
    return;
  }
  if (!isEditMode.value && !form.value.password) {
    formError.value = 'Заполните пароль';
    return;
  }

  saving.value = true;
  try {
    if (isEditMode.value) {
      const updateData: UpdateUserRequest = {
        login: form.value.login,
        role: form.value.role,
      };
      if (form.value.password) {
        updateData.password = form.value.password;
      }
      await updateUser(editingId.value!, updateData);
    } else {
      await createUser(form.value);
    }
    resetForm();
    await loadUsers();
  } catch (e: any) {
    formError.value = e.response?.data?.message || (isEditMode.value ? 'Ошибка обновления' : 'Ошибка создания пользователя');
  } finally {
    saving.value = false;
  }
};

const handleDelete = async (id: number) => {
  if (!confirm('Удалить этого пользователя?')) return;
  deletingId.value = id;
  try {
    await deleteUser(id);
    await loadUsers();
  } catch (e: any) {
    error.value = 'Ошибка удаления пользователя';
    console.error(e);
  } finally {
    deletingId.value = null;
  }
};

const isOwn = (user: PublicUser) => {
  const token = localStorage.getItem('auth_token');
  if (!token) return false;
  // Decode JWT payload to get current user id
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.sub === user.id;
  } catch {
    return false;
  }
};

onMounted(() => {
  loadUsers();
});
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">Пользователи</h2>
        <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">Управление доступом к системе</p>
      </div>
      <button v-if="!showForm" @click="showForm = true" class="btn-primary">
        <svg class="-ml-1 mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" /></svg>
        Создать пользователя
      </button>
      <button v-else @click="resetForm" class="btn-secondary">
        Отмена
      </button>
    </div>

    <!-- Create / Edit form -->
    <div v-if="showForm" class="surface-card p-6">
      <h3 class="text-lg font-semibold text-slate-900 dark:text-slate-100">
        {{ isEditMode ? `Редактирование пользователя #${editingId}` : 'Новый пользователь' }}
      </h3>
      <div class="mt-4 grid gap-4 md:max-w-xl md:grid-cols-2">
        <div>
          <label class="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Логин</label>
          <input v-model="form.login" type="text" class="input-base" placeholder="username" />
        </div>
        <div>
          <label class="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Пароль
            <span v-if="isEditMode" class="ml-1 font-normal text-slate-400 dark:text-slate-500">(пусто — не менять)</span>
          </label>
          <input v-model="form.password" type="password" class="input-base" :placeholder="isEditMode ? 'Минимум 4 символа' : 'Минимум 4 символа'" />
        </div>
        <div class="md:col-span-2">
          <label class="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Роль</label>
          <select v-model="form.role" class="input-base">
            <option value="user">Пользователь</option>
            <option value="admin">Администратор</option>
          </select>
        </div>
      </div>
      <div v-if="formError" class="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">{{ formError }}</div>
      <button @click="submit" :disabled="saving" class="mt-4 btn-primary">
        <span v-if="saving" class="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"></span>
        {{ saving ? (isEditMode ? 'Сохранение...' : 'Создание...') : (isEditMode ? 'Сохранить' : 'Создать') }}
      </button>
    </div>

    <!-- Error -->
    <div v-if="error && !showForm" class="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">{{ error }}</div>

    <!-- Users table -->
    <div v-if="loading" class="surface-card flex min-h-[200px] items-center justify-center">
      <div class="h-10 w-10 animate-spin rounded-full border-b-2 border-brand-600"></div>
    </div>

    <div v-else class="surface-card overflow-hidden">
      <table v-if="users.length > 0" class="w-full">
        <thead>
          <tr class="border-b border-slate-200 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-900/50">
            <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">ID</th>
            <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">Логин</th>
            <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">Роль</th>
            <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">Создан</th>
            <th class="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">Действия</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-200 dark:divide-slate-800">
          <tr v-for="user in users" :key="user.id" class="transition hover:bg-slate-50 dark:hover:bg-slate-900/60">
            <td class="whitespace-nowrap px-6 py-4 text-sm text-slate-500 dark:text-slate-400">#{{ user.id }}</td>
            <td class="whitespace-nowrap px-6 py-4 text-sm font-medium text-slate-900 dark:text-white">{{ user.login }}</td>
            <td class="whitespace-nowrap px-6 py-4 text-sm">
              <span class="rounded-full px-2.5 py-1 text-xs font-medium" :class="user.role === 'admin' ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-200' : 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-200'">
                {{ user.role === 'admin' ? 'Админ' : 'Пользователь' }}
              </span>
            </td>
            <td class="whitespace-nowrap px-6 py-4 text-sm text-slate-500 dark:text-slate-400">{{ new Date(user.createdAt).toLocaleDateString('ru-RU') }}</td>
            <td class="whitespace-nowrap px-6 py-4 text-right text-sm space-x-3">
              <button
                @click="handleEdit(user)"
                class="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
              >
                Редактировать
              </button>
              <button
                v-if="!isOwn(user)"
                @click="handleDelete(user.id)"
                :disabled="deletingId === user.id"
                class="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
              >
                <span v-if="deletingId === user.id" class="inline-block h-4 w-4 animate-spin rounded-full border-2 border-red-300 border-t-red-600"></span>
                <span v-else>Удалить</span>
              </button>
              <span v-if="isOwn(user)" class="text-xs text-slate-400 dark:text-slate-500">(вы)</span>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-else class="flex flex-col items-center justify-center px-6 py-12 text-center">
        <p class="text-sm text-slate-500 dark:text-slate-400">Пользователей пока нет. Создайте первого!</p>
      </div>
    </div>
  </div>
</template>
