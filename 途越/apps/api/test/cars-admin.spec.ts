import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApplication } from '../src/app.js';
import { CarStore } from '../src/cars/car-store.js';

const validDraft = {
  name: '途越星野',
  series: '星野系列',
  energyType: 'electric',
  tagline: '城市通勤的安静选择',
  description: '用于接口测试的车型描述，长度满足校验要求。',
  priceMinCents: 19_990_000,
  priceMaxCents: 26_990_000,
  publishStatus: 'draft',
};

describe('admin car CRUD API', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createApplication();
    await app.init();
  });

  beforeEach(() => {
    app.get(CarStore).reset();
  });

  afterAll(async () => app.close());

  it('lists cars with pagination metadata', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/admin/cars?page=1&pageSize=2')
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.total).toBe(3);
    expect(response.body.data.items).toHaveLength(2);
    expect(response.body.data.pageSize).toBe(2);
  });

  it('filters by keyword and publish status', async () => {
    const keyword = await request(app.getHttpServer())
      .get('/api/v1/admin/cars?keyword=星驰')
      .expect(200);
    expect(keyword.body.data.items.map((car: { id: string }) => car.id)).toEqual(['ty-ev-001']);

    const status = await request(app.getHttpServer())
      .get('/api/v1/admin/cars?status=draft')
      .expect(200);
    expect(status.body.data.total).toBe(0);
  });

  it('creates a car and returns the stored detail', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/admin/cars')
      .send(validDraft)
      .expect(201);

    expect(response.body.data).toMatchObject({
      name: '途越星野',
      priceMinCents: 19_990_000,
      images: [],
      galleryUrls: [],
    });
    expect(response.body.data.id).toEqual(expect.any(String));
  });

  it('rejects an invalid draft with field details', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/admin/cars')
      .send({ ...validDraft, name: '', priceMinCents: 30_000_000, priceMaxCents: 1 })
      .expect(400);

    expect(response.body.error.code).toBe('CAR_VALIDATION_FAILED');
    expect(response.body.error.details.map((item: { field: string }) => item.field)).toEqual([
      'name',
      'priceMaxCents',
    ]);
  });

  it('updates an existing car and 404s for an unknown id', async () => {
    const updated = await request(app.getHttpServer())
      .put('/api/v1/admin/cars/ty-suv-001')
      .send({ ...validDraft, name: '途越远行 2027', publishStatus: 'published' })
      .expect(200);
    expect(updated.body.data.name).toBe('途越远行 2027');
    expect(updated.body.data.publishStatus).toBe('published');

    const missing = await request(app.getHttpServer())
      .put('/api/v1/admin/cars/not-found')
      .send(validDraft)
      .expect(404);
    expect(missing.body.error.code).toBe('CAR_NOT_FOUND');
  });

  it('deletes a car and removes it from the list', async () => {
    await request(app.getHttpServer()).delete('/api/v1/admin/cars/ty-hybrid-001').expect(200);
    const response = await request(app.getHttpServer())
      .get('/api/v1/admin/cars/ty-hybrid-001')
      .expect(404);
    expect(response.body.error.code).toBe('CAR_NOT_FOUND');
  });
});

describe('admin car image API', () => {
  let app: INestApplication;
  const pngBuffer = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64',
  );

  beforeAll(async () => {
    app = await createApplication();
    await app.init();
  });

  beforeEach(() => {
    app.get(CarStore).reset();
  });

  afterAll(async () => app.close());

  it('uploads multiple images and marks the first one as cover', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/admin/cars/ty-suv-001/images')
      .attach('files', pngBuffer, { filename: 'front.png', contentType: 'image/png' })
      .attach('files', pngBuffer, { filename: 'side.png', contentType: 'image/png' })
      .expect(201);

    const images = response.body.data as Array<{ url: string; isCover: boolean }>;
    expect(images).toHaveLength(4);
    expect(images.filter((image) => image.isCover)).toHaveLength(1);
    expect(images[0]?.isCover).toBe(true);
    expect(images[2]?.isCover).toBe(false);
    expect(images[3]?.url.startsWith('/static/uploads/')).toBe(true);
  });

  it('rejects unsupported file types', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/admin/cars/ty-suv-001/images')
      .attach('files', Buffer.from('not an image'), {
        filename: 'note.txt',
        contentType: 'text/plain',
      })
      .expect(400);
    expect(response.body.error.code).toBe('CAR_IMAGE_TYPE_UNSUPPORTED');
  });

  it('reorders images, moves the cover and deletes removed ones', async () => {
    const uploaded = await request(app.getHttpServer())
      .post('/api/v1/admin/cars/ty-suv-001/images')
      .attach('files', pngBuffer, { filename: 'rear.png', contentType: 'image/png' })
      .expect(201);
    const images = uploaded.body.data as Array<{ id: string; url: string; isCover: boolean }>;
    const [first, second, third] = images;
    if (!first || !second || !third) throw new Error('缺少上传结果');

    const saved = await request(app.getHttpServer())
      .put('/api/v1/admin/cars/ty-suv-001/images')
      .send({
        images: [
          { id: third.id, url: third.url, isCover: true },
          { id: first.id, url: first.url, isCover: false },
        ],
      })
      .expect(200);

    const next = saved.body.data as Array<{ id: string; isCover: boolean }>;
    expect(next.map((image) => image.id)).toEqual([third.id, first.id]);
    expect(next[0]?.isCover).toBe(true);

    const detail = await request(app.getHttpServer())
      .get('/api/v1/admin/cars/ty-suv-001')
      .expect(200);
    expect(detail.body.data.thumbnailUrl).toBe(third.url);
    expect(detail.body.data.galleryUrls).toHaveLength(2);
  });

  it('rejects more than the allowed number of images', async () => {
    const response = await request(app.getHttpServer())
      .put('/api/v1/admin/cars/ty-suv-001/images')
      .send({
        images: Array.from({ length: 10 }, (_, index) => ({
          url: `/static/uploads/${index}.webp`,
          isCover: index === 0,
        })),
      })
      .expect(400);
    expect(response.body.error.code).toBe('CAR_IMAGE_LIMIT_EXCEEDED');
  });

  it('deletes a single image by id', async () => {
    const detail = await request(app.getHttpServer())
      .get('/api/v1/admin/cars/ty-suv-001')
      .expect(200);
    const target = detail.body.data.images[0] as { id: string };

    const response = await request(app.getHttpServer())
      .delete(`/api/v1/admin/cars/ty-suv-001/images/${target.id}`)
      .expect(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].isCover).toBe(true);
  });
});
