<script setup lang="ts">
defineProps<{ title: string; owner: string }>();
</script>
<template>
  <section>
    <h1>{{ title }}</h1>
    <el-empty :description="`${owner}可从此占位页开始开发`" />
  </section>
</template>
