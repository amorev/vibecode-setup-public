import { createRouter, createWebHashHistory } from 'vue-router';

const requireAuth = (to: any, from: any, next: any) => {
  const token = localStorage.getItem('auth_token');
  if (!token) {
    next({ name: 'login' });
  } else {
    next();
  }
};

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('@/views/PublicView.vue'),
    },
    {
      path: '/reminders',
      name: 'reminders',
      component: () => import('@/views/RemindersView.vue'),
      beforeEnter: requireAuth,
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
      meta: { guest: true },
    },
    {
      path: '/admin',
      component: () => import('@/layouts/AdminLayout.vue'),
      beforeEnter: requireAuth,
      redirect: { name: 'admin-users' },
      children: [
        {
          path: '',
          name: 'admin-users',
          component: () => import('@/views/admin/ManageUsersView.vue'),
        },
        {
          path: 'telegram-bot',
          name: 'admin-telegram-bot',
          component: () => import('@/views/admin/TelegramBotView.vue'),
        },
      ],
    },
  ],
});

export default router;
