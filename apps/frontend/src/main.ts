import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import { useTheme } from './composables/useTheme';
import './style.css';

const app = createApp(App);
const theme = useTheme();

app.provide('theme', theme);
app.config.globalProperties.$theme = theme;
app.use(router);
app.mount('#app');
