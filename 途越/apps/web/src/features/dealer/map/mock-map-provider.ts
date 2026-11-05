import type { MapMarker, MapProvider, MapProviderOptions } from './map-provider';

/**
 * 地图供应商未定前的占位实现：不依赖任何外部 SDK，
 * 只按经纬度把门店渲染成可点击的标记列表，保证业务页面可以先跑通。
 */
export class MockMapProvider implements MapProvider {
  readonly providerName = 'mock';
  private root: HTMLElement | null = null;

  render(container: HTMLElement, markers: MapMarker[], options: MapProviderOptions = {}): void {
    this.destroy();
    const root = document.createElement('div');
    root.className = 'mock-map';

    for (const marker of markers) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'mock-map__marker';
      button.dataset.markerId = marker.id;
      if (marker.id === options.focusId) button.dataset.focused = 'true';
      button.textContent = `${marker.name} · ${marker.longitude.toFixed(4)}, ${marker.latitude.toFixed(4)}`;
      button.addEventListener('click', () => options.onMarkerClick?.(marker.id));
      root.appendChild(button);
    }

    container.appendChild(root);
    this.root = root;
  }

  destroy(): void {
    this.root?.remove();
    this.root = null;
  }
}
