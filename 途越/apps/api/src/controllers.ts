import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
} from '@nestjs/common';
import { AdminRole, type AuthResponse, type DashboardMetrics, type MockLoginRequest } from '@tuyue/contracts';
import {
  findMockAdmin,
  mockActivities,
  mockCars,
  mockDashboardMetrics,
  mockDealers,
} from '@tuyue/test-utils';

@Controller('health')
export class HealthController {
  @Get()
  getHealth(): { status: 'ok' } {
    return { status: 'ok' };
  }
}

@Controller('v1/cars')
export class CarsController {
  @Get()
  listCars() {
    return mockCars;
  }

  @Get(':id')
  getCar(@Param('id') id: string) {
    const car = mockCars.find((item) => item.id === id);
    if (!car) throw new NotFoundException({ code: 'CAR_NOT_FOUND', message: '车型不存在' });
    return car;
  }
}

@Controller('v1/auth')
export class AuthController {
  @Post('mock-login')
  mockLogin(@Body() input: MockLoginRequest): AuthResponse {
    const role = input.role ?? AdminRole.EDITOR;
    if (!Object.values(AdminRole).includes(role)) {
      throw new BadRequestException({ code: 'INVALID_ROLE', message: '无效的管理员角色' });
    }
    const user = { ...findMockAdmin(role), username: input.username || `mock_${role}` };
    return {
      accessToken: `mock-token-${role}`,
      user,
      expiresAt: '2026-10-28T00:00:00.000Z',
    };
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
