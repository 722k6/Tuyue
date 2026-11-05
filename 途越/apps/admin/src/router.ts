import { AdminRole } from '@tuyue/contracts';
import { createRouter, createWebHistory } from 'vue-router';
import { getAdminRole } from './features/admin-session';
import CmsLayout from './layouts/CmsLayout.vue';
import CarPublishPage from './pages/CarPublishPage.vue';
import DashboardPage from './pages/DashboardPage.vue';
import LoginPage from './pages/LoginPage.vue';
import ModulePage from './pages/ModulePage.vue';
import CarsPage from './pages/cars/CarsPage.vue';
import ReviewPage from './pages/reviews/ReviewPage.vue';

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
        // US-CAR-13：车型上下架独立成页，与 US-CAR-10 的车型编辑分开
        { path: 'cars/publish', component: CarPublishPage },
        // US-ADM-02：内容审核只对审核和超管开放
        {
          path: 'reviews',
          component: ReviewPage,
          meta: { roles: [AdminRole.REVIEWER, AdminRole.SUPER_ADMIN] },
        },
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

/**
 * 临时登录守卫（US-SYS-01 落地前）。
 *
 * 只校验本地角色，不是真实鉴权；目的是让审核入口和页面权限在 Mock 阶段可演示。
 */
router.beforeEach((to) => {
  const requiresAuth = to.matched.some((record) => record.meta.requiresAuth);
  const role = getAdminRole();

  if (requiresAuth && !role) {
    return { path: '/login', query: { redirect: to.fullPath } };
  }

  const roles = to.meta.roles as AdminRole[] | undefined;
  if (roles && role && !roles.includes(role)) {
    return { path: '/dashboard' };
  }
  return true;
});
