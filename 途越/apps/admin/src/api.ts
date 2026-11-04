import type { ApiResponse } from '@tuyue/contracts';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? '/api';

export async function getHealth(): Promise<ApiResponse<{ status: 'ok' }>> {
  const response = await fetch(`${apiBaseUrl}/health`);
  if (!response.ok) throw new Error(`API request failed: ${response.status}`);
  return response.json() as Promise<ApiResponse<{ status: 'ok' }>>;
}
