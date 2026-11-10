import { ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import {
  CarReviewAction,
  CarStatusAction,
  PublishStatus,
  type AdminCarListItem,
  type CarDetail,
  type CarReviewLog,
  type CarReviewResponse,
  type CarStatusAuditLog,
  type CarStatusChangeResponse,
  type CarSummary,
} from '@tuyue/contracts';
import { mockCars } from '@tuyue/test-utils';
import { randomUUID } from 'node:crypto';

export interface CarStatusChangeInput {
  carId: string;
  /** 运行时进来的可能是任意字符串，先在仓库里校验再收窄成枚举。 */
  action: string;
  actor?: string;
  reason?: string;
}

export interface CarReviewChangeInput {
  carId: string;
  /** 运行时可能是任意字符串，由仓库校验后再收窄。 */
  action: string;
  comment?: string;
  actor?: string;
}

const DEFAULT_ACTOR = 'system';

function toSummary(car: CarDetail): CarSummary {
  return {
    id: car.id,
    name: car.name,
    series: car.series,
    energyType: car.energyType,
    tagline: car.tagline,
    thumbnailUrl: car.thumbnailUrl,
    priceMinCents: car.priceMinCents,
    priceMaxCents: car.priceMaxCents,
    publishStatus: car.publishStatus,
  };
}

/**
 * 车型内存仓库（US-CAR-13）。
 *
 * 现状是 Mock 阶段，没有数据库，因此把「状态」和「操作留痕」放在进程内。
 * 之所以先立这一层，而不是继续让控制器直接读 `mockCars`：
 * 上下架必须是可写的，一旦写入数组常量，测试之间会互相污染；集中到一个仓库后
 * 就能在用例里 `reset()` 拿到干净起点，将来换成 TypeORM/Prisma 也只换实现。
 */
export class CarRepository {
  private cars = new Map<string, CarDetail>();
  private logs: CarStatusAuditLog[] = [];
  private reviewLogs: CarReviewLog[] = [];

  constructor(seed: readonly CarDetail[] = mockCars) {
    this.reset(seed);
  }

  reset(seed: readonly CarDetail[] = mockCars): void {
    this.cars = new Map(seed.map((car) => [car.id, structuredClone(car)]));
    this.logs = [];
    this.reviewLogs = [];
  }

  /**
   * 后台编辑写入后同步到本仓库，保证前台详情、对比和审核队列读到同一份数据。
   * Mock 阶段存在两套内存 Store，合并会牵动已有责任线，因此这里用最小写入桥接。
   */
  upsert(car: CarDetail): void {
    this.cars.set(car.id, structuredClone(car));
  }

  remove(carId: string): boolean {
    const removed = this.cars.delete(carId);
    if (removed) {
      this.logs = this.logs.filter((log) => log.carId !== carId);
      this.reviewLogs = this.reviewLogs.filter((log) => log.carId !== carId);
    }
    return removed;
  }

  /** 前台列表：强制只返回已上架车型（US-CAR-13 验收点）。 */
  listPublished(): CarSummary[] {
    return [...this.cars.values()]
      .filter((car) => car.publishStatus === PublishStatus.PUBLISHED)
      .map(toSummary);
  }

  /** 后台列表：包含草稿与已下线车型，附留痕条数。 */
  listAll(): AdminCarListItem[] {
    return [...this.cars.values()].map((car) => this.describe(car));
  }

  /** 前台详情：已下线等同于不存在，返回 404 让前台走占位页。 */
  findPublishedDetail(id: string): CarDetail {
    const car = this.cars.get(id);
    if (!car || car.publishStatus !== PublishStatus.PUBLISHED) {
      throw new NotFoundException({ code: 'CAR_NOT_FOUND', message: '车型不存在' });
    }
    return car;
  }

  /** 对比等内部场景：需要拿到车型但不确定是否已上架时用，由调用方决定如何处理。 */
  findAny(id: string): CarDetail | undefined {
    return this.cars.get(id);
  }

  describeById(id: string): AdminCarListItem {
    const car = this.cars.get(id);
    if (!car) throw new NotFoundException({ code: 'CAR_NOT_FOUND', message: '车型不存在' });
    return this.describe(car);
  }

  listAuditLogs(carId: string): CarStatusAuditLog[] {
    if (!this.cars.has(carId)) {
      throw new NotFoundException({ code: 'CAR_NOT_FOUND', message: '车型不存在' });
    }
    return this.logs.filter((log) => log.carId === carId);
  }

  /** 审核队列：只列出待审核车型，按最近更新时间倒序。 */
  listPendingReview(): AdminCarListItem[] {
    return [...this.cars.values()]
      .filter((car) => car.publishStatus === PublishStatus.PENDING_REVIEW)
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
      .map((car) => this.describe(car));
  }

  listReviewLogs(carId: string): CarReviewLog[] {
    if (!this.cars.has(carId)) {
      throw new NotFoundException({ code: 'CAR_NOT_FOUND', message: '车型不存在' });
    }
    return this.reviewLogs.filter((log) => log.carId === carId);
  }

  /**
   * 内容审核状态机（US-ADM-02）。
   *
   * 只负责「提交审核 / 通过 / 驳回」，不接管上下架：上架仍是 US-CAR-13 的动作。
   * 驳回必须带意见，避免编辑收到一个没有任何修改线索的「已打回」。
   */
  changeReviewStatus(input: CarReviewChangeInput): CarReviewResponse {
    if (!Object.values(CarReviewAction).includes(input.action as CarReviewAction)) {
      throw new BadRequestException({
        code: 'INVALID_REVIEW_ACTION',
        message: `不支持的审核操作：${input.action}`,
      });
    }
    const action = input.action as CarReviewAction;

    const car = this.cars.get(input.carId);
    if (!car) throw new NotFoundException({ code: 'CAR_NOT_FOUND', message: '车型不存在' });

    const fromStatus = car.publishStatus;
    const comment = input.comment?.trim() ?? '';
    const actor = input.actor?.trim() || DEFAULT_ACTOR;

    if (action === CarReviewAction.SUBMIT) {
      if (fromStatus === PublishStatus.PUBLISHED) {
        throw new ConflictException({
          code: 'CAR_ALREADY_PUBLISHED',
          message: '该车型已发布，无需再次提交审核',
        });
      }
      if (fromStatus === PublishStatus.PENDING_REVIEW) {
        throw new ConflictException({
          code: 'CAR_ALREADY_IN_REVIEW',
          message: '该车型已在待审核队列中',
        });
      }
    } else {
      if (fromStatus !== PublishStatus.PENDING_REVIEW) {
        throw new ConflictException({
          code: 'CAR_NOT_IN_REVIEW',
          message: '该车型当前不在待审核状态',
        });
      }
      if (action === CarReviewAction.REJECT && !comment) {
        throw new BadRequestException({
          code: 'REVIEW_COMMENT_REQUIRED',
          message: '驳回时必须填写审核意见',
        });
      }
    }

    const toStatus =
      action === CarReviewAction.SUBMIT
        ? PublishStatus.PENDING_REVIEW
        : action === CarReviewAction.APPROVE
          ? PublishStatus.PUBLISHED
          : PublishStatus.DRAFT;
    const occurredAt = new Date().toISOString();
    car.publishStatus = toStatus;
    car.updatedAt = occurredAt;

    const log: CarReviewLog = {
      id: `review-log-${randomUUID()}`,
      carId: car.id,
      carName: car.name,
      action,
      fromStatus,
      toStatus,
      actor,
      comment: comment || null,
      occurredAt,
    };
    this.reviewLogs.unshift(log);

    return { car: this.describe(car), log };
  }

  /**
   * 上架 / 下架。
   *
   * 状态机刻意保持窄口径：只有「已上架」才能下架，重复操作返回 409 而不是静默成功，
   * 这样前台看到的提示和后端真实状态永远一致，不会出现「以为下架了其实没下」。
   */
  changeStatus(input: CarStatusChangeInput): CarStatusChangeResponse {
    if (!Object.values(CarStatusAction).includes(input.action as CarStatusAction)) {
      throw new BadRequestException({
        code: 'INVALID_STATUS_ACTION',
        message: `不支持的状态操作：${input.action}`,
      });
    }
    const action = input.action as CarStatusAction;

    const car = this.cars.get(input.carId);
    if (!car) throw new NotFoundException({ code: 'CAR_NOT_FOUND', message: '车型不存在' });

    const fromStatus = car.publishStatus;
    if (action === CarStatusAction.PUBLISH && fromStatus === PublishStatus.PUBLISHED) {
      throw new ConflictException({
        code: 'CAR_ALREADY_PUBLISHED',
        message: '该车型已处于上架状态',
      });
    }
    if (action === CarStatusAction.OFFLINE && fromStatus !== PublishStatus.PUBLISHED) {
      throw new ConflictException({
        code: 'CAR_NOT_PUBLISHED',
        message: '该车型当前不在上架状态，无需下架',
      });
    }

    const toStatus =
      action === CarStatusAction.PUBLISH ? PublishStatus.PUBLISHED : PublishStatus.OFFLINE;
    const occurredAt = new Date().toISOString();
    const actor = input.actor?.trim() || DEFAULT_ACTOR;
    const reason = input.reason?.trim() || null;

    car.publishStatus = toStatus;
    car.updatedAt = occurredAt;

    const log: CarStatusAuditLog = {
      id: `status-log-${randomUUID()}`,
      carId: car.id,
      carName: car.name,
      action,
      fromStatus,
      toStatus,
      actor,
      reason,
      occurredAt,
    };
    this.logs.unshift(log);

    return { car: this.describe(car), log };
  }

  private describe(car: CarDetail): AdminCarListItem {
    return {
      ...toSummary(car),
      updatedAt: car.updatedAt,
      auditLogCount: this.logs.filter((log) => log.carId === car.id).length,
    };
  }
}

/** 应用内单例：控制器与对比模块共享同一份状态。 */
export const carRepository = new CarRepository();
