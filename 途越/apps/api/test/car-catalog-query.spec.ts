import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApplication } from '../src/app.js';
import { carRepository } from '../src/car-repository.js';

describe('US-CAR-03 / US-SRC-01 public car catalog query', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createApplication();
    await app.init();
  });
  beforeEach(() => carRepository.reset());
  afterAll(async () => app.close());

  it('combines energy, body style and overlapping price range filters', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/cars')
      .query({
        energyType: 'electric',
        bodyStyle: 'sedan',
        minPriceCents: 20_000_000,
        maxPriceCents: 25_000_000,
      })
      .expect(200);

    expect(response.body.data.map((car: { id: string }) => car.id)).toEqual(['ty-ev-001']);
  });

  it('sorts by price or popularity with documented default directions', async () => {
    const byPrice = await request(app.getHttpServer())
      .get('/api/v1/cars')
      .query({ sortBy: 'price', sortDirection: 'desc' })
      .expect(200);
    expect(byPrice.body.data.map((car: { id: string }) => car.id)).toEqual([
      'ty-mpv-001',
      'ty-hybrid-001',
      'ty-ev-001',
      'ty-suv-001',
    ]);

    const byPopularity = await request(app.getHttpServer())
      .get('/api/v1/cars')
      .query({ sortBy: 'popularity' })
      .expect(200);
    expect(byPopularity.body.data.map((car: { id: string }) => car.id)).toEqual([
      'ty-suv-001',
      'ty-hybrid-001',
      'ty-ev-001',
      'ty-mpv-001',
    ]);
  });

  it.each([
    ['车型名称', '星驰', 'ty-ev-001'],
    ['车型别名（大小写不敏感）', 'mpv', 'ty-mpv-001'],
    ['参数名称', 'CLTC 续航', 'ty-ev-001'],
    ['参数值', '620', 'ty-ev-001'],
  ])('searches by %s using substring matching', async (_label, keyword, expectedId) => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/cars')
      .query({ keyword })
      .expect(200);
    expect(response.body.data.map((car: { id: string }) => car.id)).toEqual([expectedId]);
  });

  it('returns a successful empty list when no keyword matches', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/cars')
      .query({ keyword: '不存在的车型' })
      .expect(200);
    expect(response.body.data).toEqual([]);
  });

  it('rejects invalid values with the unified query error', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/cars')
      .query({ minPriceCents: 30_000_000, maxPriceCents: 20_000_000 })
      .expect(400);
    expect(response.body).toEqual({
      success: false,
      error: {
        code: 'INVALID_CAR_QUERY',
        message: 'minPriceCents 不能大于 maxPriceCents',
      },
      requestId: expect.any(String),
    });
  });

  it.each([
    [{ energyType: 'diesel' }, 'energyType 可选值为 gasoline, hybrid, electric'],
    [{ keyword: '关'.repeat(81) }, 'keyword 最长 80 个字符'],
  ])('rejects invalid query input %j', async (query, message) => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/cars')
      .query(query)
      .expect(400);
    expect(response.body.error).toEqual({ code: 'INVALID_CAR_QUERY', message });
  });

  it('publishes all catalog query parameters in OpenAPI', async () => {
    const response = await request(app.getHttpServer()).get('/api/openapi.json').expect(200);
    const names = response.body.paths['/api/v1/cars'].get.parameters.map(
      (parameter: { name: string }) => parameter.name,
    );
    expect(names).toEqual(
      expect.arrayContaining([
        'keyword',
        'energyType',
        'bodyStyle',
        'minPriceCents',
        'maxPriceCents',
        'sortBy',
        'sortDirection',
      ]),
    );
  });
});
