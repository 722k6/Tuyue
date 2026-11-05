import {
  CarStatusAction,
  PublishStatus,
  type AdminCarListItem,
  type CarStatusAuditLog,
  type CarStatusChangeResponse,
} from '@tuyue/contracts';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { CarStatusApiError, changeCarStatus, fetchAdminCars, fetchCarStatusLogs } from './car-status.api';

export type LoadStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface CarStatusFilter {
  keyword: string;
  status: PublishStatus | 'all';
}

const STATUS_LABEL: Record<PublishStatus, string> = {
  draft: '草稿',
  pending_review: '待审核',
  published: '已上架',
  offline: '已下架',
};

export function statusLabel(status: PublishStatus): string {
  return STATUS_LABEL[status] ?? status;
}

export const useCarStatusStore = defineStore('car-status', () => {
  const items = ref<AdminCarListItem[]>([]);
  const status = ref<LoadStatus>('idle');
  const errorMessage = ref('');
  const keyword = ref('');
  const statusFilter = ref<PublishStatus | 'all'>('all');
  const logsByCarId = ref<Record<string, CarStatusAuditLog[]>>({});
  const pendingCarId = ref<string | null>(null);

  const visibleItems = computed(() => {
    const keywordValue = keyword.value.trim().toLowerCase();
    return items.value.filter((car) => {
      const matchStatus =
        statusFilter.value === 'all' ? true : car.publishStatus === statusFilter.value;
      const matchKeyword =
        keywordValue.length === 0
          ? true
          : `${car.name}${car.series}`.toLowerCase().includes(keywordValue);
      return matchStatus && matchKeyword;
    });
  });

  const publishedCount = computed(
    () => items.value.filter((car) => car.publishStatus === PublishStatus.PUBLISHED).length,
  );
  const offlineCount = computed(
    () => items.value.filter((car) => car.publishStatus !== PublishStatus.PUBLISHED).length,
  );

  async function load(): Promise<void> {
    status.value = 'loading';
    errorMessage.value = '';
    try {
      items.value = await fetchAdminCars();
      status.value = 'ready';
    } catch (error) {
      status.value = 'error';
      errorMessage.value = error instanceof Error ? error.message : '车型列表加载失败';
    }
  }

  /**
   * 执行上架/下架。
   * 成功后按返回的条目就地替换，避免整表重排导致操作行跳动；同时把新留痕插到缓存头部，
   * 这样用户点开「留痕」不用再等一次请求。
   */
  async function changeStatus(
    carId: string,
    action: CarStatusAction,
    options: { actor?: string; reason?: string } = {},
  ): Promise<CarStatusChangeResponse> {
    pendingCarId.value = carId;
    try {
      const result = await changeCarStatus(carId, action, options);
      const index = items.value.findIndex((car) => car.id === carId);
      if (index >= 0) items.value[index] = result.car;
      const cached = logsByCarId.value[carId];
      if (cached) logsByCarId.value[carId] = [result.log, ...cached];
      return result;
    } finally {
      pendingCarId.value = null;
    }
  }

  async function loadLogs(carId: string): Promise<CarStatusAuditLog[]> {
    const logs = await fetchCarStatusLogs(carId);
    logsByCarId.value[carId] = logs;
    return logs;
  }

  function logsOf(carId: string): CarStatusAuditLog[] {
    return logsByCarId.value[carId] ?? [];
  }

  function describeError(error: unknown): string {
    if (error instanceof CarStatusApiError) return error.message;
    return error instanceof Error ? error.message : '操作失败，请稍后重试';
  }

  return {
    items,
    visibleItems,
    status,
    errorMessage,
    keyword,
    statusFilter,
    publishedCount,
    offlineCount,
    pendingCarId,
    load,
    changeStatus,
    loadLogs,
    logsOf,
    describeError,
  };
});
