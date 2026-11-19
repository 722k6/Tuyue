import type { INestApplication } from '@nestjs/common';
import { CarReviewAction, PublishStatus } from '@tuyue/contracts';
import { mockCars } from '@tuyue/test-utils';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApplication } from '../src/app.js';
import { carRepository } from '../src/car-repository.js';
import { CarStore } from '../src/cars/car-store.js';
import { adminApi, loginToken, type AdminAccountKey } from './support/auth.js';

describe('content review API（US-ADM-02）', () => {
  let app: INestApplication;
  let token: string;
  const tokens: Record<AdminAccountKey, string> = { editor: '', reviewer: '', superAdmin: '' };

  function review(
    carId: string,
    body: Record<string, unknown>,
    account: AdminAccountKey = 'editor',
  ) {
    return adminApi(app, tokens[account]).post(`/api/v1/admin/cars/${carId}/review`).send(body);
  }

  beforeAll(async () => {
    app = await createApplication();
    await app.init();
    tokens.editor = await loginToken(app, 'editor');
    tokens.reviewer = await loginToken(app, 'reviewer');
    tokens.superAdmin = await loginToken(app, 'superAdmin');
    token = tokens.superAdmin;
  });

  beforeEach(() => {
    app.get(CarStore).reset();
    carRepository.reset(mockCars);
  });

  afterAll(async () => app.close());

  it('editor submits an offline car into the pending queue', async () => {
    const response = await review('ty-legacy-001', {
      action: CarReviewAction.SUBMIT,
    }).expect(201);

    expect(response.body.data.car.publishStatus).toBe(PublishStatus.PENDING_REVIEW);
    expect(response.body.data.log).toMatchObject({
      action: CarReviewAction.SUBMIT,
      fromStatus: PublishStatus.OFFLINE,
      toStatus: PublishStatus.PENDING_REVIEW,
      actor: 'editor',
    });

    const queue = await adminApi(app, token)
      .get('/api/v1/admin/cars/review/pending')
      .expect(200);
    expect(queue.body.data.map((car: { id: string }) => car.id)).toEqual(['ty-legacy-001']);

    expect(app.get(CarStore).find('ty-legacy-001')?.publishStatus).toBe(
      PublishStatus.PENDING_REVIEW,
    );
  });

  it('rejects duplicate submissions and published cars', async () => {
    await review('ty-legacy-001', { action: CarReviewAction.SUBMIT }).expect(201);

    const duplicate = await review('ty-legacy-001', {
      action: CarReviewAction.SUBMIT,
    }).expect(409);
    expect(duplicate.body.error.code).toBe('CAR_ALREADY_IN_REVIEW');

    const published = await review('ty-suv-001', {
      action: CarReviewAction.SUBMIT,
    }).expect(409);
    expect(published.body.error.code).toBe('CAR_ALREADY_PUBLISHED');
  });

  it('reviewer approves a pending car and publishes it to the public list', async () => {
    await review('ty-legacy-001', { action: CarReviewAction.SUBMIT }).expect(201);

    const approved = await review(
      'ty-legacy-001',
      { action: CarReviewAction.APPROVE, comment: '参数与配置核对无误' },
      'reviewer',
    ).expect(201);

    expect(approved.body.data.car.publishStatus).toBe(PublishStatus.PUBLISHED);
    expect(approved.body.data.log.actor).toBe('reviewer');

    const publicList = await request(app.getHttpServer()).get('/api/v1/cars').expect(200);
    expect(
      publicList.body.data.some((car: { id: string }) => car.id === 'ty-legacy-001'),
    ).toBe(true);
    expect(app.get(CarStore).find('ty-legacy-001')?.publishStatus).toBe(
      PublishStatus.PUBLISHED,
    );
  });

  it('rejects without a comment', async () => {
    await review('ty-legacy-001', { action: CarReviewAction.SUBMIT }).expect(201);

    const response = await review(
      'ty-legacy-001',
      { action: CarReviewAction.REJECT },
      'reviewer',
    ).expect(400);

    expect(response.body.error.code).toBe('REVIEW_COMMENT_REQUIRED');
  });

  it('reject sends the car back to draft and keeps the comment', async () => {
    await review('ty-legacy-001', { action: CarReviewAction.SUBMIT }).expect(201);

    const rejected = await review(
      'ty-legacy-001',
      { action: CarReviewAction.REJECT, comment: '缺少续航参数' },
      'reviewer',
    ).expect(201);

    expect(rejected.body.data.car.publishStatus).toBe(PublishStatus.DRAFT);
    expect(rejected.body.data.log.comment).toBe('缺少续航参数');

    const logs = await adminApi(app, token)
      .get('/api/v1/admin/cars/ty-legacy-001/review-logs')
      .expect(200);
    expect(logs.body.data.map((log: { action: string }) => log.action)).toEqual([
      CarReviewAction.REJECT,
      CarReviewAction.SUBMIT,
    ]);
  });

  it('enforces the reviewer permission and requires login', async () => {
    await review('ty-legacy-001', { action: CarReviewAction.SUBMIT }).expect(201);

    const forbidden = await review(
      'ty-legacy-001',
      { action: CarReviewAction.APPROVE },
      'editor',
    ).expect(403);
    expect(forbidden.body.error.code).toBe('FORBIDDEN_ROLE');

    const missing = await request(app.getHttpServer())
      .post('/api/v1/admin/cars/ty-legacy-001/review')
      .send({ action: CarReviewAction.APPROVE })
      .expect(401);
    expect(missing.body.error.code).toBe('AUTH_TOKEN_REQUIRED');
  });

  it('rejects approval when the car is not pending', async () => {
    const response = await review(
      'ty-suv-001',
      { action: CarReviewAction.APPROVE },
      'reviewer',
    ).expect(409);
    expect(response.body.error.code).toBe('CAR_NOT_IN_REVIEW');
  });

  it('404s for unknown cars in queue actions and logs', async () => {
    const missingReview = await review('not-found', {
      action: CarReviewAction.SUBMIT,
    }).expect(404);
    expect(missingReview.body.error.code).toBe('CAR_NOT_FOUND');

    const missingLogs = await adminApi(app, token)
      .get('/api/v1/admin/cars/not-found/review-logs')
      .expect(404);
    expect(missingLogs.body.error.code).toBe('CAR_NOT_FOUND');
  });

  it('blocks editors from publishing through the car form, but allows editing published cars', async () => {
    const editorToken = await loginToken(app, 'editor');
    const createPublished = await adminApi(app, editorToken)
      .post('/api/v1/admin/cars')
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

    const publishedCar = await adminApi(app, token)
      .get('/api/v1/admin/cars/ty-suv-001')
      .expect(200);
    const keepPublished = await adminApi(app, editorToken)
      .put('/api/v1/admin/cars/ty-suv-001')
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