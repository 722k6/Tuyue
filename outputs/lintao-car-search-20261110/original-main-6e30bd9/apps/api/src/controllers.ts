import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
} from '@nestjs/common';
import type { DashboardMetrics } from '@tuyue/contracts';
import { mockActivities, mockDashboardMetrics, mockDealers } from '@tuyue/test-utils';
import { carRepository } from './car-repository.js';

@Controller('health')
export class HealthController {
  @Get()
  getHealth(): { status: 'ok' } {
    return { status: 'ok' };
  }
}

@Controller('v1/cars')
export class CarsController {
  /**
   * 前台列表：只返回已上架车型（US-CAR-13「前台查询强制过滤已上架」）。
   * 过滤放在服务端而不是前端 v-if，否则下架车型的图片和价格仍会随响应体发到浏览器。
   */
  @Get()
  listCars() {
    return carRepository.listPublished();
  }

  @Get(':id')
  getCar(@Param('id') id: string) {
    return carRepository.findPublishedDetail(id);
  }
}

@Controller('v1/activities')
export class ActivitiesController {
  @Get()
  listActivities() {
    return mockActivities;
  }
}

@Controller('v1/dealers')
export class DealersController {
  @Get()
  listDealers() {
    return mockDealers;
  }
}

interface TrackEventInput {
  name?: string;
  properties?: Record<string, string | number | boolean | null>;
}

@Controller('v1/analytics')
export class AnalyticsController {
  @Get('dashboard')
  getDashboard(): DashboardMetrics {
    return mockDashboardMetrics;
  }

  @Post('events')
  ingest(@Body() input: TrackEventInput): { accepted: true } {
    if (!input?.name) {
      throw new BadRequestException({ code: 'INVALID_EVENT', message: '事件名不能为空' });
    }
    return { accepted: true };
  }
}
