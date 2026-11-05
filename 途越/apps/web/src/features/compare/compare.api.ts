import type {
  ApiError,
  ApiResponse,
  CompareListResponse,
  CompareMatrixResponse,
} from '@tuyue/contracts';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? '/api';

export class CompareApiError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'CompareApiError';
  }
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    headers: { 'content-type': 'application/json' },
    ...init,
  });

  const body = (await response.json().catch(() => null)) as ApiResponse<T> | ApiError | null;

  if (!response.ok || !body || !body.success) {
    const error = body && !body.success ? body.error : null;
    throw new CompareApiError(
      error?.code ?? 'NETWORK_ERROR',
      error?.message ?? `请求失败（HTTP ${response.status}）`,
    );
  }

  return body.data;
}

export function fetchCompare(visitorId: string): Promise<CompareListResponse> {
  return requestJson<CompareListResponse>(
    `/v1/compare?visitorId=${encodeURIComponent(visitorId)}`,
  );
}

export function addCompareItem(visitorId: string, carId: string): Promise<CompareListResponse> {
  return requestJson<CompareListResponse>(
    `/v1/compare/items?visitorId=${encodeURIComponent(visitorId)}`,
    { method: 'POST', body: JSON.stringify({ carId }) },
  );
}

export function removeCompareItem(
  visitorId: string,
  carId: string,
): Promise<CompareListResponse> {
  return requestJson<CompareListResponse>(
    `/v1/compare/items/${encodeURIComponent(carId)}?visitorId=${encodeURIComponent(visitorId)}`,
    { method: 'DELETE' },
  );
}

export function clearCompare(visitorId: string): Promise<CompareListResponse> {
  return requestJson<CompareListResponse>(
    `/v1/compare?visitorId=${encodeURIComponent(visitorId)}`,
    { method: 'DELETE' },
  );
}

export function fetchCompareMatrix(
  carIds: string[],
  visitorId: string,
): Promise<CompareMatrixResponse> {
  const params = new URLSearchParams({ ids: carIds.join(','), visitorId });
  return requestJson<CompareMatrixResponse>(`/v1/compare/matrix?${params.toString()}`);
}
