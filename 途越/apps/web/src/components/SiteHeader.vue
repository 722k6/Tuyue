<script setup lang="ts">
import { ref, watch } from 'vue';
import { useRoute } from 'vue-router';

/**
 * 官网顶部导航（US-SYS-03）。
 *
 * 桌面端平铺导航，≤640px 收成「汉堡按钮 + 抽屉式菜单」：
 * 手机宽度下把 5 个入口硬塞进一行会挤成两三个字换行，点起来也很难点准。
 * 菜单在路由变化后自动收起，否则点完链接抽屉还盖在内容上。
 */
const links = [
  { to: '/cars', label: '车型' },
  { to: '/activities', label: '品牌活动' },
  { to: '/dealers', label: '经销商' },
  { to: '/compare', label: '车型对比' },
  { to: '/ai', label: 'AI 选车' },
];

const open = ref(false);
const route = useRoute();

watch(
  () => route.fullPath,
  () => {
    open.value = false;
  },
);
</script>

<template>
  <a class="skip-link" href="#main">跳到主要内容</a>

  <header class="site-header" :data-open="open">
    <div class="site-header__inner">
      <RouterLink to="/" class="brand">
        <span class="brand__mark" aria-hidden="true">途</span>
        <span class="brand__text">途越汽车</span>
      </RouterLink>

      <button
        type="button"
        class="nav-toggle"
        :aria-expanded="open"
        aria-controls="site-nav"
        @click="open = !open"
      >
        <span class="sr-only">{{ open ? '收起导航菜单' : '展开导航菜单' }}</span>
        <span class="nav-toggle__bar" aria-hidden="true" />
        <span class="nav-toggle__bar" aria-hidden="true" />
        <span class="nav-toggle__bar" aria-hidden="true" />
      </button>

      <nav id="site-nav" class="site-nav" :class="{ 'is-open': open }" aria-label="主导航">
        <RouterLink v-for="link in links" :key="link.to" :to="link.to" class="site-nav__link">
          {{ link.label }}
        </RouterLink>
      </nav>
    </div>
  </header>
</template>

<style scoped>
.skip-link {
  position: absolute;
  left: -9999px;
  top: 0;
  z-index: 60;
  padding: var(--space-2) var(--space-4);
  background: var(--color-brand);
  color: #fff;
  border-radius: 0 0 var(--radius-sm) 0;
}

.skip-link:focus {
  left: 0;
}

.site-header {
  position: sticky;
  top: 0;
  z-index: 40;
  background: rgb(255 255 255 / 92%);
  backdrop-filter: blur(8px);
  border-bottom: 1px solid var(--color-line);
}

.site-header__inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  max-width: var(--container-max);
  min-height: var(--header-height);
  margin: 0 auto;
  padding: 0 var(--container-gutter);
}

.brand {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  font-weight: 700;
  color: var(--color-ink);
  letter-spacing: 0.02em;
}

.brand__mark {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border-radius: 9px;
  background: var(--color-brand);
  color: #fff;
  font-size: 15px;
}

.site-nav {
  display: flex;
  align-items: center;
  gap: var(--space-5);
}

.site-nav__link {
  position: relative;
  padding: var(--space-2) 0;
  font-size: 15px;
  color: var(--color-ink-soft);
}

.site-nav__link:hover {
  color: var(--color-brand);
}

/* 当前页高亮，让用户知道自己在哪一节 */
.site-nav__link.router-link-active {
  color: var(--color-brand);
  font-weight: 600;
}

.site-nav__link.router-link-active::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 2px;
  border-radius: 2px;
  background: var(--color-brand);
}

.nav-toggle {
  display: none;
  flex-direction: column;
  justify-content: center;
  gap: 4px;
  width: 40px;
  height: 40px;
  padding: 0 9px;
  border: 1px solid var(--color-line);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  cursor: pointer;
}

.nav-toggle__bar {
  display: block;
  height: 2px;
  border-radius: 2px;
  background: var(--color-ink);
  transition: transform 0.2s ease;
}

@media (max-width: 900px) {
  .site-nav {
    gap: var(--space-4);
  }
}

@media (max-width: 640px) {
  .nav-toggle {
    display: flex;
  }

  /* 手机上导航收进抽屉：默认不占位，展开后撑开一个纵向列表 */
  .site-nav {
    display: none;
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    flex-direction: column;
    align-items: stretch;
    gap: 0;
    padding: var(--space-2) var(--container-gutter) var(--space-4);
    background: var(--color-surface);
    border-bottom: 1px solid var(--color-line);
    box-shadow: var(--shadow-md);
  }

  .site-nav.is-open {
    display: flex;
  }

  .site-nav__link {
    padding: var(--space-3) 0;
    border-bottom: 1px solid var(--color-line-soft);
  }

  .site-nav__link.router-link-active::after {
    display: none;
  }

  /* 展开后把上下两根推到中间再各转 45°，拼成关闭用的 ×；位移量＝(条高 + 间距) × 1 */
  .site-header[data-open='true'] .nav-toggle__bar:nth-child(2) {
    transform: translateY(6px) rotate(45deg);
  }

  .site-header[data-open='true'] .nav-toggle__bar:nth-child(3) {
    opacity: 0;
  }

  .site-header[data-open='true'] .nav-toggle__bar:nth-child(4) {
    transform: translateY(-6px) rotate(-45deg);
  }
}
</style>
