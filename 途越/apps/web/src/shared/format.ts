/** 价格与日期的统一展示格式，避免每个页面各写一套 toFixed。 */

/**
 * 官网价格区间：整数「分」→ 万元。
 *
 * 例：18990000 → `18.99 万`，18990000–23990000 → `18.99–23.99 万`。
 * 整数万时去掉多余的小数位（20.00 万读起来像预算表，不像车价）。
 */
export function formatPriceRange(priceMinCents: number, priceMaxCents: number): string {
  const min = formatWan(priceMinCents);
  const max = formatWan(priceMaxCents);
  return min === max ? `${min} 万` : `${min}–${max} 万`;
}

function formatWan(cents: number): string {
  const wan = cents / 1_000_000;
  const text = wan.toFixed(2);
  return text.endsWith('.00') ? text.slice(0, -3) : text;
}

/** ISO 时间 → `2026/10/27`；无法解析时原样返回，避免页面出现 Invalid Date。 */
export function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}/${month}/${day}`;
}
