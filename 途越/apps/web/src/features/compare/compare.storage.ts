import { COMPARE_MAX_SIZE, type CompareSelectionItem } from '@tuyue/contracts';

export const VISITOR_STORAGE_KEY = 'tuyue.visitor.id';
export const COMPARE_STORAGE_KEY = 'tuyue.compare.v1';

/**
 * localStorage 在隐私模式、禁用 Cookie、iframe 沙箱里都可能直接抛异常，
 * 统一包一层，读不到就返回 null，让页面退化成「纯内存」而不至于白屏。
 */
function storage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function createId(): string {
  const cryptoRef = globalThis.crypto;
  if (cryptoRef && typeof cryptoRef.randomUUID === 'function') return cryptoRef.randomUUID();
  return `visitor-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

/** 匿名访客标识：对比清单按它归属，访客侧不需要登录。 */
export function getVisitorId(): string {
  const store = storage();
  const existing = store?.getItem(VISITOR_STORAGE_KEY);
  if (existing) return existing;

  const created = createId();
  store?.setItem(VISITOR_STORAGE_KEY, created);
  return created;
}

export function readStoredCompare(): CompareSelectionItem[] {
  const raw = storage()?.getItem(COMPARE_STORAGE_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    // 本地数据可能是旧版本或被手工改坏的，逐项校验，坏数据直接丢弃而不是整块清空。
    return parsed
      .filter((item): item is CompareSelectionItem => {
        if (!item || typeof item !== 'object') return false;
        const candidate = item as Partial<CompareSelectionItem>;
        return typeof candidate.carId === 'string' && typeof candidate.car?.name === 'string';
      })
      .slice(0, COMPARE_MAX_SIZE);
  } catch {
    return [];
  }
}

export function writeStoredCompare(items: readonly CompareSelectionItem[]): void {
  storage()?.setItem(COMPARE_STORAGE_KEY, JSON.stringify(items.slice(0, COMPARE_MAX_SIZE)));
}

export function clearStoredCompare(): void {
  storage()?.removeItem(COMPARE_STORAGE_KEY);
}
