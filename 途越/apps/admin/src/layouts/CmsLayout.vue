<script setup lang="ts">
import { AdminRole } from '@tuyue/contracts';
import { getAdminRole, getAdminUsername } from '../features/admin-session';

const role = getAdminRole();
const username = getAdminUsername();
const canReview = role === AdminRole.REVIEWER || role === AdminRole.SUPER_ADMIN;
const isSuperAdmin = role === AdminRole.SUPER_ADMIN;
</script>

<template>
  <el-container class="shell">
    <el-aside width="220px">
      <h2>途越 CMS</h2>
      <el-menu router :default-active="$route.path">
        <el-menu-item index="/dashboard"> 数据看板 </el-menu-item
        ><el-menu-item index="/cars"> 车型管理 </el-menu-item>
        <el-menu-item index="/cars/publish"> 车型上下架 </el-menu-item>
        <el-menu-item v-if="canReview" index="/reviews"> 内容审核 </el-menu-item>
        <el-menu-item index="/activities"> 活动管理 </el-menu-item
        ><el-menu-item index="/dealers"> 经销商管理 </el-menu-item>
        <el-menu-item v-if="isSuperAdmin" index="/admins"> 管理员 </el-menu-item>
      </el-menu> </el-aside
    ><el-container
      ><el-header>最小工程基线 · {{ username }}（{{ role }}）</el-header
      ><el-main><RouterView /></el-main
    ></el-container>
  </el-container>
</template>
