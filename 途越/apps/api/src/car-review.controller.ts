import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Post,
} from '@nestjs/common';
import {
  CarReviewAction,
  type AdminCarListItem,
  type CarReviewLog,
  type CarReviewRequest,
  type CarReviewResponse,
} from '@tuyue/contracts';
import { assertAdminPermission, assertAnyAdminPermission } from './admin-access.js';
import type { AdminPrincipal } from './auth/admin-auth.guard.js';
import { CurrentAdmin } from './auth/current-admin.js';
import { carRepository } from './car-repository.js';
import { CarStore } from './cars/car-store.js';

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
  listPending(@CurrentAdmin() admin: AdminPrincipal): AdminCarListItem[] {
    // BUG-ADM02-01：待审队列含后台未发布内容，必须要求审核权限，不能只靠前端路由守卫。
    assertAdminPermission(admin.role, 'content:review');
    return carRepository.listPendingReview();
  }

  @Get(':id/review-logs')
  listReviewLogs(
    @Param('id') id: string,
    @CurrentAdmin() admin: AdminPrincipal,
  ): CarReviewLog[] {
    // BUG-ADM02-01：留痕含驳回意见全文，必须登录且具备编辑或审核权限。
    // 放开 content:edit 是给编辑看驳回原因（BUG-ADM02-04），未登录仍由全局守卫拦成 401。
    assertAnyAdminPermission(admin.role, ['content:edit', 'content:review']);
    return carRepository.listReviewLogs(id);
  }

  @Post(':id/review')
  review(
    @Param('id') id: string,
    @Body() body: CarReviewRequest,
    @CurrentAdmin() admin: AdminPrincipal,
  ): CarReviewResponse {
    const action = String(body?.action ?? '');
    // BUG-ADM02-03：先判定动作本身是否合法，再判角色权限，
    // 否则 editor 发送非法动作会被误报成 403 FORBIDDEN_ROLE。
    if (!Object.values(CarReviewAction).includes(action as CarReviewAction)) {
      throw new BadRequestException({
        code: 'INVALID_REVIEW_ACTION',
        message: `不支持的审核操作：${action}`,
      });
    }
    assertAdminPermission(
      admin.role,
      action === CarReviewAction.SUBMIT ? 'content:edit' : 'content:review',
    );

    // BUG-ADM02-02：操作人一律取服务端登录态，忽略请求体里的 actor，杜绝留痕伪造。
    const actor = admin.username;
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
