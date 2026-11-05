export type { MapMarker, MapProvider, MapProviderKind, MapProviderOptions } from './map-provider';
export { MockMapProvider } from './mock-map-provider';

import type { MapProvider, MapProviderKind } from './map-provider';
import { MockMapProvider } from './mock-map-provider';

/**
 * 供应商切换的唯一入口。高德 / 腾讯 / 百度确定后，
 * 在此新增对应的适配器实现，业务页面不需要改动。
 */
export function createMapProvider(kind: MapProviderKind = 'mock'): MapProvider {
  if (kind === 'mock') return new MockMapProvider();
  throw new Error(`地图供应商 ${kind} 尚未接入，请先在 map/ 下实现对应适配器`);
}
