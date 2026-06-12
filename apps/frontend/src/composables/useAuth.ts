import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { login as loginApi, getMe, type LoginRequest, type AuthUser } from '@/api/auth';

const token = ref<string | null>(localStorage.getItem('auth_token'));
const user = ref<AuthUser | null>(null);
const loading = ref(false);
const error = ref<string | null>(null);

export function useAuth() {
  const router = useRouter();

  const login = async (data: LoginRequest) => {
    loading.value = true;
    error.value = null;
    try {
      const response = await loginApi(data);
      token.value = response.access_token;
      localStorage.setItem('auth_token', response.access_token);
      await fetchUser();
      return true;
    } catch (e: any) {
      error.value = e.response?.data?.message || 'Ошибка входа';
      return false;
    } finally {
      loading.value = false;
    }
  };

  const logout = () => {
    token.value = null;
    user.value = null;
    localStorage.removeItem('auth_token');
    router.push('/login');
  };

  const fetchUser = async () => {
    if (!token.value) {
      user.value = null;
      return;
    }
    try {
      user.value = await getMe();
    } catch {
      logout();
    }
  };

  const checkAuth = async () => {
    if (token.value) {
      await fetchUser();
    }
  };

  onMounted(() => {
    if (token.value && !user.value) {
      fetchUser();
    }
  });

  return {
    token,
    user,
    loading,
    error,
    login,
    logout,
    fetchUser,
    checkAuth,
  };
}
