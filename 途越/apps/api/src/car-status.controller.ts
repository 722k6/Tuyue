import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import type {
  AdminCarListItem,
  CarStatusAuditLog,
  CarStatusChangeRequest,
  CarStatusChangeResponse,
} from '@tuyue/contracts';
import { carRepository } from './car-repository.js';

/**
 * 车型上下架（US-CAR-13）。
 *
 * 放在 `/v1/admin/cars` 而不是复用 `/v1/cars`，是为了把「后台可见全部状态」和
 * 「前台只可见已上架」彻底分开：共用一个路径迟早会出现后台漏传筛选参数、
 * 导致下架车型泄到官网的事故。
 */
@Controller('v1/admin/cars')
export class AdminCarsController {
  @Get()
  listCars(): AdminCarListItem[] {
    return carRepository.listAll();
  }

  @Get(':id/audit-logs')
  listAuditLogs(@Param('id') id: string): CarStatusAuditLog[] {
    return carRepository.listAuditLogs(id);
  }

  @Post(':id/status')
  changeStatus(
    @Param('id') id: string,
    @Body() body: CarStatusChangeRequest,
  ): CarStatusChangeResponse {
    return carRepository.changeStatus({
      carId: id,
      action: String(body?.action ?? ''),
      ...(body?.actor ? { actor: body.actor } : {}),
      ...(body?.reason ? { reason: body.reason } : {}),
    });
  }
}
