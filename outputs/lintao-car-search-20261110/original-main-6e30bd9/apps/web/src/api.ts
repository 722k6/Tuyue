import type { ApiResponse, CarDetail, CarSummary } from '@tuyue/contracts';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? '/api';

async function get<T>(path: string): Promise<ApiResponse<T>> {
  const response = await fetch(`${apiBaseUrl}${path}`);
  if (!response.ok) throw new Error(`API request failed: ${response.status}`);
  return response.json() as Promise<ApiResponse<T>>;
}

export const webApi = {
  health: () => get<{ status: 'ok' }>('/health'),
  cars: () => get<CarSummary[]>('/v1/cars'),
  car: (id: string) => get<CarDetail>(`/v1/cars/${encodeURIComponent(id)}`),
};
