import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import {
  COMPARE_MAX_SIZE,
  PublishStatus,
  type CarSummary,
  type CompareListResponse,
  type CompareMatrixResponse,
  type CompareSelectionItem,
} from '@tuyue/contracts';
import { carRepository, type CarRepository } from './car-repository.js';
import { buildCompareMatrix } from './compare-matrix.js';

interface CompareEntry {
  carId: string;
  addedAt: string;
}

function toSummaryItems(
  entries: readonly CompareEntry[],
  repository: CarRepository,
): CompareSelectionItem[] {
  const items: CompareSelectionItem[] = [];
  for (const entry of entries) {
    const car = repository.findAny(entry.carId);
    // 已下线/已删除的车型不该继续躺在对比栏里，读的时候顺手剔除，前端无需自己判断。
    if (!car || car.publishStatus !== PublishStatus.PUBLISHED) continue;
    const summary: CarSummary = {
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
    items.push({ carId: entry.carId, addedAt: entry.addedAt, car: summary });
  }
  return items;
}

/**
 * 对比清单服务（US-CMP-01 服务端一半）。
 *
 * 前端用 localStorage 做本地副本，保证刷新/断网时对比栏不空；服务端这份是跨设备的
 * 准权威数据，两者按 carId 合并。用 visitorId（匿名访客标识）而不是登录态，
 * 因为访客侧浏览与对比不需要登录（见任务书「访客侧公开浏览，不需要登录」）。
 */
export class CompareService {
  private selections = new Map<string, CompareEntry[]>();

  constructor(private readonly repository: CarRepository = carRepository) {}

  reset(): void {
    this.selections.clear();
  }

  list(visitorId?: string): CompareListResponse {
    const id = this.requireVisitor(visitorId);
    const entries = this.selections.get(id) ?? [];
    const items = toSummaryItems(entries, this.repository);
    return { visitorId: id, maxSize: COMPARE_MAX_SIZE, items };
  }

  add(visitorId: string | undefined, carId: string | undefined): CompareListResponse {
    const id = this.requireVisitor(visitorId);
    if (!carId?.trim()) {
      throw new BadRequestException({ code: 'CAR_ID_REQUIRED', message: '缺少车型 ID' });
    }
    const car = this.repository.findAny(carId);
    if (!car) throw new NotFoundException({ code: 'CAR_NOT_FOUND', message: '车型不存在' });
    if (car.publishStatus !== PublishStatus.PUBLISHED) {
      throw new ConflictException({
        code: 'CAR_NOT_PUBLISHED',
        message: '该车型已下架，无法加入对比',
      });
    }

    const entries = this.selections.get(id) ?? [];
    if (entries.some((entry) => entry.carId === carId)) {
      throw new ConflictException({
        code: 'CAR_ALREADY_IN_COMPARE',
        message: '该车型已在对比清单中',
      });
    }
    if (entries.length >= COMPARE_MAX_SIZE) {
      throw new ConflictException({
        code: 'COMPARE_LIMIT_EXCEEDED',
        message: `最多只能同时对比 ${COMPARE_MAX_SIZE} 款车型`,
      });
    }

    entries.push({ carId, addedAt: new Date().toISOString() });
    this.selections.set(id, entries);
    return this.list(id);
  }

  remove(visitorId: string | undefined, carId: string): CompareListResponse {
    const id = this.requireVisitor(visitorId);
    const entries = this.selections.get(id) ?? [];
    const remaining = entries.filter((entry) => entry.carId !== carId);
    if (remaining.length === entries.length) {
      throw new NotFoundException({
        code: 'CAR_NOT_IN_COMPARE',
        message: '该车型不在对比清单中',
      });
    }
    if (remaining.length > 0) this.selections.set(id, remaining);
    else this.selections.delete(id);
    return this.list(id);
  }

  clear(visitorId?: string): CompareListResponse {
    const id = this.requireVisitor(visitorId);
    this.selections.delete(id);
    return this.list(id);
  }

  /**
   * 对比矩阵。`ids` 优先（前端本地清单可能还没同步完成），否则回落到服务端清单。
   */
  matrix(visitorId?: string, rawIds?: string | string[]): CompareMatrixResponse {
    const fromQuery = Array.isArray(rawIds) ? rawIds : rawIds ? [rawIds] : [];
    const ids = fromQuery
      .flatMap((value) => value.split(','))
      .map((value) => value.trim())
      .filter((value) => value.length > 0);

    let targetIds = ids;
    if (targetIds.length === 0) {
      const id = this.requireVisitor(visitorId);
      targetIds = (this.selections.get(id) ?? []).map((entry) => entry.carId);
    }

    const uniqueIds = [...new Set(targetIds)];
    if (uniqueIds.length === 0) {
      throw new BadRequestException({
        code: 'COMPARE_EMPTY',
        message: '请先选择要对比的车型',
      });
    }
    if (uniqueIds.length > COMPARE_MAX_SIZE) {
      throw new BadRequestException({
        code: 'COMPARE_LIMIT_EXCEEDED',
        message: `最多只能同时对比 ${COMPARE_MAX_SIZE} 款车型`,
      });
    }

    const cars = uniqueIds.map((id) => this.repository.findPublishedDetail(id));
    return buildCompareMatrix(cars);
  }

  private requireVisitor(visitorId?: string): string {
    const id = visitorId?.trim();
    if (!id) {
      throw new BadRequestException({
        code: 'VISITOR_ID_REQUIRED',
        message: '缺少访客标识 visitorId',
      });
    }
    return id;
  }
}

export const compareService = new CompareService();
