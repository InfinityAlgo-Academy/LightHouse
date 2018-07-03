/**
 * @license Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';


/* globals ReportRenderer, PerformanceCategoryRenderer */

class PSIReportRenderer extends ReportRenderer {
  /**
   * Call original constructor then override the Perf Cat renderer
   * @param {DOM} dom
   */
  constructor(dom) {
    super(dom);
    /** @type {typeof PerformanceCategoryRenderer} */
    this._PerfCategoryRenderer = PSIPerformanceCategoryRenderer;
  }
}


class PSIPerformanceCategoryRenderer extends PerformanceCategoryRenderer {
  /**
   * @param {LH.ReportResult.Category} category
   * @param {Object<string, LH.Result.ReportGroup>} groups
   * @return {Element}
   * @override
   */
  render(category, groups) {
    const elem = super.render(category, groups);

    // Remove jump link
    // (This _could_ be done by wrapping around CategoryRenderer.renderScoreGauge instead, but this seems more straightforward..)
    const scoreGauge = this.dom.find('.lh-gauge__wrapper', elem);
    scoreGauge.removeAttribute('href');

    // Add field data section
    elem.prepend(this._renderFieldDataSection());
    return elem;
  }

  _renderFieldDataSection() {
    const container = this.dom.createElement('div');
    const headingEl = this.dom.createChildOf(container, 'div', 'lh-audit-group__header');
    headingEl.textContent = 'Field Data';

    const elem = this.dom.createChildOf(container, 'img');
    elem.style.maxWidth = '100%';
    elem.src = 'file:///Users/paulirish/code/lighthouse/fielddata.png';
    return container;
  }
}

