<script setup lang="ts">
import { AdminRole, type AdminRole as AdminRoleValue } from '@tuyue/contracts';
import { ref } from 'vue';
const username = ref('mock_editor');
const role = ref<AdminRoleValue>(AdminRole.EDITOR);
</script>
<template><main class="login"><el-card><h1>途越 CMS 登录</h1><p>Mock 登录占位，不包含真实鉴权。</p>
  <el-form label-position="top"><el-form-item label="账号"><el-input v-model="username" /></el-form-item>
  <el-form-item label="角色"><el-select v-model="role"><el-option v-for="value in Object.values(AdminRole)" :key="value" :label="value" :value="value" /></el-select></el-form-item>
  <el-button type="primary" @click="$router.push('/dashboard')">进入 CMS</el-button></el-form>
</el-card></main></template>
