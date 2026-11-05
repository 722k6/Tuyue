import type {
  ApiError,
  ApiResponse,
  AuthResponse,
  CarDetail,
  CarDraftInput,
  CarImage,
  CarImageInput,
  CarSummary,
  LoginRequest,
  PaginatedResponse,
} from '@tuyue/contracts';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? '/api';

export class ApiRequestError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status: number,
    readonly details: unknown = null,
  ) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl}${path}`, init);
  } catch {
    throw new ApiRequestError('NETWORK_ERROR', '无法连接接口服务，请确认 API 已启动', 0);
  }
  const payload = (await response.json().catch(() => null)) as ApiResponse<T> | ApiError | null;
  if (!response.ok || !payload || payload.success !== true) {
    const error = payload && payload.success === false ? payload.error : null;
    throw new ApiRequestError(
      error?.code ?? 'REQUEST_FAILED',
      error?.message ?? `请求失败（${response.status}）`,
      response.status,
      error?.details ?? null,
    );
  }
  return payload.data;
}

export function resolveAssetUrl(path: string): string {
  if (!path) return '';
  if (/^https?:\/\//.test(path)) return path;
  return `${apiBaseUrl.replace(/\/api\/?$/, '')}${path}`;
}

export interface CarListParams {
  keyword?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}

function toQuery(params: CarListParams): string {
  const search = new URLSearchParams();
  if (params.keyword) search.set('keyword', params.keyword);
  if (params.status) search.set('status', params.status);
  search.set('page', String(params.page ?? 1));
  search.set('pageSize', String(params.pageSize ?? 10));
  return search.toString();
}

export const carsApi = {
  list(params: CarListParams = {}): Promise<PaginatedResponse<CarSummary>> {
    return request(`/v1/admin/cars/search?${toQuery(params)}`);
  },
  detail(id: string): Promise<CarDetail> {
    return request(`/v1/admin/cars/${encodeURIComponent(id)}`);
  },
  create(input: CarDraftInput): Promise<CarDetail> {
    return request('/v1/admin/cars', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(input),
    });
  },
  update(id: string, input: CarDraftInput): Promise<CarDetail> {
    return request(`/v1/admin/cars/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(input),
    });
  },
  remove(id: string): Promise<{ id: string }> {
    return request(`/v1/admin/cars/${encodeURIComponent(id)}`, { method: 'DELETE' });
  },
  uploadImages(id: string, files: File[]): Promise<CarImage[]> {
    const body = new FormData();
    for (const file of files) body.append('files', file);
    return request(`/v1/admin/cars/${encodeURIComponent(id)}/images`, { method: 'POST', body });
  },
  saveImages(id: string, images: CarImageInput[]): Promise<CarImage[]> {
    return request(`/v1/admin/cars/${encodeURIComponent(id)}/images`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ images }),
    });
  },
  removeImage(id: string, imageId: string): Promise<CarImage[]> {
    return request(
      `/v1/admin/cars/${encodeURIComponent(id)}/images/${encodeURIComponent(imageId)}`,
      { method: 'DELETE' },
    );
  },
};

export function login(input: LoginRequest): Promise<AuthResponse> {
  return request('/v1/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  });
}

export async function getHealth(): Promise<ApiResponse<{ status: 'ok' }>> {
  const response = await fetch(`${apiBaseUrl}/health`);
  if (!response.ok) throw new Error(`API request failed: ${response.status}`);
  return response.json() as Promise<ApiResponse<{ status: 'ok' }>>;
}
