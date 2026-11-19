import { describe, expect, it } from 'vitest';
import { formatDate, formatPriceRange } from '../src/shared/format';

describe('展示格式', () => {
  it('价格区间按万元展示，整数万不带小数尾巴', () => {
    expect(formatPriceRange(18_990_000, 23_990_000)).toBe('18.99–23.99 万');
    expect(formatPriceRange(20_000_000, 20_000_000)).toBe('20 万');
    expect(formatPriceRange(0, 0)).toBe('0 万');
  });

  it('日期按 年/月/日 展示', () => {
    expect(formatDate('2026-10-27T00:00:00.000Z')).toMatch(/^2026\/10\/2[67]$/);
    expect(formatDate('not-a-date')).toBe('not-a-date');
  });
});
