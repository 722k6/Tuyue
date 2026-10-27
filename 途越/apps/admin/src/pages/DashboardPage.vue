<script setup lang="ts">
import { onMounted } from 'vue';
import { useAdminHealthStore } from '../stores/health';
const health = useAdminHealthStore();
onMounted(() => health.check());
</script>
<template><section><h1>数据看板占位</h1><el-alert :title="`Mock API 状态：${health.status}`" type="info" :closable="false" /><p>数据指标与图表由运营责任线后续实现。</p></section></template>
