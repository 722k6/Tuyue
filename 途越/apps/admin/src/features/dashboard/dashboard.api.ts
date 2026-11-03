import type { ApiResponse, DashboardMetrics } from '@tuyue/contracts';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api';

export async function fetchDashboard(): Promise<DashboardMetrics> {
  const response = await fetch(`${apiBaseUrl}/v1/analytics/dashboard`);
  if (!response.ok) throw new Error(`API request failed: ${response.status}`);
  const body = (await response.json()) as ApiResponse<DashboardMetrics>;
  return body.data;
}
