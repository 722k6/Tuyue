import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApplication } from '../src/app.js';
import { carRepository } from '../src/car-repository.js';
import { compareService } from '../src/compare-service.js';

const VISITOR = 'visitor-test-001';

describe('US-CMP-01 加入对比与对比栏', () => {
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

  it('缺少 visitorId 时拒绝请求，避免所有访客共用一份对比单', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/compare').expect(400);
    expect(response.body.error.code).toBe('VISITOR_ID_REQUIRED');
  });

  it('加入对比后返回车型摘要，对比栏可直接渲染', async () => {
    const response = await request(app.getHttpServer())
      .post(`/api/v1/compare/items?visitorId=${VISITOR}`)
      .send({ carId: 'ty-ev-001' })
      .expect(201);

    expect(response.body.data.maxSize).toBe(4);
    expect(response.body.data.items).toHaveLength(1);
    expect(response.body.data.items[0]).toMatchObject({
      carId: 'ty-ev-001',
      car: { name: '途越星驰' },
    });
  });

  it('重复加入同一台车返回 409', async () => {
    await request(app.getHttpServer())
      .post(`/api/v1/compare/items?visitorId=${VISITOR}`)
      .send({ carId: 'ty-ev-001' })
      .expect(201);

    const response = await request(app.getHttpServer())
      .post(`/api/v1/compare/items?visitorId=${VISITOR}`)
      .send({ carId: 'ty-ev-001' })
      .expect(409);
    expect(response.body.error.code).toBe('CAR_ALREADY_IN_COMPARE');
  });

  it('已下架车型不能加入对比', async () => {
    const response = await request(app.getHttpServer())
      .post(`/api/v1/compare/items?visitorId=${VISITOR}`)
      .send({ carId: 'ty-legacy-001' })
      .expect(409);
    expect(response.body.error.code).toBe('CAR_NOT_PUBLISHED');
  });

  it('未上架车型出现在对比单里会被自动剔除', async () => {
    await request(app.getHttpServer())
      .post(`/api/v1/compare/items?visitorId=${VISITOR}`)
      .send({ carId: 'ty-suv-001' })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/v1/admin/cars/ty-suv-001/status')
      .send({ action: 'offline', reason: '测试联动' })
      .expect(201);

    const list = await request(app.getHttpServer())
      .get(`/api/v1/compare?visitorId=${VISITOR}`)
      .expect(200);
    expect(list.body.data.items).toEqual([]);
  });

  it('最多 4 台，第 5 台返回 409 并说明上限', async () => {
    const publishedIds = ['ty-suv-001', 'ty-ev-001', 'ty-hybrid-001', 'ty-mpv-001'];
    for (const carId of publishedIds) {
      await request(app.getHttpServer())
        .post(`/api/v1/compare/items?visitorId=${VISITOR}`)
        .send({ carId })
        .expect(201);
    }

    // 再上架一台，凑够 5 台可对比车型，才能真正触发上限
    await request(app.getHttpServer())
      .post('/api/v1/admin/cars/ty-legacy-001/status')
      .send({ action: 'publish' })
      .expect(201);

    const response = await request(app.getHttpServer())
      .post(`/api/v1/compare/items?visitorId=${VISITOR}`)
      .send({ carId: 'ty-legacy-001' })
      .expect(409);
    expect(response.body.error.code).toBe('COMPARE_LIMIT_EXCEEDED');
    expect(response.body.error.message).toContain('4');
  });

  it('移除对比项，未加入过的车型返回 404', async () => {
    await request(app.getHttpServer())
      .post(`/api/v1/compare/items?visitorId=${VISITOR}`)
      .send({ carId: 'ty-ev-001' })
      .expect(201);

    const removed = await request(app.getHttpServer())
      .delete(`/api/v1/compare/items/ty-ev-001?visitorId=${VISITOR}`)
      .expect(200);
    expect(removed.body.data.items).toEqual([]);

    const missing = await request(app.getHttpServer())
      .delete(`/api/v1/compare/items/ty-ev-001?visitorId=${VISITOR}`)
      .expect(404);
    expect(missing.body.error.code).toBe('CAR_NOT_IN_COMPARE');
  });

  it('不同访客的对比清单互相隔离', async () => {
    await request(app.getHttpServer())
      .post(`/api/v1/compare/items?visitorId=${VISITOR}`)
      .send({ carId: 'ty-ev-001' })
      .expect(201);

    const other = await request(app.getHttpServer())
      .get('/api/v1/compare?visitorId=visitor-other')
      .expect(200);
    expect(other.body.data.items).toEqual([]);
  });
});

describe('US-CMP-02 对比表对齐渲染', () => {
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

  function rowOf(groups: Array<{ group: string; rows: Array<Record<string, unknown>> }>, code: string) {
    for (const group of groups) {
      const matched = group.rows.find((row) => row.code === code);
      if (matched) return { group: group.group, row: matched };
    }
    throw new Error(`参数 ${code} 未出现在对比矩阵中`);
  }

  it('取参数并集：只有一台车有的参数也会成行', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/compare/matrix?ids=ty-suv-001,ty-ev-001')
      .expect(200);

    const body = response.body.data;
    expect(body.carIds).toEqual(['ty-suv-001', 'ty-ev-001']);

    // range 只有纯电车型有，engine 只有燃油车型有 —— 并集后两行都要在
    const range = rowOf(body.groups, 'range');
    const engine = rowOf(body.groups, 'engine');
    expect(range.row.valuesByCarId).toEqual({ 'ty-suv-001': null, 'ty-ev-001': '620' });
    expect(engine.row.valuesByCarId).toEqual({
      'ty-suv-001': '2.0T 涡轮增压',
      'ty-ev-001': null,
    });
  });

  it('缺失值一律是 null，不用 0 或空串占位', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/compare/matrix?ids=ty-suv-001,ty-ev-001')
      .expect(200);

    const body = response.body.data;
    const range = rowOf(body.groups, 'range');
    expect(range.row.valuesByCarId['ty-suv-001']).toBeNull();
    expect(body.missingCells).toBeGreaterThan(0);
  });

  it('按固定分组顺序输出，分组内保留参数顺序', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/compare/matrix?ids=ty-suv-001,ty-ev-001,ty-hybrid-001')
      .expect(200);

    const groups = response.body.data.groups as Array<{ group: string; label: string }>;
    expect(groups.map((group) => group.group)).toEqual(['power', 'size', 'safety', 'smart']);
    expect(groups.map((group) => group.label)).toEqual(['动力', '尺寸', '安全', '智能']);
  });

  it('差异行被标记，便于前端高亮', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/compare/matrix?ids=ty-suv-001,ty-ev-001')
      .expect(200);

    const body = response.body.data;
    const power = rowOf(body.groups, 'power');
    expect(power.row.different).toBe(true);
    expect(body.differentRows).toBeGreaterThan(0);
    expect(body.differentRows).toBeLessThanOrEqual(body.totalRows);
  });

  it('四台车对比仍然对齐，每一行都能对上每一列', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/compare/matrix?ids=ty-suv-001,ty-ev-001,ty-hybrid-001,ty-mpv-001')
      .expect(200);

    const body = response.body.data;
    expect(body.columns).toHaveLength(4);
    for (const group of body.groups) {
      for (const row of group.rows) {
        expect(Object.keys(row.valuesByCarId).sort()).toEqual([...body.carIds].sort());
      }
    }
  });

  it('超过 4 台、空清单、含已下架车型分别报错', async () => {
    const tooMany = await request(app.getHttpServer())
      .get('/api/v1/compare/matrix?ids=ty-suv-001,ty-ev-001,ty-hybrid-001,ty-mpv-001,ty-legacy-001')
      .expect(400);
    expect(tooMany.body.error.code).toBe('COMPARE_LIMIT_EXCEEDED');

    const empty = await request(app.getHttpServer())
      .get(`/api/v1/compare/matrix?visitorId=${VISITOR}`)
      .expect(400);
    expect(empty.body.error.code).toBe('COMPARE_EMPTY');

    const offline = await request(app.getHttpServer())
      .get('/api/v1/compare/matrix?ids=ty-legacy-001')
      .expect(404);
    expect(offline.body.error.code).toBe('CAR_NOT_FOUND');
  });
});
