<script setup lang="ts">
import { AdminRole } from '@tuyue/contracts';
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { getAdminRole } from '../features/admin-session';
import { clearSession, loadSession } from '../session';

/**
 * CMS 主布局（US-SYS-03）。
 *
 * 桌面端是「固定侧边栏 + 顶栏 + 内容区」的经典三段式；
 * ≤900px 时侧边栏变成可以滑出的抽屉，靠顶栏的「菜单」按钮开关——
 * 平板宽度下把 220px 的侧栏硬留在屏幕上，表格会只剩三四列可见。
 * 面包屑直接读路由的 meta.title，新增页面只要补一个 title 就能显示层级。
 */
const route = useRoute();
const router = useRouter();
const session = loadSession();
const userLabel = session ? `${session.user.displayName}（${session.user.username}）` : '未登录';
const role = getAdminRole();
const canReview = role === AdminRole.REVIEWER || role === AdminRole.SUPER_ADMIN;
const isSuperAdmin = role === AdminRole.SUPER_ADMIN;

const menuOpen = ref(false);
const isNarrow = ref(false);

const currentTitle = computed(() => (route.meta.title as string | undefined) ?? '工作台');

function syncViewport(): void {
  isNarrow.value = window.innerWidth <= 900;
  // 回到桌面宽度时收起抽屉，避免遮罩留在屏幕上
  if (!isNarrow.value) menuOpen.value = false;
}

onMounted(() => {
  syncViewport();
  window.addEventListener('resize', syncViewport);
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', syncViewport);
});

// 点菜单跳转后抽屉自动关上，否则手机上要再点一次遮罩
watch(
  () => route.fullPath,
  () => {
    menuOpen.value = false;
  },
);

function logout(): void {
  clearSession();
  void router.push('/login');
}
</script>

<template>
  <el-container class="shell">
    <el-aside class="cms-aside" :class="{ 'is-open': menuOpen }" width="220px">
      <div class="cms-aside__brand">
        <span class="cms-aside__mark" aria-hidden="true">途</span>
        <span class="cms-aside__name">途越 CMS</span>
      </div>
      <el-menu router :default-active="$route.path" class="cms-menu">
        <el-menu-item index="/dashboard">数据看板</el-menu-item>
        <el-menu-item index="/cars">车型管理</el-menu-item>
        <el-menu-item index="/cars/publish">车型上下架</el-menu-item>
        <el-menu-item v-if="canReview" index="/reviews">内容审核</el-menu-item>
        <el-menu-item index="/activities">活动管理</el-menu-item>
        <el-menu-item index="/dealers">经销商管理</el-menu-item>
        <el-menu-item v-if="isSuperAdmin" index="/admins">管理员</el-menu-item>
      </el-menu>
    </el-aside>

    <!-- 窄屏抽屉的遮罩：点空白处关闭，避免侧栏挡住表格时无从下手 -->
    <div v-if="menuOpen && isNarrow" class="cms-overlay" @click="menuOpen = false" />

    <el-container>
      <el-header class="topbar">
        <div class="topbar__left">
          <button
            v-if="isNarrow"
            type="button"
            class="topbar__menu"
            aria-label="打开导航菜单"
            @click="menuOpen = !menuOpen"
          >
            菜单
          </button>
          <el-breadcrumb separator="/" class="topbar__crumbs">
            <el-breadcrumb-item :to="{ path: '/dashboard' }">首页</el-breadcrumb-item>
            <el-breadcrumb-item>{{ currentTitle }}</el-breadcrumb-item>
          </el-breadcrumb>
        </div>
        <div class="topbar__right">
          <span class="topbar__user">{{ userLabel }}</span>
          <el-button size="small" @click="logout">退出登录</el-button>
        </div>
      </el-header>
      <el-main class="cms-main"><RouterView /></el-main>
    </el-container>
  </el-container>
</template>

<style scoped>
.cms-aside {
  display: flex;
  flex-direction: column;
  background: #fff;
  border-right: 1px solid #e5e7eb;
}

.cms-aside__brand {
  display: flex;
  align-items: center;
  gap: 10px;
  height: 60px;
  padding: 0 18px;
  border-bottom: 1px solid #eef1f5;
}

.cms-aside__mark {
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  border-radius: 8px;
  background: #2457a7;
  color: #fff;
  font-size: 14px;
}

.cms-aside__name {
  font-size: 15px;
  font-weight: 700;
  color: #1f2937;
  letter-spacing: 0.02em;
}

.cms-menu {
  border-right: 0;
}

.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  background: #fff;
  border-bottom: 1px solid #e5e7eb;
}

.topbar__left,
.topbar__right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.topbar__user {
  font-size: 13px;
  color: #586474;
}

.topbar__menu {
  padding: 6px 12px;
  border: 1px solid #dfe6ee;
  border-radius: 8px;
  background: #fff;
  font-size: 13px;
  color: #1f2937;
  cursor: pointer;
}

.cms-main {
  padding: 20px 24px 32px;
}

.cms-overlay {
  position: fixed;
  inset: 0;
  z-index: 20;
  background: rgb(16 26 36 / 40%);
}

@media (max-width: 900px) {
  /* 窄屏：侧边栏改成从左侧滑出的抽屉，不再挤占表格宽度 */
  .cms-aside {
    position: fixed;
    top: 0;
    bottom: 0;
    left: 0;
    z-index: 30;
    transform: translateX(-100%);
    transition: transform 0.2s ease;
    box-shadow: 0 18px 40px rgb(16 26 36 / 18%);
  }

  .cms-aside.is-open {
    transform: translateX(0);
  }

  .cms-main {
    padding: 16px;
  }

  .topbar__user {
    display: none;
  }
}
</style>
