import type {
  AdminCarListItem,
  ApiError,
  ApiResponse,
  CarStatusAction,
  CarStatusAuditLog,
  CarStatusChangeResponse,
} from '@tuyue/contracts';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? '/api';

/** 带上业务错误码的异常：页面要区分「已是上架状态」和「网络挂了」。 */
export class CarStatusApiError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'CarStatusApiError';
  }
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    headers: { 'content-type': 'application/json' },
    ...init,
  });

  const body = (await response.json().catch(() => null)) as
    | ApiResponse<T>
    | ApiError
    | null;

  if (!response.ok || !body || !body.success) {
    const error = body && !body.success ? body.error : null;
    throw new CarStatusApiError(
      error?.code ?? 'NETWORK_ERROR',
      error?.message ?? `请求失败（HTTP ${response.status}）`,
    );
  }

  return body.data;
}

export function fetchAdminCars(): Promise<AdminCarListItem[]> {
  return requestJson<AdminCarListItem[]>('/v1/admin/cars');
}

export function changeCarStatus(
  carId: string,
  action: CarStatusAction,
  options: { actor?: string; reason?: string } = {},
): Promise<CarStatusChangeResponse> {
  const payload: Record<string, string> = { action };
  if (options.actor) payload.actor = options.actor;
  if (options.reason) payload.reason = options.reason;

  return requestJson<CarStatusChangeResponse>(
    `/v1/admin/cars/${encodeURIComponent(carId)}/status`,
    { method: 'POST', body: JSON.stringify(payload) },
  );
}

export function fetchCarStatusLogs(carId: string): Promise<CarStatusAuditLog[]> {
  return requestJson<CarStatusAuditLog[]>(
    `/v1/admin/cars/${encodeURIComponent(carId)}/audit-logs`,
  );
}
