import type { CarDetail } from '@tuyue/contracts';
import { defineStore } from 'pinia';
import { ref } from 'vue';
import { ApiRequestError, webApi } from '../../api';

/**
 * 详情页状态。
 *
 * 比列表多一个 `notFound`：车型不存在和已下架在接口层是同一个 404（CAR_NOT_FOUND），
 * 对访客来说也没必要区分——两者都该看到「去看看别的车」的占位页，而不是一个报错。
 * 但「接口挂了」是另一回事，得给重试按钮，所以两种失败必须分开。
 */
export type CarDetailStatus = 'idle' | 'loading' | 'ready' | 'notFound' | 'error';

export const useCarDetailStore = defineStore('carDetail', () => {
  const car = ref<CarDetail>();
  const status = ref<CarDetailStatus>('idle');
  const errorMessage = ref('');
  /** 连续切换车型时，旧请求可能后回来；用序号丢弃过期响应，避免详情串台。 */
  let requestSeq = 0;

  async function load(id: string): Promise<void> {
    requestSeq += 1;
    const seq = requestSeq;

    status.value = 'loading';
    errorMessage.value = '';
    car.value = undefined;

    try {
      const response = await webApi.car(id);
      if (seq !== requestSeq) return;
      car.value = response.data;
      status.value = 'ready';
    } catch (error) {
      if (seq !== requestSeq) return;
      car.value = undefined;
      if (error instanceof ApiRequestError && error.status === 404) {
        status.value = 'notFound';
        errorMessage.value = '该车型不存在，或已停止在官网展示。';
        return;
      }
      status.value = 'error';
      errorMessage.value = '车型详情加载失败，请稍后重试。';
    }
  }

  return { car, status, errorMessage, load };
});
