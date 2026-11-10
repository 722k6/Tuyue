<script setup lang="ts">
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ApiRequestError, login } from '../api';
import { saveSession } from '../session';

const route = useRoute();
const router = useRouter();
const username = ref('');
const password = ref('');
const loading = ref(false);
const errorMessage = ref('');

/** 只接受站内路径，防止 ?redirect=//evil.com 这类跳转被利用。 */
function resolveRedirect(): string {
  const raw = Array.isArray(route.query.redirect) ? route.query.redirect[0] : route.query.redirect;
  return typeof raw === 'string' && raw.startsWith('/') && !raw.startsWith('//')
    ? raw
    : '/dashboard';
}

async function submit(): Promise<void> {
  errorMessage.value = '';
  if (!username.value.trim() || !password.value) {
    errorMessage.value = '请输入账号和密码';
    return;
  }
  loading.value = true;
  try {
    const session = await login({ username: username.value.trim(), password: password.value });
    saveSession(session);
    await router.push(resolveRedirect());
  } catch (error) {
    errorMessage.value =
      error instanceof ApiRequestError ? error.message : '登录失败，请稍后再试';
  } finally {
    loading.value = false;
  }
}
</script>
<template>
  <main class="login">
    <el-card>
      <h1>途越 CMS 登录</h1>
      <p>请使用后台账号登录，演示账号见 docs/api/foundation-contracts.md。</p>
      <el-alert
        v-if="errorMessage"
        :title="errorMessage"
        type="error"
        show-icon
        :closable="false"
        class="login-error"
      />
      <el-form label-position="top" @submit.prevent="submit">
        <el-form-item label="账号">
          <el-input
            v-model="username"
            autocomplete="username"
            placeholder="请输入账号"
            @keyup.enter="submit"
          />
        </el-form-item>
        <el-form-item label="密码">
          <el-input
            v-model="password"
            type="password"
            show-password
            autocomplete="current-password"
            placeholder="请输入密码"
            @keyup.enter="submit"
          />
        </el-form-item>
        <el-button type="primary" native-type="submit" :loading="loading">登录</el-button>
      </el-form>
    </el-card>
  </main>
</template>
<style scoped>
.login-error {
  margin-bottom: 12px;
}
</style>
