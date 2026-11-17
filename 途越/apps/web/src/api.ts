import type { ApiResponse, CarCatalogQuery, CarDetail, CarSummary } from '@tuyue/contracts';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? '/api';

async function get<T>(path: string): Promise<ApiResponse<T>> {
  const response = await fetch(`${apiBaseUrl}${path}`);
  if (!response.ok) throw new Error(`API request failed: ${response.status}`);
  return response.json() as Promise<ApiResponse<T>>;
}

function carCatalogPath(query: CarCatalogQuery): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== '') search.set(key, String(value));
  }
  const queryString = search.toString();
  return `/v1/cars${queryString ? `?${queryString}` : ''}`;
}

export const webApi = {
  health: () => get<{ status: 'ok' }>('/health'),
  cars: (query: CarCatalogQuery = {}) => get<CarSummary[]>(carCatalogPath(query)),
  car: (id: string) => get<CarDetail>(`/v1/cars/${encodeURIComponent(id)}`),
};
