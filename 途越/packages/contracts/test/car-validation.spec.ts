import { describe, expect, it } from 'vitest';
import {
  CAR_LIMITS,
  CAR_PARAMETER_LIMITS,
  CarParameterGroup,
  EnergyType,
  PublishStatus,
  normalizeCarImages,
  validateCarDraft,
  validateCarParameters,
  type CarDraftInput,
  type CarParameter,
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

describe('validateCarParameters', () => {
  const valid: CarParameter[] = [
    { code: 'power', label: '最大功率', value: '185', unit: 'kW', group: CarParameterGroup.POWER },
    { code: 'seats', label: '座位数', value: '5', unit: '座', group: CarParameterGroup.SIZE },
  ];

  it('accepts complete parameters and treats unit/group as optional', () => {
    expect(validateCarParameters(valid)).toEqual([]);
    expect(validateCarParameters([{ code: 'adas', label: '辅助驾驶', value: 'L2' }])).toEqual([]);
  });

  it('reports blank fields with the parameter index', () => {
    const errors = validateCarParameters([
      { code: ' ', label: '', value: '', unit: '', group: CarParameterGroup.POWER },
    ]);
    expect(errors.map((error) => error.field)).toEqual([
      'parameters[0].code',
      'parameters[0].label',
      'parameters[0].value',
    ]);
  });

  it('rejects duplicate codes case-insensitively', () => {
    const errors = validateCarParameters([
      { code: 'Power', label: '最大功率', value: '185', group: CarParameterGroup.POWER },
      { code: 'power', label: '最大功率', value: '200', group: CarParameterGroup.POWER },
    ]);
    expect(errors).toEqual([
      { field: 'parameters[1].code', message: '参数代码与第 1 条重复' },
    ]);
  });

  it('rejects over-long text, unknown groups and too many rows', () => {
    const longErrors = validateCarParameters([
      {
        code: 'x'.repeat(CAR_PARAMETER_LIMITS.code.max + 1),
        label: 'y'.repeat(CAR_PARAMETER_LIMITS.label.max + 1),
        value: 'z'.repeat(CAR_PARAMETER_LIMITS.value.max + 1),
        unit: 'u'.repeat(CAR_PARAMETER_LIMITS.unit.max + 1),
        group: 'battery' as CarParameterGroup,
      },
    ]);
    expect(longErrors.map((error) => error.field)).toEqual([
      'parameters[0].code',
      'parameters[0].label',
      'parameters[0].value',
      'parameters[0].unit',
      'parameters[0].group',
    ]);

    const tooMany = Array.from({ length: CAR_PARAMETER_LIMITS.max + 1 }, (_, index) => ({
      code: `p${index}`,
      label: `参数${index}`,
      value: '1',
    }));
    expect(validateCarParameters(tooMany)[0]?.field).toBe('parameters');
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
