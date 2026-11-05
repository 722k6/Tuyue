import type { INestApplication } from '@nestjs/common';
import { CarParameterGroup } from '@tuyue/contracts';
import { mockCars } from '@tuyue/test-utils';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApplication } from '../src/app.js';
import { carRepository } from '../src/car-repository.js';
import { CarStore } from '../src/cars/car-store.js';

const parameters = [
  {
    code: 'power',
    label: '最大功率',
    value: '185',
    unit: 'kW',
    group: CarParameterGroup.POWER,
  },
  {
    code: 'battery',
    label: '电池容量',
    value: '78.5',
    unit: 'kWh',
    group: CarParameterGroup.POWER,
  },
];

describe('admin car parameters API', () => {
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

  it('overwrites parameters and returns the updated detail', async () => {
    const response = await request(app.getHttpServer())
      .put('/api/v1/admin/cars/ty-suv-001/parameters')
      .send({ parameters })
      .expect(200);

    expect(response.body.data.parameters).toEqual(parameters);
    expect(response.body.data.updatedAt).toEqual(expect.any(String));
  });

  it('syncs saved parameters to the repository used by the public site', async () => {
    await request(app.getHttpServer())
      .put('/api/v1/admin/cars/ty-suv-001/parameters')
      .send({ parameters })
      .expect(200);

    expect(carRepository.findAny('ty-suv-001')?.parameters).toEqual(parameters);
  });

  it('fills the other group when the client omits it', async () => {
    const response = await request(app.getHttpServer())
      .put('/api/v1/admin/cars/ty-suv-001/parameters')
      .send({ parameters: [{ code: 'warranty', label: '质保', value: '5 年' }] })
      .expect(200);

    expect(response.body.data.parameters).toEqual([
      { code: 'warranty', label: '质保', value: '5 年', group: CarParameterGroup.OTHER },
    ]);
  });

  it('rejects duplicate codes with field-level details', async () => {
    const response = await request(app.getHttpServer())
      .put('/api/v1/admin/cars/ty-suv-001/parameters')
      .send({
        parameters: [
          { code: 'power', label: '最大功率', value: '185' },
          { code: 'POWER', label: '最大功率', value: '200' },
        ],
      })
      .expect(400);

    expect(response.body.error.code).toBe('CAR_PARAMETER_INVALID');
    expect(response.body.error.details).toEqual([
      { field: 'parameters[1].code', message: '参数代码与第 1 条重复' },
    ]);
  });

  it('rejects a malformed payload', async () => {
    const response = await request(app.getHttpServer())
      .put('/api/v1/admin/cars/ty-suv-001/parameters')
      .send({})
      .expect(400);

    expect(response.body.error.code).toBe('CAR_PARAMETER_INVALID');
    expect(response.body.error.details[0]?.field).toBe('parameters');
  });

  it('404s for an unknown car', async () => {
    const response = await request(app.getHttpServer())
      .put('/api/v1/admin/cars/not-found/parameters')
      .send({ parameters })
      .expect(404);

    expect(response.body.error.code).toBe('CAR_NOT_FOUND');
  });
});
