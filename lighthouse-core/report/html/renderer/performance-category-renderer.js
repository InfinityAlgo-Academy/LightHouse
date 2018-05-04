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
    const tmpl = this.dom.cloneTemplate('#tmpl-lh-metric', this.templateContext);
    const element = this.dom.find('.lh-metric', tmpl);
    element.id = audit.result.name;
    // FIXME(paulirish): currently this sets a 'lh-metric--fail' class on error'd audits
    element.classList.add(`lh-metric--${Util.calculateRating(audit.result.score)}`);

    const titleEl = this.dom.find('.lh-metric__title', tmpl);
    titleEl.textContent = audit.result.description;

    const valueEl = this.dom.find('.lh-metric__value', tmpl);
    valueEl.textContent = Util.formatDisplayValue(audit.result.displayValue);

    const descriptionEl = this.dom.find('.lh-metric__description', tmpl);
    descriptionEl.appendChild(this.dom.convertMarkdownLinkSnippets(audit.result.helpText));

    if (audit.result.error) {
      element.classList.remove(`lh-metric--fail`);
      element.classList.add(`lh-metric--error`);
      descriptionEl.textContent = '';
      valueEl.textContent = 'Error!';
      const tooltip = this.dom.createChildOf(descriptionEl, 'span', 'lh-error-tooltip-content');
      tooltip.textContent = audit.result.debugString || 'Report error: no metric information';
    }

    return element;
  }

  /**
   * @param {!ReportRenderer.AuditJSON} audit
   * @param {number} index
   * @param {number} scale
   * @return {!Element}
   */
  _renderOpportunity(audit, index, scale) {
    const tmpl = this.dom.cloneTemplate('#tmpl-lh-opportunity', this.templateContext);
    const element = this.dom.find('.lh-load-opportunity', tmpl);
    element.classList.add(`lh-load-opportunity--${Util.calculateRating(audit.result.score)}`);
    element.id = audit.result.name;

    const summary = this.dom.find('.lh-load-opportunity__summary', tmpl);
    const titleEl = this.dom.find('.lh-load-opportunity__title', tmpl);
    titleEl.textContent = audit.result.description;
    this.dom.find('.lh-audit__index', element).textContent = `${index + 1}`;

    if (audit.result.debugString || audit.result.error) {
      const debugStrEl = this.dom.createChildOf(summary, 'div', 'lh-debug');
      debugStrEl.textContent = audit.result.debugString || 'Audit error';
    }
    if (audit.result.error) return element;

    const details = audit.result.details;
    const summaryInfo = /** @type {!DetailsRenderer.OpportunitySummary}
    */ (details && details.summary);
    if (!summaryInfo || !summaryInfo.wastedMs) {
      return element;
    }

    const displayValue = Util.formatDisplayValue(audit.result.displayValue);
    const sparklineWidthPct = `${summaryInfo.wastedMs / scale * 100}%`;
    const wastedMs = Util.formatSeconds(summaryInfo.wastedMs, 0.01);
    const auditDescription = this.dom.convertMarkdownLinkSnippets(audit.result.helpText);
    this.dom.find('.lh-load-opportunity__sparkline', tmpl).title = displayValue;
    this.dom.find('.lh-load-opportunity__wasted-stat', tmpl).title = displayValue;
    this.dom.find('.lh-sparkline__bar', tmpl).style.width = sparklineWidthPct;
    this.dom.find('.lh-load-opportunity__wasted-stat', tmpl).textContent = wastedMs;
    this.dom.find('.lh-load-opportunity__description', tmpl).appendChild(auditDescription);

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

    const metricAudits = category.audits.filter(audit => audit.group === 'metrics');
    const metricAuditsEl = this.renderAuditGroup(groups['metrics'], {expandable: false});

    // Metrics
    const keyMetrics = metricAudits.filter(a => a.weight >= 3);
    const otherMetrics = metricAudits.filter(a => a.weight < 3);

    const metricsBoxesEl = this.dom.createChildOf(metricAuditsEl, 'div', 'lh-metric-container');
    const metricsColumn1El = this.dom.createChildOf(metricsBoxesEl, 'div', 'lh-metric-column');
    const metricsColumn2El = this.dom.createChildOf(metricsBoxesEl, 'div', 'lh-metric-column');

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
    const opportunityAudits = category.audits
        .filter(audit => audit.group === 'load-opportunities' && audit.result.score < 1)
        .sort((auditA, auditB) => auditB.result.rawValue - auditA.result.rawValue);
    if (opportunityAudits.length) {
      const maxWaste = Math.max(...opportunityAudits.map(audit => audit.result.rawValue));
      const scale = Math.ceil(maxWaste / 1000) * 1000;
      const groupEl = this.renderAuditGroup(groups['load-opportunities'], {expandable: false});
      const tmpl = this.dom.cloneTemplate('#tmpl-lh-opportunity-header', this.templateContext);
      const headerEl = this.dom.find('.lh-load-opportunity__header', tmpl);
      groupEl.appendChild(headerEl);
      opportunityAudits.forEach((item, i) =>
          groupEl.appendChild(this._renderOpportunity(item, i, scale)));
      groupEl.open = true;
      element.appendChild(groupEl);
    }

    // Diagnostics
    const diagnosticAudits = category.audits
        .filter(audit => audit.group === 'diagnostics' && audit.result.score < 1)
        .sort((a, b) => {
          const scoreA = a.result.scoreDisplayMode === 'informative' ? 100 : a.result.score;
          const scoreB = b.result.scoreDisplayMode === 'informative' ? 100 : b.result.score;
          return scoreA - scoreB;
        });

    if (diagnosticAudits.length) {
      const groupEl = this.renderAuditGroup(groups['diagnostics'], {expandable: false});
      diagnosticAudits.forEach((item, i) => groupEl.appendChild(this.renderAudit(item, i)));
      groupEl.open = true;
      element.appendChild(groupEl);
    }

    const passedElements = category.audits
        .filter(audit => (audit.group === 'load-opportunities' || audit.group === 'diagnostics') &&
            audit.result.score === 1)
        .map((audit, i) => this.renderAudit(audit, i));

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
