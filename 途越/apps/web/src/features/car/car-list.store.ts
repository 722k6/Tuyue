import { PublishStatus, type CarSummary } from '@tuyue/contracts';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { webApi } from '../../api';
import type { LoadStatus } from '../../shared/load-status';

/** 每页条数候选。默认 6 条＝桌面三列 × 两行，手机上一列六段，首屏不会被一屏卡片压满。 */
export const CAR_PAGE_SIZE_OPTIONS = [6, 9, 12] as const;
export const DEFAULT_CAR_PAGE_SIZE = 6;

export function parsePage(value: unknown): number {
  const page = Number(value);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

export function parsePageSize(value: unknown): number {
  const size = Number(value);
  return (CAR_PAGE_SIZE_OPTIONS as readonly number[]).includes(size)
    ? size
    : DEFAULT_CAR_PAGE_SIZE;
}

/**
 * 前台车型列表状态（US-CAR-01）。
 *
 * 分页放在前端做：`GET /v1/cars` 按契约一次性返回全部已上架车型（见
 * docs/api/foundation-contracts.md），服务端没有公开列表的分页参数。
 * 上架车型的量级是「几十台」，一次性取回再切页反而让翻页没有网络等待；
 * 将来接口补上 page/pageSize 时，只需要把 load() 换成带参请求，组件不用动。
 */
export const useCarListStore = defineStore('carList', () => {
  const items = ref<CarSummary[]>([]);
  const status = ref<LoadStatus>('idle');
  const page = ref(1);
  const pageSize = ref<number>(DEFAULT_CAR_PAGE_SIZE);
  const errorMessage = ref('');

  const total = computed(() => items.value.length);
  const pageCount = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)));
  const pagedItems = computed(() => {
    const start = (page.value - 1) * pageSize.value;
    return items.value.slice(start, start + pageSize.value);
  });
  /** 「第 1–6 台，共 4 台」里的区间；空列表时返回 0–0，避免出现 1–0 这种读不通的区间。 */
  const rangeStart = computed(() =>
    total.value === 0 ? 0 : (page.value - 1) * pageSize.value + 1,
  );
  const rangeEnd = computed(() => Math.min(page.value * pageSize.value, total.value));

  async function load(): Promise<void> {
    status.value = 'loading';
    errorMessage.value = '';
    try {
      const response = await webApi.cars();
      // 服务端已强制只返回已上架车型（US-CAR-13）。这里再过滤一次是防御性兜底：
      // 一旦契约退化或中间层缓存了旧数据，也不能把下架车型的价格与图片渲染出去。
      items.value = response.data.filter(
        (car) => car.publishStatus === PublishStatus.PUBLISHED,
      );
      status.value = 'ready';
      clampPage();
    } catch {
      items.value = [];
      status.value = 'error';
      errorMessage.value = '车型列表加载失败，请检查网络后重试。';
    }
  }

  /** 数据量变小或换了每页条数后，把页码拉回合法范围，否则会停在一个空页上。 */
  function clampPage(): void {
    if (page.value > pageCount.value) page.value = pageCount.value;
    if (page.value < 1) page.value = 1;
  }

  function setPage(next: number): void {
    page.value = Math.min(Math.max(parsePage(next), 1), pageCount.value);
  }

  function setPageSize(next: number): void {
    pageSize.value = parsePageSize(next);
    // 换每页条数后回到第 1 页：停在原页码很容易落到一个已被切走的空页上
    page.value = 1;
  }

  /** 从 URL 查询参数恢复分页状态，刷新与分享链接后仍停在同一页。 */
  function applyQuery(query: { page?: unknown; pageSize?: unknown }): void {
    pageSize.value = parsePageSize(query.pageSize);
    page.value = parsePage(query.page);
  }

  return {
    items,
    status,
    page,
    pageSize,
    errorMessage,
    total,
    pageCount,
    pagedItems,
    rangeStart,
    rangeEnd,
    load,
    setPage,
    setPageSize,
    applyQuery,
  };
});
