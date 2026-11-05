import { Body, Controller, Get, Headers, Inject, Param, Post } from '@nestjs/common';
import {
  CarReviewAction,
  type AdminCarListItem,
  type CarReviewLog,
  type CarReviewRequest,
  type CarReviewResponse,
} from '@tuyue/contracts';
import { assertAdminPermission } from './admin-access.js';
import { carRepository } from './car-repository.js';
import { CarStore } from './cars/car-store.js';

/** 前端把中文用户名编码后放进请求头，这里还原。 */
function decodeHeaderUser(value?: string): string | undefined {
  const text = value?.trim();
  if (!text) return undefined;
  try {
    return decodeURIComponent(text).trim() || undefined;
  } catch {
    return text;
  }
}

/**
 * 内容审核发布（US-ADM-02）。
 *
 * 审核队列和留痕读 `carRepository`，审核结果回写 `CarStore`，
 * 保证后台编辑页、审核页和前台看到的是同一个发布状态。
 */
@Controller('v1/admin/cars')
export class CarReviewController {
  constructor(@Inject(CarStore) private readonly store: CarStore) {}

  @Get('review/pending')
  listPending(): AdminCarListItem[] {
    return carRepository.listPendingReview();
  }

  @Get(':id/review-logs')
  listReviewLogs(@Param('id') id: string): CarReviewLog[] {
    return carRepository.listReviewLogs(id);
  }

  @Post(':id/review')
  review(
    @Param('id') id: string,
    @Body() body: CarReviewRequest,
    @Headers('x-admin-role') role?: string,
    @Headers('x-admin-user') username?: string,
  ): CarReviewResponse {
    const action = String(body?.action ?? '');
    assertAdminPermission(
      role,
      action === CarReviewAction.SUBMIT ? 'content:edit' : 'content:review',
    );

    const actor = body?.actor?.trim() || decodeHeaderUser(username);
    const result = carRepository.changeReviewStatus({
      carId: id,
      action,
      ...(body?.comment === undefined ? {} : { comment: body.comment }),
      ...(actor ? { actor } : {}),
    });
    this.store.patchStatus(id, result.car.publishStatus);
    return result;
  }
}
