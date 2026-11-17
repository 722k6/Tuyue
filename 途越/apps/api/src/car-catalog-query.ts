import { BadRequestException } from '@nestjs/common';
import {
  BodyStyle,
  CarCatalogSort,
  EnergyType,
  PublishStatus,
  SortDirection,
  type CarCatalogQuery,
  type CarDetail,
} from '@tuyue/contracts';

const MAX_KEYWORD_LENGTH = 80;

function invalidQuery(message: string): never {
  throw new BadRequestException({ code: 'INVALID_CAR_QUERY', message });
}

function readSingleValue(raw: unknown, field: string): string | undefined {
  if (raw === undefined) return undefined;
  if (typeof raw !== 'string') invalidQuery(`${field} 只能传入一个字符串值`);
  return raw.trim();
}

function readEnum<T extends string>(
  raw: unknown,
  field: string,
  allowedValues: readonly T[],
): T | undefined {
  const value = readSingleValue(raw, field);
  if (!value) return undefined;
  if (!allowedValues.includes(value as T)) {
    invalidQuery(`${field} 可选值为 ${allowedValues.join(', ')}`);
  }
  return value as T;
}

function readCents(raw: unknown, field: string): number | undefined {
  const value = readSingleValue(raw, field);
  if (!value) return undefined;
  if (!/^\d+$/.test(value)) invalidQuery(`${field} 必须是非负整数（单位：分）`);
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) invalidQuery(`${field} 超出安全整数范围`);
  return parsed;
}

/** 将 HTTP 查询字符串收窄为共享契约，并在入口统一拒绝无效值。 */
export function parseCarCatalogQuery(raw: Record<string, unknown>): CarCatalogQuery {
  const query: CarCatalogQuery = {};
  const keyword = readSingleValue(raw.keyword, 'keyword');
  if (keyword) {
    if (keyword.length > MAX_KEYWORD_LENGTH) {
      invalidQuery(`keyword 最长 ${MAX_KEYWORD_LENGTH} 个字符`);
    }
    query.keyword = keyword;
  }

  const energyType = readEnum(raw.energyType, 'energyType', Object.values(EnergyType));
  const bodyStyle = readEnum(raw.bodyStyle, 'bodyStyle', Object.values(BodyStyle));
  const sortBy = readEnum(raw.sortBy, 'sortBy', Object.values(CarCatalogSort));
  const sortDirection = readEnum(raw.sortDirection, 'sortDirection', Object.values(SortDirection));
  const minPriceCents = readCents(raw.minPriceCents, 'minPriceCents');
  const maxPriceCents = readCents(raw.maxPriceCents, 'maxPriceCents');

  if (minPriceCents !== undefined && maxPriceCents !== undefined && minPriceCents > maxPriceCents) {
    invalidQuery('minPriceCents 不能大于 maxPriceCents');
  }

  if (energyType) query.energyType = energyType;
  if (bodyStyle) query.bodyStyle = bodyStyle;
  if (sortBy) query.sortBy = sortBy;
  if (sortDirection) query.sortDirection = sortDirection;
  if (minPriceCents !== undefined) query.minPriceCents = minPriceCents;
  if (maxPriceCents !== undefined) query.maxPriceCents = maxPriceCents;
  return query;
}

function containsKeyword(car: CarDetail, keyword: string): boolean {
  const parameterKeywords = car.parameters.flatMap((parameter) => [
    parameter.code,
    parameter.label,
    parameter.value,
    parameter.unit ?? '',
  ]);
  const searchableText = [car.name, ...(car.aliases ?? []), ...parameterKeywords]
    .join(' ')
    .toLocaleLowerCase('zh-CN');
  return searchableText.includes(keyword.toLocaleLowerCase('zh-CN'));
}

/**
 * 前台目录查询：先强制过滤已上架，再组合关键词、枚举和价格区间。
 * 价格使用区间相交语义，只要车型价格区间与访客区间有交集即命中。
 */
export function selectPublishedCars(
  cars: readonly CarDetail[],
  query: CarCatalogQuery,
): CarDetail[] {
  const selected = cars.filter((car) => {
    if (car.publishStatus !== PublishStatus.PUBLISHED) return false;
    if (query.keyword && !containsKeyword(car, query.keyword)) return false;
    if (query.energyType && car.energyType !== query.energyType) return false;
    if (query.bodyStyle && car.bodyStyle !== query.bodyStyle) return false;
    if (query.minPriceCents !== undefined && car.priceMaxCents < query.minPriceCents) return false;
    if (query.maxPriceCents !== undefined && car.priceMinCents > query.maxPriceCents) return false;
    return true;
  });

  if (query.sortBy) {
    const direction =
      query.sortDirection ??
      (query.sortBy === CarCatalogSort.POPULARITY ? SortDirection.DESC : SortDirection.ASC);
    const factor = direction === SortDirection.ASC ? 1 : -1;
    selected.sort((left, right) => {
      const leftValue =
        query.sortBy === CarCatalogSort.PRICE ? left.priceMinCents : (left.popularityScore ?? 0);
      const rightValue =
        query.sortBy === CarCatalogSort.PRICE ? right.priceMinCents : (right.popularityScore ?? 0);
      return (leftValue - rightValue) * factor || left.id.localeCompare(right.id);
    });
  }

  return selected;
}
