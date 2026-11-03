import { describe, expect, it, vi } from 'vitest';
import { createEvent, setTrackTransport, track } from '../src/analytics/track';

describe('analytics track', () => {
  it('creates an event with ISO time and the given properties', () => {
    const event = createEvent('page_view', { page: 'dealers' });

    expect(event.name).toBe('page_view');
    expect(event.properties).toEqual({ page: 'dealers' });
    expect(new Date(event.occurredAt).toISOString()).toBe(event.occurredAt);
  });

  it('sends events through the configured transport', async () => {
    const send = vi.fn().mockResolvedValue(undefined);
    setTrackTransport({ send });

    await track('page_view', { page: 'home' });

    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0]?.[0]).toMatchObject({ name: 'page_view' });
  });

  it('never throws when the transport is offline', async () => {
    setTrackTransport({ send: vi.fn().mockRejectedValue(new Error('offline')) });

    await expect(track('page_view')).resolves.toBeUndefined();
  });
});
