import _TreemapUtil = require('../app/src/util.js');

export type Strings = Record<LH.Locale, import('../../lighthouse-core/lib/i18n/locales').LhlMessages>;

declare global {
  class WebTreeMap {
    constructor(data: any, options: WebTreeMapOptions);
    render(el: HTMLElement): void;
    layout(data: any, el: HTMLElement): void;
  }

  interface WebTreeMapOptions {
    padding: [number, number, number, number];
    spacing: number;
    caption(node: LH.Treemap.Node): string;
    showNode?(node: LH.Treemap.Node): boolean;
  }

  interface RenderState {
    root: LH.Treemap.Node;
    viewMode: LH.Treemap.ViewMode;
  }

  var webtreemap: {
    TreeMap: typeof WebTreeMap;
    render(el: HTMLElement, data: any, options: WebTreeMapOptions): void;
    sort(data: any): void;
  };
  var TreemapUtil: typeof _TreemapUtil;
  var strings: Strings;

  interface Window {
    __treemapOptions?: LH.Treemap.Options;
  }
}

export {};
