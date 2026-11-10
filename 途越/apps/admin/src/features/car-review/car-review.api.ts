import type {
  AdminCarListItem,
  ApiError,
  ApiResponse,
  CarReviewAction,
  CarReviewLog,
  CarReviewResponse,
} from '@tuyue/contracts';
import { getAdminRole, getAdminUserHeader } from '../admin-session';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? '/api';

export class CarReviewApiError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'CarReviewApiError';
  }
}

/** 临时角色头：US-SYS-01 接入 Token 后删除。 */
function sessionHeaders(): Record<string, string> {
  const role = getAdminRole();
  if (!role) return {};
  return { 'x-admin-role': role, 'x-admin-user': getAdminUserHeader() };
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...sessionHeaders(),
      ...(init?.headers as Record<string, string> | undefined),
    },
  });

  const body = (await response.json().catch(() => null)) as ApiResponse<T> | ApiError | null;
  if (!response.ok || !body || body.success !== true) {
    const error = body && body.success === false ? body.error : null;
    throw new CarReviewApiError(
      error?.code ?? 'NETWORK_ERROR',
      error?.message ?? `请求失败（HTTP ${response.status}）`,
      response.status,
    );
  }
  return body.data;
}

export function fetchPendingReviews(): Promise<AdminCarListItem[]> {
  return requestJson<AdminCarListItem[]>('/v1/admin/cars/review/pending');
}

export function fetchReviewLogs(carId: string): Promise<CarReviewLog[]> {
  return requestJson<CarReviewLog[]>(
    `/v1/admin/cars/${encodeURIComponent(carId)}/review-logs`,
  );
}

export function submitReview(
  carId: string,
  action: CarReviewAction,
  comment?: string,
): Promise<CarReviewResponse> {
  const payload: Record<string, string> = { action };
  if (comment?.trim()) payload.comment = comment.trim();
  return requestJson<CarReviewResponse>(
    `/v1/admin/cars/${encodeURIComponent(carId)}/review`,
    { method: 'POST', body: JSON.stringify(payload) },
  );
}
