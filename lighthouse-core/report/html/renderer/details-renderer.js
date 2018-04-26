/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* globals self CriticalRequestChainRenderer Util URL */

class DetailsRenderer {
  /**
   * @param {!DOM} dom
   */
  constructor(dom) {
    /** @private {!DOM} */
    this._dom = dom;
    /** @private {!Document|!Element} */
    this._templateContext; // eslint-disable-line no-unused-expressions
  }

  /**
   * @param {!Document|!Element} context
   */
  setTemplateContext(context) {
    this._templateContext = context;
  }

  /**
   * @param {!DetailsRenderer.DetailsJSON} details
   * @return {!Node}
   */
  render(details) {
    switch (details.type) {
      case 'text':
        return this._renderText(/** @type {!DetailsRenderer.StringDetailsJSON} */ (details));
      case 'url':
        return this._renderTextURL(/** @type {!DetailsRenderer.StringDetailsJSON} */ (details));
      case 'bytes':
        return this._renderBytes(/** @type {!DetailsRenderer.NumericUnitDetailsJSON} */ (details));
      case 'ms':
        // eslint-disable-next-line max-len
        return this._renderMilliseconds(/** @type {!DetailsRenderer.NumericUnitDetailsJSON} */ (details));
      case 'link':
        return this._renderLink(/** @type {!DetailsRenderer.LinkDetailsJSON} */ (details));
      case 'thumbnail':
        return this._renderThumbnail(/** @type {!DetailsRenderer.ThumbnailDetails} */ (details));
      case 'filmstrip':
        return this._renderFilmstrip(/** @type {!DetailsRenderer.FilmstripDetails} */ (details));
      case 'table':
        return this._renderTable(/** @type {!DetailsRenderer.TableDetailsJSON} */ (details));
      case 'code':
        return this._renderCode(details);
      case 'node':
        return this.renderNode(/** @type {!DetailsRenderer.NodeDetailsJSON} */(details));
      case 'criticalrequestchain':
        return CriticalRequestChainRenderer.render(this._dom, this._templateContext,
          /** @type {!CriticalRequestChainRenderer.CRCDetailsJSON} */ (details));
      default: {
        throw new Error(`Unknown type: ${details.type}`);
      }
    }
  }

  /**
   * @param {!DetailsRenderer.NumericUnitDetailsJSON} details
   * @return {!Element}
   */
  _renderBytes(details) {
    // TODO: handle displayUnit once we have something other than 'kb'
    const value = Util.formatBytesToKB(details.value, details.granularity);
    return this._renderText({type: 'text', value});
  }

  /**
   * @param {!DetailsRenderer.NumericUnitDetailsJSON} details
   * @return {!Element}
   */
  _renderMilliseconds(details) {
    let value = Util.formatMilliseconds(details.value, details.granularity);
    if (details.displayUnit === 'duration') {
      value = Util.formatDuration(details.value);
    }

    return this._renderText({type: 'text', value});
  }

  /**
   * @param {!DetailsRenderer.StringDetailsJSON} text
   * @return {!Element}
   */
  _renderTextURL(text) {
    const url = text.value;

    let displayedPath;
    let displayedHost;
    let title;
    try {
      const parsed = Util.parseURL(url);
      displayedPath = parsed.file === '/' ? parsed.origin : parsed.file;
      displayedHost = parsed.file === '/' ? '' : `(${parsed.hostname})`;
      title = url;
    } catch (/** @type {!Error} */ e) {
      if (!(e instanceof TypeError)) {
        throw e;
      }
      displayedPath = url;
    }

    const element = this._dom.createElement('div', 'lh-text__url');
    element.appendChild(this._renderText({
      value: displayedPath,
      type: 'text',
    }));

    if (displayedHost) {
      const hostElem = this._renderText({
        value: displayedHost,
        type: 'text',
      });
      hostElem.classList.add('lh-text__url-host');
      element.appendChild(hostElem);
    }

    if (title) element.title = url;
    return element;
  }

  /**
   * @param {!DetailsRenderer.LinkDetailsJSON} details
   * @return {!Element}
   */
  _renderLink(details) {
    const allowedProtocols = ['https:', 'http:'];
    const url = new URL(details.url);
    if (!allowedProtocols.includes(url.protocol)) {
      // Fall back to just the link text if protocol not allowed.
      return this._renderText({
        type: 'text',
        value: details.text,
      });
    }

    const a = /** @type {!HTMLAnchorElement} */ (this._dom.createElement('a'));
    a.rel = 'noopener';
    a.target = '_blank';
    a.textContent = details.text;
    a.href = url.href;

    return a;
  }

  /**
   * @param {!DetailsRenderer.StringDetailsJSON} text
   * @return {!Element}
   */
  _renderText(text) {
    const element = this._dom.createElement('div', 'lh-text');
    element.textContent = text.value;
    return element;
  }

  /**
   * Create small thumbnail with scaled down image asset.
   * If the supplied details doesn't have an image/* mimeType, then an empty span is returned.
   * @param {!DetailsRenderer.ThumbnailDetails} details
   * @return {!Element}
   */
  _renderThumbnail(details) {
    const element = this._dom.createElement('img', 'lh-thumbnail');
    element.src = details.value;
    element.title = details.value;
    element.alt = '';
    return element;
  }

  /**
   * @param {!DetailsRenderer.TableDetailsJSON} details
   * @return {!Element}
   */
  _renderTable(details) {
    if (!details.items.length) return this._dom.createElement('span');

    const element = this._dom.createElement('details', 'lh-details');
    element.open = true;
    element.appendChild(this._dom.createElement('summary')).textContent = 'View Details';

    const tableElem = this._dom.createChildOf(element, 'table', 'lh-table');
    const theadElem = this._dom.createChildOf(tableElem, 'thead');
    const theadTrElem = this._dom.createChildOf(theadElem, 'tr');

    for (const heading of details.headings) {
      const itemType = heading.itemType || 'text';
      const classes = `lh-table-column--${itemType}`;
      this._dom.createChildOf(theadTrElem, 'th', classes).appendChild(this.render({
        type: 'text',
        value: heading.text || '',
      }));
    }

    const tbodyElem = this._dom.createChildOf(tableElem, 'tbody');
    for (const row of details.items) {
      const rowElem = this._dom.createChildOf(tbodyElem, 'tr');
      for (const heading of details.headings) {
        const value = /** @type {number|string|!DetailsRenderer.DetailsJSON} */ (row[heading.key]);

        if (typeof value === 'undefined') {
          this._dom.createChildOf(rowElem, 'td', 'lh-table-column--empty');
          continue;
        }
        // handle nested types like code blocks in table rows.
        if (value.type) {
          const valueAsDetails = /** @type {!DetailsRenderer.DetailsJSON} */ (value);
          const classes = `lh-table-column--${valueAsDetails.type}`;
          this._dom.createChildOf(rowElem, 'td', classes).appendChild(this.render(valueAsDetails));
          continue;
        }

        // build new details item to render
        const item = {
          value: /** @type {number|string} */ (value),
          type: heading.itemType,
          displayUnit: heading.displayUnit,
          granularity: heading.granularity,
        };
        const classes = `lh-table-column--${value.type || heading.itemType}`;
        this._dom.createChildOf(rowElem, 'td', classes).appendChild(this.render(item));
      }
    }
    return element;
  }

  /**
   * @param {!DetailsRenderer.NodeDetailsJSON} item
   * @return {!Element}
   * @protected
   */
  renderNode(item) {
    const element = this._dom.createElement('span', 'lh-node');
    element.textContent = item.snippet;
    element.title = item.selector;
    if (item.path) element.setAttribute('data-path', item.path);
    if (item.selector) element.setAttribute('data-selector', item.selector);
    if (item.snippet) element.setAttribute('data-snippet', item.snippet);
    return element;
  }

  /**
   * @param {!DetailsRenderer.FilmstripDetails} details
   * @return {!Element}
   */
  _renderFilmstrip(details) {
    const filmstripEl = this._dom.createElement('div', 'lh-filmstrip');

    for (const thumbnail of details.items) {
      const frameEl = this._dom.createChildOf(filmstripEl, 'div', 'lh-filmstrip__frame');

      let timing = Util.formatMilliseconds(thumbnail.timing, 1);
      if (thumbnail.timing > 1000) {
        timing = Util.formatNumber(thumbnail.timing / 1000) + ' s';
      }

      const timingEl = this._dom.createChildOf(frameEl, 'div', 'lh-filmstrip__timestamp');
      timingEl.textContent = timing;

      const base64data = thumbnail.data;
      this._dom.createChildOf(frameEl, 'img', 'lh-filmstrip__thumbnail', {
        src: `data:image/jpeg;base64,${base64data}`,
        alt: `Screenshot at ${timing}`,
      });
    }

    return filmstripEl;
  }

  /**
   * @param {!DetailsRenderer.DetailsJSON} details
   * @return {!Element}
   */
  _renderCode(details) {
    const pre = this._dom.createElement('pre', 'lh-code');
    pre.textContent = details.value;
    return pre;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = DetailsRenderer;
} else {
  self.DetailsRenderer = DetailsRenderer;
}

// TODO, what's the diff between DetailsJSON and NumericUnitDetailsJSON?
/**
 * @typedef {{
 *     type: string,
 *     value: (string|number|undefined),
 *     summary: (DetailsRenderer.OpportunitySummary|undefined),
 *     granularity: (number|undefined),
 *     displayUnit: (string|undefined)
 * }}
 */
DetailsRenderer.DetailsJSON; // eslint-disable-line no-unused-expressions

/**
 * @typedef {{
 *     type: string,
 *     value: string,
 *     granularity: (number|undefined),
 *     displayUnit: (string|undefined),
 * }}
 */
DetailsRenderer.StringDetailsJSON; // eslint-disable-line no-unused-expressions


/**
 * @typedef {{
 *     type: string,
 *     value: number,
 *     granularity: (number|undefined),
 *     displayUnit: (string|undefined),
 * }}
 */
DetailsRenderer.NumericUnitDetailsJSON; // eslint-disable-line no-unused-expressions

/**
 * @typedef {{
 *     type: string,
 *     path: (string|undefined),
 *     selector: (string|undefined),
 *     snippet:(string|undefined)
 * }}
 */
DetailsRenderer.NodeDetailsJSON; // eslint-disable-line no-unused-expressions

/**
 * @typedef {{
 *     itemType: string,
 *     key: string,
 *     text: (string|undefined),
 *     granularity: (number|undefined),
 *     displayUnit: (string|undefined),
 * }}
 */
DetailsRenderer.TableHeaderJSON; // eslint-disable-line no-unused-expressions

/** @typedef {{
 *     type: string,
 *     items: !Array<!DetailsRenderer.DetailsJSON>,
 *     headings: !Array<!DetailsRenderer.TableHeaderJSON>
 * }}
 */
DetailsRenderer.TableDetailsJSON; // eslint-disable-line no-unused-expressions

/** @typedef {{
 *     type: string,
 *     value: (string|undefined),
 * }}
 */
DetailsRenderer.ThumbnailDetails; // eslint-disable-line no-unused-expressions

/** @typedef {{
 *     type: string,
 *     text: string,
 *     url: string
 * }}
 */
DetailsRenderer.LinkDetailsJSON; // eslint-disable-line no-unused-expressions

/** @typedef {{
 *     type: string,
 *     scale: number,
 *     items: !Array<{timing: number, timestamp: number, data: string}>,
 * }}
 */
DetailsRenderer.FilmstripDetails; // eslint-disable-line no-unused-expressions


/** @typedef {{
 *     wastedMs: (number|undefined),
 *     wastedBytes: (number|undefined),
 * }}
 */
DetailsRenderer.OpportunitySummary; // eslint-disable-line no-unused-expressions
