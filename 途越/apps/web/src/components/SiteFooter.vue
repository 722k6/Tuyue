<script setup lang="ts">
/**
 * 官网页脚（US-SYS-03）。
 *
 * 内容保持「站点地图 + 联系 + 版权」三段式：访客滚到底部时通常要找的是
 * 「还有哪些页面」和「怎么联系」，而不是再读一遍品牌口号。
 */
const columns = [
  {
    title: '看车',
    links: [
      { to: '/cars', label: '全部车型' },
      { to: '/compare', label: '车型对比' },
      { to: '/ai', label: 'AI 选车' },
    ],
  },
  {
    title: '了解途越',
    links: [
      { to: '/activities', label: '品牌活动' },
      { to: '/dealers', label: '经销商网络' },
    ],
  },
];

const year = new Date().getFullYear();
</script>

<template>
  <footer class="site-footer">
    <div class="site-footer__inner">
      <div class="site-footer__brand">
        <p class="site-footer__logo">途越汽车</p>
        <p class="site-footer__slogan">让每一次出发都从容。</p>
        <p class="site-footer__contact">服务热线 400-000-0000 · 每日 9:00–21:00</p>
      </div>

      <nav
        v-for="column in columns"
        :key="column.title"
        class="site-footer__column"
        :aria-label="column.title"
      >
        <h2 class="site-footer__title">{{ column.title }}</h2>
        <RouterLink v-for="link in column.links" :key="link.to" :to="link.to" class="site-footer__link">
          {{ link.label }}
        </RouterLink>
      </nav>
    </div>

    <div class="site-footer__legal">
      <span>© {{ year }} 途越汽车 · 本站为教学演示项目</span>
      <span>演示数据由 Mock API 提供，不代表真实车款与价格</span>
    </div>
  </footer>
</template>

<style scoped>
.site-footer {
  margin-top: var(--space-8);
  background: #101a24;
  color: #cbd6e2;
}

.site-footer__inner {
  display: grid;
  grid-template-columns: minmax(260px, 1.6fr) repeat(2, minmax(120px, 1fr));
  gap: var(--space-6);
  max-width: var(--container-max);
  margin: 0 auto;
  padding: var(--space-7) var(--container-gutter);
}

.site-footer__logo {
  margin: 0 0 var(--space-2);
  font-size: 18px;
  font-weight: 700;
  color: #fff;
  letter-spacing: 0.04em;
}

.site-footer__slogan,
.site-footer__contact {
  margin: 0 0 var(--space-2);
  font-size: 13px;
  color: #93a4b5;
}

.site-footer__column {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.site-footer__title {
  margin: 0 0 var(--space-1);
  font-size: 13px;
  font-weight: 600;
  color: #fff;
  letter-spacing: 0.08em;
}

.site-footer__link {
  font-size: 13px;
  color: #93a4b5;
}

.site-footer__link:hover {
  color: var(--color-accent);
}

.site-footer__legal {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2) var(--space-5);
  max-width: var(--container-max);
  margin: 0 auto;
  padding: var(--space-4) var(--container-gutter) var(--space-6);
  border-top: 1px solid #1f2f3f;
  font-size: 12px;
  color: #7d8d9d;
}

@media (max-width: 900px) {
  .site-footer__inner {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .site-footer__brand {
    grid-column: 1 / -1;
  }
}

@media (max-width: 640px) {
  .site-footer__inner {
    padding: var(--space-6) var(--container-gutter);
  }
}
</style>
