import { defineStore } from 'pinia';
import { ref } from 'vue';
import { webApi } from '../api';

export const useHealthStore = defineStore('health', () => {
  const status = ref<'idle' | 'loading' | 'ok' | 'error'>('idle');
  const requestId = ref('');

  async function check(): Promise<void> {
    status.value = 'loading';
    try {
      const response = await webApi.health();
      status.value = response.data.status;
      requestId.value = response.requestId;
    } catch {
      status.value = 'error';
    }
  }

  return { status, requestId, check };
});
