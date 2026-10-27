import { createRouter, createWebHistory } from 'vue-router';
import CarDetailPage from './pages/CarDetailPage.vue';
import CarsPage from './pages/CarsPage.vue';
import HomePage from './pages/HomePage.vue';
import PlaceholderPage from './pages/PlaceholderPage.vue';

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: HomePage },
    { path: '/cars', component: CarsPage },
    { path: '/cars/:id', component: CarDetailPage },
    {
      path: '/ai',
      component: PlaceholderPage,
      props: { title: 'AI 选车', description: 'AI 责任线入口占位。' },
    },
    {
      path: '/compare',
      component: PlaceholderPage,
      props: { title: '车型对比', description: '购车决策责任线入口占位。' },
    },
  ],
});
