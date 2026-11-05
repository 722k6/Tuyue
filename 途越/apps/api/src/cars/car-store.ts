import { BadRequestException, Injectable } from '@nestjs/common';
import {
  CAR_LIMITS,
  CarParameterGroup,
  PublishStatus,
  normalizeCarImages,
  validateCarDraft,
  validateCarParameters,
  type CarDetail,
  type CarDraftInput,
  type CarImage,
  type CarImageInput,
  type CarParameter,
  type CarSummary,
  type PaginatedResponse,
} from '@tuyue/contracts';
import { mockCars } from '@tuyue/test-utils';
import { randomUUID } from 'node:crypto';

export interface CarListQuery {
  keyword?: string;
  status?: string;
  page?: number | string;
  pageSize?: number | string;
}

const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 50;

function cloneCar(car: CarDetail): CarDetail {
  return {
    ...car,
    galleryUrls: [...car.galleryUrls],
    images: car.images.map((image) => ({ ...image })),
    parameters: car.parameters.map((parameter) => ({ ...parameter })),
    configOptions: car.configOptions.map((option) => ({ ...option })),
  };
}

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

function assertDraft(input: CarDraftInput): void {
  const errors = validateCarDraft(input);
  if (errors.length > 0) {
    throw new BadRequestException({
      code: 'CAR_VALIDATION_FAILED',
      message: errors[0]?.message ?? '车型信息校验未通过',
      details: errors,
    });
  }
}

@Injectable()
export class CarStore {
  private readonly cars = new Map<string, CarDetail>();

  constructor() {
    this.reset();
  }

  reset(seed: readonly CarDetail[] = mockCars): void {
    this.cars.clear();
    for (const car of seed) {
      this.cars.set(car.id, cloneCar(car));
    }
  }

  list(query: CarListQuery = {}): PaginatedResponse<CarSummary> {
    const keyword = query.keyword?.trim().toLowerCase() ?? '';
    const status = query.status?.trim() ?? '';
    const pageInput = Math.trunc(Number(query.page ?? 1));
    const pageSizeInput = Math.trunc(Number(query.pageSize ?? DEFAULT_PAGE_SIZE));
    const page = Number.isFinite(pageInput) && pageInput > 0 ? pageInput : 1;
    const pageSize = Math.min(
      MAX_PAGE_SIZE,
      Number.isFinite(pageSizeInput) && pageSizeInput > 0 ? pageSizeInput : DEFAULT_PAGE_SIZE,
    );

    const filtered = [...this.cars.values()]
      .filter((car) => {
        if (status && car.publishStatus !== status) return false;
        if (!keyword) return true;
        return [car.name, car.series, car.tagline].some((text) =>
          text.toLowerCase().includes(keyword),
        );
      })
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));

    const start = (page - 1) * pageSize;
    return {
      items: filtered.slice(start, start + pageSize).map(toSummary),
      page,
      pageSize,
      total: filtered.length,
    };
  }

  find(id: string): CarDetail | null {
    const car = this.cars.get(id);
    return car ? cloneCar(car) : null;
  }

  create(input: CarDraftInput): CarDetail {
    assertDraft(input);
    const now = new Date().toISOString();
    const car: CarDetail = {
      id: `car-${randomUUID()}`,
      name: input.name.trim(),
      series: input.series.trim(),
      energyType: input.energyType,
      tagline: input.tagline.trim(),
      thumbnailUrl: '',
      priceMinCents: input.priceMinCents,
      priceMaxCents: input.priceMaxCents,
      publishStatus: input.publishStatus,
      galleryUrls: [],
      images: [],
      description: input.description.trim(),
      parameters: [],
      configOptions: [],
      updatedAt: now,
    };
    this.cars.set(car.id, car);
    return cloneCar(car);
  }

  update(id: string, input: CarDraftInput): CarDetail | null {
    const current = this.cars.get(id);
    if (!current) return null;
    assertDraft(input);
    const updated: CarDetail = {
      ...current,
      name: input.name.trim(),
      series: input.series.trim(),
      energyType: input.energyType,
      tagline: input.tagline.trim(),
      priceMinCents: input.priceMinCents,
      priceMaxCents: input.priceMaxCents,
      publishStatus: input.publishStatus,
      description: input.description.trim(),
      updatedAt: new Date().toISOString(),
    };
    this.cars.set(id, updated);
    return cloneCar(updated);
  }

  setParameters(id: string, parameters: readonly CarParameter[]): CarDetail | null {
    const car = this.cars.get(id);
    if (!car) return null;

    const errors = validateCarParameters([...parameters]);
    if (errors.length > 0) {
      throw new BadRequestException({
        code: 'CAR_PARAMETER_INVALID',
        message: errors[0]?.message ?? '车型参数校验未通过',
        details: errors,
      });
    }

    const normalized: CarParameter[] = parameters.map((parameter) => ({
      code: parameter.code.trim(),
      label: parameter.label.trim(),
      value: parameter.value.trim(),
      ...(parameter.unit?.trim() ? { unit: parameter.unit.trim() } : {}),
      group: parameter.group ?? CarParameterGroup.OTHER,
    }));
    const updated: CarDetail = {
      ...car,
      parameters: normalized,
      updatedAt: new Date().toISOString(),
    };
    this.cars.set(id, updated);
    return cloneCar(updated);
  }

  /** 审核流转后把状态回写到编辑侧 Store，避免两个内存数据源显示的发布状态不一致。 */
  patchStatus(id: string, status: PublishStatus): CarDetail | null {
    const car = this.cars.get(id);
    if (!car) return null;
    const updated: CarDetail = {
      ...car,
      publishStatus: status,
      updatedAt: new Date().toISOString(),
    };
    this.cars.set(id, updated);
    return cloneCar(updated);
  }

  remove(id: string): boolean {
    return this.cars.delete(id);
  }

  addImages(id: string, imageUrls: readonly string[]): CarImage[] | null {
    const car = this.cars.get(id);
    if (!car) return null;
    if (car.images.length + imageUrls.length > CAR_LIMITS.images.max) {
      throw new BadRequestException({
        code: 'CAR_IMAGE_LIMIT_EXCEEDED',
        message: `每个车型最多保留 ${CAR_LIMITS.images.max} 张图片`,
      });
    }
    const additions = imageUrls.map((url) => ({
      id: `img-${randomUUID()}`,
      url,
      isCover: car.images.length === 0,
    }));
    return this.applyImages(car, [...car.images, ...additions]);
  }

  setImages(id: string, images: readonly CarImageInput[]): CarImage[] | null {
    const car = this.cars.get(id);
    if (!car) return null;
    if (images.length > CAR_LIMITS.images.max) {
      throw new BadRequestException({
        code: 'CAR_IMAGE_LIMIT_EXCEEDED',
        message: `每个车型最多保留 ${CAR_LIMITS.images.max} 张图片`,
      });
    }
    return this.applyImages(car, images);
  }

  removeImage(id: string, imageId: string): CarImage[] | null {
    const car = this.cars.get(id);
    if (!car) return null;
    return this.applyImages(
      car,
      car.images.filter((image) => image.id !== imageId),
    );
  }

  private applyImages(car: CarDetail, images: readonly CarImageInput[]): CarImage[] {
    const usedIds = new Set<string>();
    const normalized = normalizeCarImages([...images]).map((image) => {
      const id = usedIds.has(image.id) ? `img-${randomUUID()}` : image.id;
      usedIds.add(id);
      return { ...image, id };
    });
    const cover = normalized.find((image) => image.isCover);
    const updated: CarDetail = {
      ...car,
      images: normalized,
      galleryUrls: normalized.map((image) => image.url),
      thumbnailUrl: cover?.url ?? '',
      updatedAt: new Date().toISOString(),
    };
    this.cars.set(car.id, updated);
    return normalized.map((image) => ({ ...image }));
  }
}
