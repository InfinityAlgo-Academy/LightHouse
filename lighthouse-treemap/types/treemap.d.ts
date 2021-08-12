import {Logger as _Logger} from '../../report/renderer/logger.js';
import {FirebaseNamespace} from '@firebase/app-types';

declare global {
  class WebTreeMap {
    constructor(data: any, options: WebTreeMapOptions);
    render(el: HTMLElement): void;
    layout(data: any, el: HTMLElement): void;
    zoom(address: number[]): void
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

  interface NodeWithElement extends LH.Treemap.Node {
    /** webtreemap adds dom to node data. */
    dom?: HTMLElement;
  }

  var webtreemap: {
    TreeMap: typeof WebTreeMap;
    render(el: HTMLElement, data: any, options: WebTreeMapOptions): void;
    sort(data: any): void;
  };
  var logger: _Logger;
  var firebase: Required<FirebaseNamespace>;
  var idbKeyval: typeof import('idb-keyval');
  var strings: Record<LH.Locale, import('../../lighthouse-core/lib/i18n/locales').LhlMessages>;

  interface Window {
    logger: _Logger;
    __treemapOptions?: LH.Treemap.Options;
  }

  interface AddEventListenerOptions {
    signal?: AbortSignal;
  }
}

export {};
