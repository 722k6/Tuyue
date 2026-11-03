import type { ApiResponse, DealerDto } from '@tuyue/contracts';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api';

export async function fetchDealers(): Promise<DealerDto[]> {
  const response = await fetch(`${apiBaseUrl}/v1/dealers`);
  if (!response.ok) throw new Error(`API request failed: ${response.status}`);
  const body = (await response.json()) as ApiResponse<DealerDto[]>;
  return body.data;
}
