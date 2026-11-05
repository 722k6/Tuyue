import type { ActivityDto, ApiResponse } from '@tuyue/contracts';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? '/api';

export async function fetchActivities(): Promise<ActivityDto[]> {
  const response = await fetch(`${apiBaseUrl}/v1/activities`);
  if (!response.ok) throw new Error(`API request failed: ${response.status}`);
  const body = (await response.json()) as ApiResponse<ActivityDto[]>;
  return body.data;
}
