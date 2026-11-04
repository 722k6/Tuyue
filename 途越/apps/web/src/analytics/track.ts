import type { AnalyticsEvent } from '@tuyue/contracts';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? '/api';

export type TrackProperties = AnalyticsEvent['properties'];

export interface TrackTransport {
  send(event: AnalyticsEvent): Promise<void>;
}

const httpTransport: TrackTransport = {
  async send(event) {
    const response = await fetch(`${apiBaseUrl}/v1/analytics/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: event.name, properties: event.properties }),
    });
    if (!response.ok) throw new Error(`Track request failed: ${response.status}`);
  },
};

let transport: TrackTransport = httpTransport;

export function setTrackTransport(next: TrackTransport): void {
  transport = next;
}

export function createEvent(name: string, properties: TrackProperties = {}): AnalyticsEvent {
  return {
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    name,
    occurredAt: new Date().toISOString(),
    properties,
  };
}

export const TrackEventName = {
  PAGE_VIEW: 'page_view',
  CAR_VIEW: 'car_view',
  COMPARE_ADD: 'compare_add',
  AI_MESSAGE: 'ai_message',
  ACTIVITY_IMPRESSION: 'activity_impression',
} as const;
export type TrackEventName = (typeof TrackEventName)[keyof typeof TrackEventName];

export async function track(name: string, properties: TrackProperties = {}): Promise<void> {
  try {
    await transport.send(createEvent(name, properties));
  } catch {
    // 埋点失败不阻塞主流程，由质量门禁在 E2E 阶段发现丢失
  }
}
