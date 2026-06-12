import { computed, ref, watch } from 'vue';

export type ThemePreference = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'theme_preference';
const theme = ref<ThemePreference>('system');
const systemPrefersDark = ref(false);
let initialized = false;
let mediaQuery: MediaQueryList | null = null;

const applyTheme = () => {
  if (typeof document === 'undefined') return;
  const isDark = theme.value === 'dark' || (theme.value === 'system' && systemPrefersDark.value);
  document.documentElement.classList.toggle('dark', isDark);
  document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';
};

const initTheme = () => {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;

  mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  systemPrefersDark.value = mediaQuery.matches;

  const savedTheme = localStorage.getItem(STORAGE_KEY);
  if (savedTheme === 'light' || savedTheme === 'dark' || savedTheme === 'system') {
    theme.value = savedTheme;
  }

  const handleChange = (event: MediaQueryListEvent) => {
    systemPrefersDark.value = event.matches;
  };

  if (typeof mediaQuery.addEventListener === 'function') {
    mediaQuery.addEventListener('change', handleChange);
  } else {
    mediaQuery.addListener(handleChange);
  }

  applyTheme();
};

watch([theme, systemPrefersDark], () => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, theme.value);
  }
  applyTheme();
}, { immediate: true });

const setTheme = (value: ThemePreference) => {
  theme.value = value;
};

const toggleTheme = () => {
  const isCurrentlyDark = theme.value === 'dark' || (theme.value === 'system' && systemPrefersDark.value);
  theme.value = isCurrentlyDark ? 'light' : 'dark';
};

const isDark = computed(() => theme.value === 'dark' || (theme.value === 'system' && systemPrefersDark.value));

export const useTheme = () => {
  initTheme();

  return {
    theme,
    setTheme,
    toggleTheme,
    isDark,
  };
};
