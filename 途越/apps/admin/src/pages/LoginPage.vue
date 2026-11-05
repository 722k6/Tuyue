<script setup lang="ts">
import { AdminRole, type AdminRole as AdminRoleValue } from '@tuyue/contracts';
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { saveAdminSession } from '../features/admin-session';

const ROLE_LABELS: Record<AdminRoleValue, string> = {
  [AdminRole.EDITOR]: '编辑',
  [AdminRole.REVIEWER]: '审核',
  [AdminRole.SUPER_ADMIN]: '超管',
};

const router = useRouter();
const username = ref('mock_editor');
const role = ref<AdminRoleValue>(AdminRole.EDITOR);

function login(): void {
  saveAdminSession(role.value, username.value);
  const redirect = router.currentRoute.value.query.redirect;
  void router.push(typeof redirect === 'string' ? redirect : '/dashboard');
}
</script>
<template>
  <main class="login">
    <el-card>
      <h1>途越 CMS 登录</h1>
      <p>Mock 登录占位，不包含真实鉴权。</p>
      <el-form label-position="top">
        <el-form-item label="账号">
          <el-input v-model="username" />
        </el-form-item>
        <el-form-item label="角色">
          <el-select v-model="role">
            <el-option
              v-for="value in Object.values(AdminRole)"
              :key="value"
              :label="`${ROLE_LABELS[value]}（${value}）`"
              :value="value"
            />
          </el-select>
        </el-form-item>
        <el-button type="primary" @click="login"> 进入 CMS </el-button>
      </el-form>
    </el-card>
  </main>
</template>
