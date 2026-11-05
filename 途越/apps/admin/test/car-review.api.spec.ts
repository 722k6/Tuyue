// @vitest-environment jsdom
import { AdminRole, CarReviewAction } from '@tuyue/contracts';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { saveAdminSession } from '../src/features/admin-session';
import {
  CarReviewApiError,
  fetchPendingReviews,
  submitReview,
} from '../src/features/car-review/car-review.api';

function stubFetch(payload: unknown, init: { ok?: boolean; status?: number } = {}): void {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: init.ok ?? true,
      status: init.status ?? 200,
      json: async () => payload,
    }),
  );
}

beforeEach(() => {
  window.localStorage.clear();
  saveAdminSession(AdminRole.EDITOR, '唐轩');
});

afterEach(() => vi.unstubAllGlobals());

describe('car review API client（US-ADM-02）', () => {
  it('loads the pending queue with the temporary role headers', async () => {
    stubFetch({ success: true, data: [], requestId: 'r' });
    await fetchPendingReviews();

    const [url, init] = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      RequestInit,
    ];
    expect(url).toBe('/api/v1/admin/cars/review/pending');
    expect(init.headers).toMatchObject({
      'x-admin-role': 'editor',
      'x-admin-user': encodeURIComponent('唐轩'),
    });
  });

  it('sends review action and trimmed comment', async () => {
    stubFetch({ success: true, data: {}, requestId: 'r' });
    await submitReview('ty-suv-001', CarReviewAction.REJECT, '  缺少续航参数  ');

    const [url, init] = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      RequestInit,
    ];
    expect(url).toBe('/api/v1/admin/cars/ty-suv-001/review');
    expect(init.method).toBe('POST');
    expect(JSON.parse(String(init.body))).toEqual({
      action: CarReviewAction.REJECT,
      comment: '缺少续航参数',
    });
  });

  it('maps business errors to CarReviewApiError', async () => {
    stubFetch(
      {
        success: false,
        error: { code: 'FORBIDDEN_ROLE', message: '当前角色无权执行该操作' },
        requestId: 'r',
      },
      { ok: false, status: 403 },
    );

    await expect(
      submitReview('ty-suv-001', CarReviewAction.APPROVE),
    ).rejects.toMatchObject({
      code: 'FORBIDDEN_ROLE',
      status: 403,
      message: '当前角色无权执行该操作',
    });
    await expect(
      submitReview('ty-suv-001', CarReviewAction.APPROVE),
    ).rejects.toBeInstanceOf(CarReviewApiError);
  });
});
