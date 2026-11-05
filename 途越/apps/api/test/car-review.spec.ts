import type { INestApplication } from '@nestjs/common';
import { CarReviewAction, PublishStatus } from '@tuyue/contracts';
import { mockCars } from '@tuyue/test-utils';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApplication } from '../src/app.js';
import { carRepository } from '../src/car-repository.js';
import { CarStore } from '../src/cars/car-store.js';

function review(
  app: INestApplication,
  carId: string,
  body: Record<string, unknown>,
  role = 'editor',
  user = '唐轩',
) {
  return request(app.getHttpServer())
    .post(`/api/v1/admin/cars/${carId}/review`)
    .set('x-admin-role', role)
    .set('x-admin-user', encodeURIComponent(user))
    .send(body);
}

describe('content review API（US-ADM-02）', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createApplication();
    await app.init();
  });

  beforeEach(() => {
    app.get(CarStore).reset();
    carRepository.reset(mockCars);
  });

  afterAll(async () => app.close());

  it('editor submits an offline car into the pending queue', async () => {
    const response = await review(app, 'ty-legacy-001', {
      action: CarReviewAction.SUBMIT,
    }).expect(201);

    expect(response.body.data.car.publishStatus).toBe(PublishStatus.PENDING_REVIEW);
    expect(response.body.data.log).toMatchObject({
      action: CarReviewAction.SUBMIT,
      fromStatus: PublishStatus.OFFLINE,
      toStatus: PublishStatus.PENDING_REVIEW,
      actor: '唐轩',
    });

    const queue = await request(app.getHttpServer())
      .get('/api/v1/admin/cars/review/pending')
      .expect(200);
    expect(queue.body.data.map((car: { id: string }) => car.id)).toEqual(['ty-legacy-001']);

    expect(app.get(CarStore).find('ty-legacy-001')?.publishStatus).toBe(
      PublishStatus.PENDING_REVIEW,
    );
  });

  it('rejects duplicate submissions and published cars', async () => {
    await review(app, 'ty-legacy-001', { action: CarReviewAction.SUBMIT }).expect(201);

    const duplicate = await review(app, 'ty-legacy-001', {
      action: CarReviewAction.SUBMIT,
    }).expect(409);
    expect(duplicate.body.error.code).toBe('CAR_ALREADY_IN_REVIEW');

    const published = await review(app, 'ty-suv-001', {
      action: CarReviewAction.SUBMIT,
    }).expect(409);
    expect(published.body.error.code).toBe('CAR_ALREADY_PUBLISHED');
  });

  it('reviewer approves a pending car and publishes it to the public list', async () => {
    await review(app, 'ty-legacy-001', { action: CarReviewAction.SUBMIT }).expect(201);

    const approved = await review(
      app,
      'ty-legacy-001',
      { action: CarReviewAction.APPROVE, comment: '参数与配置核对无误' },
      'reviewer',
      '审核员',
    ).expect(201);

    expect(approved.body.data.car.publishStatus).toBe(PublishStatus.PUBLISHED);
    expect(approved.body.data.log.actor).toBe('审核员');

    const publicList = await request(app.getHttpServer()).get('/api/v1/cars').expect(200);
    expect(
      publicList.body.data.some((car: { id: string }) => car.id === 'ty-legacy-001'),
    ).toBe(true);
    expect(app.get(CarStore).find('ty-legacy-001')?.publishStatus).toBe(
      PublishStatus.PUBLISHED,
    );
  });

  it('rejects without a comment', async () => {
    await review(app, 'ty-legacy-001', { action: CarReviewAction.SUBMIT }).expect(201);

    const response = await review(
      app,
      'ty-legacy-001',
      { action: CarReviewAction.REJECT },
      'reviewer',
    ).expect(400);

    expect(response.body.error.code).toBe('REVIEW_COMMENT_REQUIRED');
  });

  it('reject sends the car back to draft and keeps the comment', async () => {
    await review(app, 'ty-legacy-001', { action: CarReviewAction.SUBMIT }).expect(201);

    const rejected = await review(
      app,
      'ty-legacy-001',
      { action: CarReviewAction.REJECT, comment: '缺少续航参数' },
      'reviewer',
    ).expect(201);

    expect(rejected.body.data.car.publishStatus).toBe(PublishStatus.DRAFT);
    expect(rejected.body.data.log.comment).toBe('缺少续航参数');

    const logs = await request(app.getHttpServer())
      .get('/api/v1/admin/cars/ty-legacy-001/review-logs')
      .expect(200);
    expect(logs.body.data.map((log: { action: string }) => log.action)).toEqual([
      CarReviewAction.REJECT,
      CarReviewAction.SUBMIT,
    ]);
  });

  it('enforces the reviewer permission and requires a role header', async () => {
    await review(app, 'ty-legacy-001', { action: CarReviewAction.SUBMIT }).expect(201);

    const forbidden = await review(
      app,
      'ty-legacy-001',
      { action: CarReviewAction.APPROVE },
      'editor',
    ).expect(403);
    expect(forbidden.body.error.code).toBe('FORBIDDEN_ROLE');

    const missing = await request(app.getHttpServer())
      .post('/api/v1/admin/cars/ty-legacy-001/review')
      .send({ action: CarReviewAction.APPROVE })
      .expect(400);
    expect(missing.body.error.code).toBe('ROLE_REQUIRED');
  });

  it('rejects approval when the car is not pending', async () => {
    const response = await review(
      app,
      'ty-suv-001',
      { action: CarReviewAction.APPROVE },
      'reviewer',
    ).expect(409);
    expect(response.body.error.code).toBe('CAR_NOT_IN_REVIEW');
  });

  it('404s for unknown cars in queue actions and logs', async () => {
    const missingReview = await review(app, 'not-found', {
      action: CarReviewAction.SUBMIT,
    }).expect(404);
    expect(missingReview.body.error.code).toBe('CAR_NOT_FOUND');

    const missingLogs = await request(app.getHttpServer())
      .get('/api/v1/admin/cars/not-found/review-logs')
      .expect(404);
    expect(missingLogs.body.error.code).toBe('CAR_NOT_FOUND');
  });

  it('blocks editors from publishing through the car form, but allows editing published cars', async () => {
    const createPublished = await request(app.getHttpServer())
      .post('/api/v1/admin/cars')
      .set('x-admin-role', 'editor')
      .send({
        name: '途越越界',
        series: '越界系列',
        energyType: 'electric',
        tagline: '用于验证编辑不能直接发布',
        description: '用于验证编辑角色不能通过车型表单直接发布的描述。',
        priceMinCents: 19_990_000,
        priceMaxCents: 26_990_000,
        publishStatus: 'published',
      })
      .expect(403);
    expect(createPublished.body.error.code).toBe('FORBIDDEN_ROLE');

    const publishedCar = await request(app.getHttpServer())
      .get('/api/v1/admin/cars/ty-suv-001')
      .expect(200);
    const keepPublished = await request(app.getHttpServer())
      .put('/api/v1/admin/cars/ty-suv-001')
      .set('x-admin-role', 'editor')
      .send({
        name: '途越远行',
        series: publishedCar.body.data.series,
        energyType: publishedCar.body.data.energyType,
        tagline: publishedCar.body.data.tagline,
        description: publishedCar.body.data.description,
        priceMinCents: publishedCar.body.data.priceMinCents,
        priceMaxCents: publishedCar.body.data.priceMaxCents,
        publishStatus: 'published',
      })
      .expect(200);
    expect(keepPublished.body.data.publishStatus).toBe(PublishStatus.PUBLISHED);
  });
});
