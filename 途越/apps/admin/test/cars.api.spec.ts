import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiRequestError, carsApi, resolveAssetUrl } from '../src/api';

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

afterEach(() => vi.unstubAllGlobals());

describe('admin cars API client', () => {
  it('builds list queries with keyword, status and paging', async () => {
    stubFetch({ success: true, data: { items: [], page: 1, pageSize: 10, total: 0 }, requestId: 'r' });
    await carsApi.list({ keyword: '星驰', status: 'published', page: 2, pageSize: 20 });

    const call = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0] as [string];
    const url = new URL(call[0]);
    expect(url.pathname).toBe('/api/v1/admin/cars');
    expect(url.searchParams.get('keyword')).toBe('星驰');
    expect(url.searchParams.get('page')).toBe('2');
    expect(url.searchParams.get('pageSize')).toBe('20');
  });

  it('sends draft input as JSON on create', async () => {
    stubFetch({ success: true, data: { id: 'car-1' }, requestId: 'r' });
    await carsApi.create({
      name: '途越星野',
      series: '星野系列',
      energyType: 'electric',
      tagline: '城市通勤的安静选择',
      description: '用于接口测试的车型描述。',
      priceMinCents: 19_990_000,
      priceMaxCents: 26_990_000,
      publishStatus: 'draft',
    });

    const [, init] = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      RequestInit,
    ];
    expect(init.method).toBe('POST');
    expect(JSON.parse(String(init.body))).toMatchObject({ name: '途越星野' });
  });

  it('maps field details from a failed request', async () => {
    stubFetch(
      {
        success: false,
        error: {
          code: 'CAR_VALIDATION_FAILED',
          message: '车型名称不能为空',
          details: [{ field: 'name', message: '车型名称不能为空' }],
        },
        requestId: 'r',
      },
      { ok: false, status: 400 },
    );

    await expect(carsApi.detail('car-1')).rejects.toMatchObject({
      code: 'CAR_VALIDATION_FAILED',
      status: 400,
      details: [{ field: 'name' }],
    });
    await expect(carsApi.detail('car-1')).rejects.toBeInstanceOf(ApiRequestError);
  });

  it('reports a friendly error when the API is unreachable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNREFUSED')));
    await expect(carsApi.list()).rejects.toMatchObject({ code: 'NETWORK_ERROR', status: 0 });
  });

  it('resolves stored image paths against the API origin', () => {
    expect(resolveAssetUrl('/static/uploads/a.webp')).toBe(
      'http://localhost:3000/static/uploads/a.webp',
    );
    expect(resolveAssetUrl('https://cdn.example.com/a.webp')).toBe(
      'https://cdn.example.com/a.webp',
    );
    expect(resolveAssetUrl('')).toBe('');
  });
});
