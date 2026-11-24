import { createRouter, createWebHistory } from 'vue-router';
import ActivityListPage from './pages/ActivityListPage.vue';
import CarDetailPage from './pages/CarDetailPage.vue';
import CarsPage from './pages/CarsPage.vue';
import ComparePage from './pages/ComparePage.vue';
import DealerListPage from './pages/DealerListPage.vue';
import HomePage from './pages/HomePage.vue';
import NotFoundPage from './pages/NotFoundPage.vue';
import PlaceholderPage from './pages/PlaceholderPage.vue';

export const router = createRouter({
  history: createWebHistory(),
  // 切页面回到顶部，否则从长列表点进详情会停在页面中段
  scrollBehavior: () => ({ top: 0 }),
  routes: [
    { path: '/', component: HomePage },
    { path: '/cars', component: CarsPage },
    { path: '/cars/:id', component: CarDetailPage },
    { path: '/activities', component: ActivityListPage },
    { path: '/dealers', component: DealerListPage },
    {
      path: '/ai',
      component: PlaceholderPage,
      props: { title: 'AI 选车', description: 'AI 责任线入口占位。' },
    },
    // US-CMP-01/02：对比页不再是占位页
    { path: '/compare', component: ComparePage },
    // 兜底 404：地址写错时不白屏
    { path: '/:pathMatch(.*)*', component: NotFoundPage },
  ],
});
