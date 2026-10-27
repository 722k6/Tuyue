import { defineStore } from 'pinia';
import { ref } from 'vue';
import { getHealth } from '../api';

export const useAdminHealthStore = defineStore('admin-health', () => {
  const status = ref<'idle' | 'loading' | 'ok' | 'error'>('idle');
  const requestId = ref('');
  async function check(): Promise<void> {
    status.value = 'loading';
    try {
      const response = await getHealth();
      status.value = response.data.status;
      requestId.value = response.requestId;
    } catch { status.value = 'error'; }
  }
  return { status, requestId, check };
});
