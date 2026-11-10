import { AdminRole } from '@tuyue/contracts';
import { createRouter, createWebHistory } from 'vue-router';
import CmsLayout from './layouts/CmsLayout.vue';
import CarPublishPage from './pages/CarPublishPage.vue';
import DashboardPage from './pages/DashboardPage.vue';
import LoginPage from './pages/LoginPage.vue';
import ModulePage from './pages/ModulePage.vue';
import CarsPage from './pages/cars/CarsPage.vue';
import ReviewPage from './pages/reviews/ReviewPage.vue';
import { loadSession, setUnauthorizedHandler } from './session';

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

// 守卫顺序：未登录 → 去登录页并记住原目标；已登录访问登录页 → 回看板；
// 角色不足 → 回看板（US-SYS-02）
router.beforeEach((to) => {
  const session = loadSession();
  if (to.path === '/login') return session ? '/dashboard' : true;
  if (!to.meta.requiresAuth) return true;
  if (!session) {
    const redirect = to.fullPath === '/' ? undefined : to.fullPath;
    return redirect ? { path: '/login', query: { redirect } } : '/login';
  }
  const roles = to.meta.roles as AdminRole[] | undefined;
  if (roles && !roles.includes(session.user.role)) return '/dashboard';
  return true;
});

// 接口返回 401：清掉本地登录态并把当前地址带入 redirect，登录后原路返回
setUnauthorizedHandler(() => {
  const current = router.currentRoute.value;
  if (current.path === '/login') return;
  void router.push({ path: '/login', query: { redirect: current.fullPath } });
});
