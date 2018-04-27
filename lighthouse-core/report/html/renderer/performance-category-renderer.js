/**
 * @license Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* globals self, Util, CategoryRenderer */

class PerformanceCategoryRenderer extends CategoryRenderer {
  /**
   * @param {!ReportRenderer.AuditJSON} audit
   * @return {!Element}
   */
  _renderMetric(audit) {
    const tmpl = this.dom.cloneTemplate('#tmpl-lh-perf-metric', this.templateContext);
    const element = this.dom.find('.lh-perf-metric', tmpl);
    element.id = audit.result.name;
    element.classList.add(`lh-perf-metric--${Util.calculateRating(audit.result.score)}`);

    const titleEl = this.dom.find('.lh-perf-metric__title', tmpl);
    titleEl.textContent = audit.result.description;

    const valueEl = this.dom.find('.lh-perf-metric__value span', tmpl);
    valueEl.textContent = audit.result.displayValue;

    const descriptionEl = this.dom.find('.lh-perf-metric__description', tmpl);
    descriptionEl.appendChild(this.dom.convertMarkdownLinkSnippets(audit.result.helpText));

    if (typeof audit.result.rawValue !== 'number') {
      const debugStrEl = this.dom.createChildOf(element, 'div', 'lh-debug');
      debugStrEl.textContent = audit.result.debugString || 'Report error: no metric information';
      return element;
    }

    return element;
  }

  /**
   * @param {!ReportRenderer.AuditJSON} audit
   * @param {number} scale
   * @return {!Element}
   */
  _renderPerfHintAudit(audit, scale) {
    const tooltipAttrs = {title: audit.result.displayValue};

    const element = this.dom.createElement('details', [
      'lh-perf-hint',
      `lh-perf-hint--${Util.calculateRating(audit.result.score)}`,
      'lh-expandable-details',
    ].join(' '));
    element.id = audit.result.name;

    const summary = this.dom.createChildOf(element, 'summary', 'lh-perf-hint__summary ' +
      'lh-expandable-details__summary');
    const titleEl = this.dom.createChildOf(summary, 'div', 'lh-perf-hint__title');
    titleEl.textContent = audit.result.description;

    this.dom.createChildOf(summary, 'div', 'lh-toggle-arrow', {title: 'See resources'});

    if (audit.result.error) {
      const debugStrEl = this.dom.createChildOf(summary, 'div', 'lh-debug');
      debugStrEl.textContent = audit.result.debugString || 'Audit error';
      return element;
    }

    const details = audit.result.details;
    const summaryInfo = /** @type {!DetailsRenderer.OpportunitySummary}
        */ (details && details.summary);
    // eslint-disable-next-line no-console
    console.assert(summaryInfo, 'Missing `summary` for perf-hint audit');
    // eslint-disable-next-line no-console
    console.assert(typeof summaryInfo.wastedMs === 'number',
        'Missing numeric `summary.wastedMs` for perf-hint audit');
    if (!summaryInfo || !summaryInfo.wastedMs) {
      return element;
    }

    const sparklineContainerEl = this.dom.createChildOf(summary, 'div', 'lh-perf-hint__sparkline',
        tooltipAttrs);
    const sparklineEl = this.dom.createChildOf(sparklineContainerEl, 'div', 'lh-sparkline');
    const sparklineBarEl = this.dom.createChildOf(sparklineEl, 'div', 'lh-sparkline__bar');
    sparklineBarEl.style.width = summaryInfo.wastedMs / scale * 100 + '%';

    const statsEl = this.dom.createChildOf(summary, 'div', 'lh-perf-hint__stats', tooltipAttrs);
    const statsMsEl = this.dom.createChildOf(statsEl, 'div', 'lh-perf-hint__primary-stat');
    statsMsEl.textContent = Util.formatMilliseconds(summaryInfo.wastedMs);

    if (summaryInfo.wastedBytes) {
      const statsKbEl = this.dom.createChildOf(statsEl, 'div', 'lh-perf-hint__secondary-stat');
      statsKbEl.textContent = Util.formatBytesToKB(summaryInfo.wastedBytes);
    }

    const descriptionEl = this.dom.createChildOf(element, 'div', 'lh-perf-hint__description');
    descriptionEl.appendChild(this.dom.convertMarkdownLinkSnippets(audit.result.helpText));

    if (audit.result.debugString) {
      const debugStrEl = this.dom.createChildOf(summary, 'div', 'lh-debug');
      debugStrEl.textContent = audit.result.debugString;
    }

    // If there's no `type`, then we only used details for `summary`
    if (details.type) {
      element.appendChild(this.detailsRenderer.render(details));
    }

    return element;
  }

  /**
   * @override
   */
  render(category, groups) {
    const element = this.dom.createElement('div', 'lh-category');
    this.createPermalinkSpan(element, category.id);
    element.appendChild(this.renderCategoryScore(category));

    const metricAudits = category.audits.filter(audit => audit.group === 'perf-metric');
    const metricAuditsEl = this.renderAuditGroup(groups['perf-metric'], {expandable: false});

    // Metrics
    const keyMetrics = metricAudits.filter(a => a.weight >= 3);
    const otherMetrics = metricAudits.filter(a => a.weight < 3);

    const metricsBoxesEl = this.dom.createChildOf(metricAuditsEl, 'div', 'lh-metrics-container');
    const metricsColumn1El = this.dom.createChildOf(metricsBoxesEl, 'div', 'lh-metrics-column');
    const metricsColumn2El = this.dom.createChildOf(metricsBoxesEl, 'div', 'lh-metrics-column');

    keyMetrics.forEach(item => {
      metricsColumn1El.appendChild(this._renderMetric(item));
    });
    otherMetrics.forEach(item => {
      metricsColumn2El.appendChild(this._renderMetric(item));
    });

    // Filmstrip
    const timelineEl = this.dom.createChildOf(metricAuditsEl, 'div', 'lh-timeline');
    const thumbnailAudit = category.audits.find(audit => audit.id === 'screenshot-thumbnails');
    const thumbnailResult = thumbnailAudit && thumbnailAudit.result;
    if (thumbnailResult && thumbnailResult.details) {
      timelineEl.id = thumbnailResult.name;
      const thumbnailDetails = /** @type {!DetailsRenderer.FilmstripDetails} */
          (thumbnailResult.details);
      const filmstripEl = this.detailsRenderer.render(thumbnailDetails);
      timelineEl.appendChild(filmstripEl);
    }

    metricAuditsEl.open = true;
    element.appendChild(metricAuditsEl);

    // Opportunities
    const hintAudits = category.audits
        .filter(audit => audit.group === 'perf-hint' && audit.result.score < 1)
        .sort((auditA, auditB) => auditB.result.rawValue - auditA.result.rawValue);
    if (hintAudits.length) {
      const maxWaste = Math.max(...hintAudits.map(audit => audit.result.rawValue));
      const scale = Math.ceil(maxWaste / 1000) * 1000;
      const hintAuditsEl = this.renderAuditGroup(groups['perf-hint'], {expandable: false});
      hintAudits.forEach(item => hintAuditsEl.appendChild(this._renderPerfHintAudit(item, scale)));
      hintAuditsEl.open = true;
      element.appendChild(hintAuditsEl);
    }

    // Diagnostics
    const infoAudits = category.audits
        .filter(audit => audit.group === 'perf-info' && audit.result.score < 1);
    if (infoAudits.length) {
      const infoAuditsEl = this.renderAuditGroup(groups['perf-info'], {expandable: false});
      infoAudits.forEach(item => infoAuditsEl.appendChild(this.renderAudit(item)));
      infoAuditsEl.open = true;
      element.appendChild(infoAuditsEl);
    }

    const passedElements = category.audits
        .filter(audit => (audit.group === 'perf-hint' || audit.group === 'perf-info') &&
            audit.result.score === 1)
        .map(audit => this.renderAudit(audit));

    if (!passedElements.length) return element;

    const passedElem = this.renderPassedAuditsSection(passedElements);
    element.appendChild(passedElem);
    return element;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = PerformanceCategoryRenderer;
} else {
  self.PerformanceCategoryRenderer = PerformanceCategoryRenderer;
}
