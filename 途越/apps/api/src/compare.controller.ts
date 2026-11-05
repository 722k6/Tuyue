import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import type {
  CompareAddRequest,
  CompareListResponse,
  CompareMatrixResponse,
} from '@tuyue/contracts';
import { compareService } from './compare-service.js';

@Controller('v1/compare')
export class CompareController {
  @Get()
  list(@Query('visitorId') visitorId?: string): CompareListResponse {
    return compareService.list(visitorId);
  }

  @Get('matrix')
  getMatrix(
    @Query('visitorId') visitorId?: string,
    @Query('ids') ids?: string | string[],
  ): CompareMatrixResponse {
    return compareService.matrix(visitorId, ids);
  }

  @Post('items')
  addItem(
    @Body() body: CompareAddRequest,
    @Query('visitorId') visitorId?: string,
  ): CompareListResponse {
    return compareService.add(visitorId, body?.carId);
  }

  @Delete('items/:carId')
  removeItem(
    @Param('carId') carId: string,
    @Query('visitorId') visitorId?: string,
  ): CompareListResponse {
    return compareService.remove(visitorId, carId);
  }

  @Delete()
  clear(@Query('visitorId') visitorId?: string): CompareListResponse {
    return compareService.clear(visitorId);
  }
}
