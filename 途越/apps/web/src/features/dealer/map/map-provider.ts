export interface MapMarker {
  id: string;
  name: string;
  longitude: number;
  latitude: number;
}

export interface MapProviderOptions {
  focusId?: string | undefined;
  onMarkerClick?: ((id: string) => void) | undefined;
}

export interface MapProvider {
  readonly providerName: string;
  render(container: HTMLElement, markers: MapMarker[], options?: MapProviderOptions): void;
  destroy(): void;
}

export type MapProviderKind = 'mock' | 'amap' | 'tencent' | 'baidu';

export interface MapProviderFactory {
  (): MapProvider;
}
