import { afterEach, describe, expect, it, vi } from 'vitest';
import { webApi } from '../src/api';

describe('car catalog web API', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('serializes filter, sort and keyword conditions into the public endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: [], requestId: 'req-catalog' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await webApi.cars({
      keyword: '家用 MPV',
      energyType: 'hybrid',
      bodyStyle: 'mpv',
      minPriceCents: 20_000_000,
      maxPriceCents: 35_000_000,
      sortBy: 'popularity',
      sortDirection: 'desc',
    });

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/cars?keyword=%E5%AE%B6%E7%94%A8+MPV&energyType=hybrid&bodyStyle=mpv&minPriceCents=20000000&maxPriceCents=35000000&sortBy=popularity&sortDirection=desc',
    );
  });
});
