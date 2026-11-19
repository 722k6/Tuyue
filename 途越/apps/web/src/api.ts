import type { ApiResponse, CarDetail, CarSummary } from '@tuyue/contracts';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? '/api';

/**
 * 带上 HTTP 状态码的请求错误。
 *
 * 前台需要区分「车型不存在 / 已下架」（404，走占位页）和「接口挂了」（5xx / 网络错误，走重试），
 * 只留一句 message 的话页面没法判断该渲染哪一种。保留 `status` 是最小代价的做法，
 * 将来的 API Client 换成 OpenAPI 生成器时这里可以整体替换。
 */
export class ApiRequestError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

async function get<T>(path: string): Promise<ApiResponse<T>> {
  const response = await fetch(`${apiBaseUrl}${path}`);
  if (!response.ok) {
    throw new ApiRequestError(response.status, `API request failed: ${response.status}`);
  }
  return response.json() as Promise<ApiResponse<T>>;
}

export const webApi = {
  health: () => get<{ status: 'ok' }>('/health'),
  cars: () => get<CarSummary[]>('/v1/cars'),
  car: (id: string) => get<CarDetail>(`/v1/cars/${encodeURIComponent(id)}`),
};
