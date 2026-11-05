import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApplication } from '../src/app.js';
import { carRepository } from '../src/car-repository.js';
import { compareService } from '../src/compare-service.js';

describe('US-CAR-13 车型上下架', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createApplication();
    await app.init();
  });

  afterAll(async () => app.close());

  beforeEach(() => {
    carRepository.reset();
    compareService.reset();
  });

  it('前台列表强制只返回已上架车型', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/cars').expect(200);
    const ids = response.body.data.map((car: { id: string }) => car.id);
    expect(ids).toEqual(['ty-suv-001', 'ty-ev-001', 'ty-hybrid-001', 'ty-mpv-001']);
    expect(ids).not.toContain('ty-legacy-001');
  });

  it('已下架车型的前台详情返回 404，前台可走占位页', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/cars/ty-legacy-001')
      .expect(404);
    expect(response.body.error).toEqual({ code: 'CAR_NOT_FOUND', message: '车型不存在' });
  });

  it('后台列表包含已下线车型并带留痕条数', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/admin/cars').expect(200);
    const legacy = response.body.data.find((car: { id: string }) => car.id === 'ty-legacy-001');
    expect(legacy.publishStatus).toBe('offline');
    expect(legacy.auditLogCount).toBe(0);
  });

  it('上架后前台立刻可见，并留下一条操作记录', async () => {
    const changed = await request(app.getHttpServer())
      .post('/api/v1/admin/cars/ty-legacy-001/status')
      .send({ action: 'publish', actor: '周子涵' })
      .expect(201);

    expect(changed.body.data.car.publishStatus).toBe('published');
    expect(changed.body.data.log).toMatchObject({
      carId: 'ty-legacy-001',
      action: 'publish',
      fromStatus: 'offline',
      toStatus: 'published',
      actor: '周子涵',
      reason: null,
    });

    const list = await request(app.getHttpServer()).get('/api/v1/cars').expect(200);
    expect(list.body.data.map((car: { id: string }) => car.id)).toContain('ty-legacy-001');

    await request(app.getHttpServer()).get('/api/v1/cars/ty-legacy-001').expect(200);
  });

  it('下架必须记录原因，且下架后前台不可见', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/admin/cars/ty-suv-001/status')
      .send({ action: 'offline', actor: '周子涵', reason: '改款停产' })
      .expect(201);

    const logs = await request(app.getHttpServer())
      .get('/api/v1/admin/cars/ty-suv-001/audit-logs')
      .expect(200);
    expect(logs.body.data).toHaveLength(1);
    expect(logs.body.data[0]).toMatchObject({
      action: 'offline',
      fromStatus: 'published',
      toStatus: 'offline',
      reason: '改款停产',
    });

    const list = await request(app.getHttpServer()).get('/api/v1/cars').expect(200);
    expect(list.body.data.map((car: { id: string }) => car.id)).not.toContain('ty-suv-001');
    await request(app.getHttpServer()).get('/api/v1/cars/ty-suv-001').expect(404);
  });

  it('重复上架返回 409，而不是静默成功', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/admin/cars/ty-suv-001/status')
      .send({ action: 'publish' })
      .expect(409);
    expect(response.body.error.code).toBe('CAR_ALREADY_PUBLISHED');
  });

  it('对未上架车型执行下架返回 409', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/admin/cars/ty-legacy-001/status')
      .send({ action: 'offline' })
      .expect(409);
    expect(response.body.error.code).toBe('CAR_NOT_PUBLISHED');
  });

  it('非法动作与不存在的车型分别返回 400 / 404', async () => {
    const invalid = await request(app.getHttpServer())
      .post('/api/v1/admin/cars/ty-suv-001/status')
      .send({ action: 'delete' })
      .expect(400);
    expect(invalid.body.error.code).toBe('INVALID_STATUS_ACTION');

    await request(app.getHttpServer())
      .post('/api/v1/admin/cars/unknown-car/status')
      .send({ action: 'publish' })
      .expect(404);
  });

  it('留痕按时间倒序返回，先上架后下架能还原完整轨迹', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/admin/cars/ty-legacy-001/status')
      .send({ action: 'publish', actor: '周子涵' })
      .expect(201);
    await request(app.getHttpServer())
      .post('/api/v1/admin/cars/ty-legacy-001/status')
      .send({ action: 'offline', actor: '汤毅威', reason: '库存清理' })
      .expect(201);

    const logs = await request(app.getHttpServer())
      .get('/api/v1/admin/cars/ty-legacy-001/audit-logs')
      .expect(200);
    expect(logs.body.data.map((log: { action: string }) => log.action)).toEqual([
      'offline',
      'publish',
    ]);

    const list = await request(app.getHttpServer()).get('/api/v1/admin/cars').expect(200);
    const legacy = list.body.data.find((car: { id: string }) => car.id === 'ty-legacy-001');
    expect(legacy.auditLogCount).toBe(2);
  });
});
