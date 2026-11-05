import {
  COMPARE_MAX_SIZE,
  type CarSummary,
  type CompareListResponse,
  type CompareMatrixResponse,
  type CompareSelectionItem,
} from '@tuyue/contracts';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import type { LoadStatus } from '../../shared/load-status';
import {
  CompareApiError,
  addCompareItem,
  clearCompare,
  fetchCompare,
  fetchCompareMatrix,
  removeCompareItem,
} from './compare.api';
import {
  clearStoredCompare,
  getVisitorId,
  readStoredCompare,
  writeStoredCompare,
} from './compare.storage';

/**
 * 对比清单（US-CMP-01）。
 *
 * 「本地与服务端双存」的分工：
 * - 本地 localStorage 是交互的第一响应者，点一下立刻进对比栏，刷新也不丢；
 * - 服务端按 visitorId 记账，负责跨设备/换浏览器后把清单捞回来。
 * 两份数据以「本地优先、服务端补全」合并：本地代表用户此刻的意图，
 * 直接拿服务端覆盖会把刚点进来、还没同步上去的那台车抹掉。
 */
export const useCompareStore = defineStore('compare', () => {
  const visitorId = ref(getVisitorId());
  const items = ref<CompareSelectionItem[]>(readStoredCompare());
  const matrix = ref<CompareMatrixResponse | null>(null);
  const status = ref<LoadStatus>(items.value.length > 0 ? 'ready' : 'idle');
  const matrixStatus = ref<LoadStatus>('idle');
  const notice = ref('');
  const serverSynced = ref(false);

  const count = computed(() => items.value.length);
  const isFull = computed(() => items.value.length >= COMPARE_MAX_SIZE);
  const carIds = computed(() => items.value.map((item) => item.carId));
  const canCompare = computed(() => items.value.length >= 2);

  function has(carId: string): boolean {
    return items.value.some((item) => item.carId === carId);
  }

  function applyLocal(next: readonly CompareSelectionItem[]): void {
    const sliced = next.slice(0, COMPARE_MAX_SIZE);
    items.value = [...sliced];
    if (sliced.length > 0) writeStoredCompare(sliced);
    else clearStoredCompare();
  }

  function applyServer(list: CompareListResponse): void {
    applyLocal(list.items);
    matrix.value = null;
    matrixStatus.value = 'idle';
  }

  /**
   * 读取对比清单：先本地即时可用，再向服务端合并。
   * 服务端挂掉时不清空本地，对比栏照常可用（验收要求「刷新后不丢」）。
   */
  async function load(): Promise<void> {
    const local = readStoredCompare();
    if (local.length > 0) {
      items.value = local;
      status.value = 'ready';
    }

    status.value = items.value.length > 0 ? 'ready' : 'loading';
    try {
      const remote = await fetchCompare(visitorId.value);
      // 本地顺序代表用户的操作顺序，放前面；服务端独有的（换设备进来的）追加在后面
      const merged = [...local];
      for (const item of remote.items) {
        if (!merged.some((entry) => entry.carId === item.carId)) merged.push(item);
      }
      applyLocal(merged);
      serverSynced.value = true;
      status.value = 'ready';
    } catch {
      serverSynced.value = false;
      status.value = items.value.length > 0 ? 'ready' : 'error';
    }
  }

  async function add(car: CarSummary): Promise<boolean> {
    notice.value = '';
    if (has(car.id)) {
      notice.value = `「${car.name}」已经在对比清单里了`;
      return false;
    }
    if (isFull.value) {
      notice.value = `最多同时对比 ${COMPARE_MAX_SIZE} 台，请先移除一台`;
      return false;
    }

    applyLocal([...items.value, { carId: car.id, addedAt: new Date().toISOString(), car }]);

    try {
      applyServer(await addCompareItem(visitorId.value, car.id));
      serverSynced.value = true;
      return true;
    } catch (error) {
      // 业务错误（已满 / 已下架 / 重复）要回滚，否则本地会留着服务端拒绝的脏数据；
      // 网络错误则保留本地副本，等下次 load 再对齐。
      if (error instanceof CompareApiError && error.code !== 'NETWORK_ERROR') {
        applyLocal(items.value.filter((item) => item.carId !== car.id));
        notice.value = error.message;
        return false;
      }
      notice.value = '已加入本地对比，联网后自动同步';
      return true;
    }
  }

  async function remove(carId: string): Promise<void> {
    notice.value = '';
    applyLocal(items.value.filter((item) => item.carId !== carId));
    matrix.value = null;
    matrixStatus.value = 'idle';

    try {
      await removeCompareItem(visitorId.value, carId);
      serverSynced.value = true;
    } catch {
      // 本地已移除；服务端下次 load 会纠正，不打扰用户
      serverSynced.value = false;
    }
  }

  async function clear(): Promise<void> {
    notice.value = '';
    applyLocal([]);
    matrix.value = null;
    matrixStatus.value = 'idle';

    try {
      await clearCompare(visitorId.value);
      serverSynced.value = true;
    } catch {
      serverSynced.value = false;
    }
  }

  async function loadMatrix(ids: string[] = carIds.value): Promise<void> {
    if (ids.length === 0) {
      matrix.value = null;
      matrixStatus.value = 'ready';
      return;
    }

    matrixStatus.value = 'loading';
    try {
      matrix.value = await fetchCompareMatrix(ids, visitorId.value);
      matrixStatus.value = 'ready';
    } catch {
      matrix.value = null;
      matrixStatus.value = 'error';
    }
  }

  function clearNotice(): void {
    notice.value = '';
  }

  return {
    visitorId,
    items,
    matrix,
    status,
    matrixStatus,
    notice,
    serverSynced,
    count,
    isFull,
    carIds,
    canCompare,
    has,
    load,
    add,
    remove,
    clear,
    loadMatrix,
    clearNotice,
  };
});
