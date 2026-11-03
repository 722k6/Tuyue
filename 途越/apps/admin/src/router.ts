import { AdminRole } from '@tuyue/contracts';
import { createRouter, createWebHistory } from 'vue-router';
import CmsLayout from './layouts/CmsLayout.vue';
import DashboardPage from './pages/DashboardPage.vue';
import LoginPage from './pages/LoginPage.vue';
import ModulePage from './pages/ModulePage.vue';
import CarsPage from './pages/cars/CarsPage.vue';

const allRoles = Object.values(AdminRole);
export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login', component: LoginPage },
    { path: '/', redirect: '/dashboard' },
    {
      path: '/',
      component: CmsLayout,
      meta: { requiresAuth: true, roles: allRoles },
      children: [
        { path: 'dashboard', component: DashboardPage },
        { path: 'cars', component: CarsPage },
        {
          path: 'activities',
          component: ModulePage,
          props: { title: '活动管理', owner: '运营责任线' },
        },
        {
          path: 'dealers',
          component: ModulePage,
          props: { title: '经销商管理', owner: '运营责任线' },
        },
        {
          path: 'admins',
          component: ModulePage,
          props: { title: '管理员', owner: '权限责任线' },
          meta: { roles: [AdminRole.SUPER_ADMIN] },
        },
      ],
    },
  ],
});
