<script setup lang="ts">
import { useRouter } from 'vue-router';
import { clearSession, loadSession } from '../session';

const router = useRouter();
const session = loadSession();
const userLabel = session
  ? `${session.user.displayName}（${session.user.username}）`
  : '未登录';

function logout(): void {
  clearSession();
  void router.push('/login');
}
</script>
<template>
  <el-container class="shell">
    <el-aside width="220px">
      <h2>途越 CMS</h2>
      <el-menu router :default-active="$route.path">
        <el-menu-item index="/dashboard"> 数据看板 </el-menu-item
        ><el-menu-item index="/cars"> 车型管理 </el-menu-item>
        <el-menu-item index="/cars/publish"> 车型上下架 </el-menu-item>
        <el-menu-item index="/activities"> 活动管理 </el-menu-item
        ><el-menu-item index="/dealers"> 经销商管理 </el-menu-item>
        <el-menu-item index="/admins"> 管理员 </el-menu-item>
      </el-menu> </el-aside
    ><el-container
      ><el-header class="topbar">
        <span>{{ userLabel }}</span>
        <el-button size="small" @click="logout">退出登录</el-button> </el-header
      ><el-main><RouterView /></el-main
    ></el-container>
  </el-container>
</template>
<style scoped>
.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
</style>
