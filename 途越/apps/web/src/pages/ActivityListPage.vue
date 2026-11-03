<script setup lang="ts">
import { onMounted } from 'vue';
import { TrackEventName, track } from '../analytics/track';
import { useActivityStore } from '../features/activity/activity.store';

const activity = useActivityStore();

onMounted(async () => {
  await track(TrackEventName.PAGE_VIEW, { page: 'activities' });
  await activity.load();
});

function formatRange(startsAt: string, endsAt: string): string {
  const format = (value: string) => value.slice(0, 10).replace(/-/g, '/');
  return `${format(startsAt)} - ${format(endsAt)}`;
}
</script>

<template>
  <section>
    <h1>品牌活动</h1>
    <p v-if="activity.status === 'loading'">加载中…</p>
    <p v-else-if="activity.status === 'error'">活动加载失败，请稍后重试。</p>
    <ul v-else class="activity-list">
      <li v-for="item in activity.items" :key="item.id" class="activity-card">
        <h2>{{ item.name }}</h2>
        <p class="activity-card__range">{{ formatRange(item.startsAt, item.endsAt) }}</p>
        <p>{{ item.summary }}</p>
        <span class="activity-card__status">{{ item.published ? '已发布' : '未发布' }}</span>
      </li>
    </ul>
  </section>
</template>
