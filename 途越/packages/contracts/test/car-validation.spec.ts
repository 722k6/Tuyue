import { describe, expect, it } from 'vitest';
import {
  CAR_LIMITS,
  EnergyType,
  PublishStatus,
  normalizeCarImages,
  validateCarDraft,
  type CarDraftInput,
} from '../src/index';

function draft(overrides: Partial<CarDraftInput> = {}): CarDraftInput {
  return {
    name: '途越远行',
    series: '远行系列',
    energyType: EnergyType.GASOLINE,
    tagline: '从容应对每一段旅程',
    description: '用于前台详情页展示的车型介绍文案。',
    priceMinCents: 18_990_000,
    priceMaxCents: 23_990_000,
    publishStatus: PublishStatus.DRAFT,
    ...overrides,
  };
}

describe('validateCarDraft', () => {
  it('accepts a complete draft', () => {
    expect(validateCarDraft(draft())).toEqual([]);
  });

  it('rejects blank and over-long text fields with field-level errors', () => {
    const errors = validateCarDraft(
      draft({
        name: '  ',
        series: '系',
        tagline: '短',
        description: 'x'.repeat(CAR_LIMITS.description.max + 1),
      }),
    );
    expect(errors.map((error) => error.field)).toEqual([
      'name',
      'series',
      'tagline',
      'description',
    ]);
    expect(errors[0]?.message).toContain('不能为空');
    expect(errors[3]?.message).toContain('500');
  });

  it('rejects an inverted or out-of-range price', () => {
    const errors = validateCarDraft(
      draft({ priceMinCents: 20_000_000, priceMaxCents: 10_000_000 }),
    );
    expect(errors).toEqual([{ field: 'priceMaxCents', message: '最高价不能低于最低价' }]);

    const overflow = validateCarDraft(
      draft({ priceMinCents: CAR_LIMITS.priceCents.max + 100, priceMaxCents: 10_000_000 }),
    );
    expect(overflow.some((error) => error.field === 'priceMinCents')).toBe(true);
  });

  it('rejects unknown enum values', () => {
    const errors = validateCarDraft(
      draft({
        energyType: 'hydrogen' as EnergyType,
        publishStatus: 'archived' as PublishStatus,
      }),
    );
    expect(errors.map((error) => error.field)).toEqual(['energyType', 'publishStatus']);
  });
});

describe('normalizeCarImages', () => {
  it('drops duplicates, caps the count and keeps exactly one cover', () => {
    const images = Array.from({ length: CAR_LIMITS.images.max + 2 }, (_, index) => ({
      url: `/upload/${index}.webp`,
      isCover: false,
    }));
    images.push({ url: '/upload/0.webp', isCover: true });
    const normalized = normalizeCarImages(images);

    expect(normalized).toHaveLength(CAR_LIMITS.images.max);
    expect(normalized.filter((image) => image.isCover)).toHaveLength(1);
    expect(normalized[0]?.isCover).toBe(true);
  });

  it('promotes the first image when no cover is marked', () => {
    const normalized = normalizeCarImages([
      { url: '/a.webp', isCover: false },
      { url: '/b.webp', isCover: false },
    ]);
    expect(normalized.map((image) => image.isCover)).toEqual([true, false]);
  });
});
