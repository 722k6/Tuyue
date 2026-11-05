import type { ActivityDto } from '@tuyue/contracts';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import type { LoadStatus } from '../../shared/load-status';
import { fetchActivities } from './activity.api';

export function isOngoing(activity: ActivityDto, now: Date = new Date()): boolean {
  const startsAt = new Date(activity.startsAt);
  const endsAt = new Date(activity.endsAt);
  return activity.published && startsAt <= now && endsAt >= now;
}

export const useActivityStore = defineStore('activity', () => {
  const items = ref<ActivityDto[]>([]);
  const status = ref<LoadStatus>('idle');

  const ongoing = computed(() => items.value.filter((item) => isOngoing(item)));

  async function load(): Promise<void> {
    status.value = 'loading';
    try {
      items.value = await fetchActivities();
      status.value = 'ready';
    } catch {
      status.value = 'error';
    }
  }

  return { items, status, ongoing, load };
});
