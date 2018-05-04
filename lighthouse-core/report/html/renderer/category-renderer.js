/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* globals self, Util */

class CategoryRenderer {
  /**
   * @param {!DOM} dom
   * @param {!DetailsRenderer} detailsRenderer
   */
  constructor(dom, detailsRenderer) {
    /** @protected {!DOM} */
    this.dom = dom;
    /** @protected {!DetailsRenderer} */
    this.detailsRenderer = detailsRenderer;
    /** @protected {!Document|!Element} */
    this.templateContext = this.dom.document();

    this.detailsRenderer.setTemplateContext(this.templateContext);
  }

  /**
   * @param {!ReportRenderer.AuditJSON} audit
   * @param {number} index
   * @return {!Element}
   */
  renderAudit(audit, index) {
    const tmpl = this.dom.cloneTemplate('#tmpl-lh-audit', this.templateContext);
    const auditEl = this.dom.find('.lh-audit', tmpl);
    auditEl.id = audit.result.name;
    const scoreDisplayMode = audit.result.scoreDisplayMode;

    if (audit.result.displayValue) {
      const displayValue = Util.formatDisplayValue(audit.result.displayValue);
      this.dom.find('.lh-audit__display-text', auditEl).textContent = displayValue;
    }

    this.dom.find('.lh-audit__title', auditEl).appendChild(
      this.dom.convertMarkdownCodeSnippets(audit.result.description));
    this.dom.find('.lh-audit__description', auditEl)
      .appendChild(this.dom.convertMarkdownLinkSnippets(audit.result.helpText));

    // Append audit details to header section so the entire audit is within a <details>.
    const header = /** @type {!HTMLDetailsElement} */ (this.dom.find('details', auditEl));
    if (audit.result.details && audit.result.details.type) {
      header.appendChild(this.detailsRenderer.render(audit.result.details));
    }

    auditEl.classList.add(`lh-audit--${audit.result.scoreDisplayMode}`);

    this.dom.find('.lh-audit__index', auditEl).textContent = `${index + 1}`;

    this._setRatingClass(auditEl, audit.result.score, scoreDisplayMode, audit.result.error);

    if (audit.result.error) {
      auditEl.classList.add(`lh-audit--error`);
      const textEl = this.dom.find('.lh-audit__display-text', auditEl);
      textEl.textContent = 'Error!';
      textEl.classList.add('tooltip-boundary');
      const tooltip = this.dom.createChildOf(textEl, 'div', 'lh-error-tooltip-content tooltip');
      tooltip.textContent = audit.result.debugString || 'Report error: no audit information';
    } else if (audit.result.debugString) {
      const debugStrEl = auditEl.appendChild(this.dom.createElement('div', 'lh-debug'));
      debugStrEl.textContent = audit.result.debugString;
    }
    return auditEl;
  }

  /**
   * @param {!Element} element DOM node to populate with values.
   * @param {number} score
   * @param {string} scoreDisplayMode
   * @param {boolean} isError
   * @return {!Element}
   */
  _setRatingClass(element, score, scoreDisplayMode, isError) {
    // FIXME(paulirish): this'll have to deal with null scores and scoreDisplayMode stuff..
    const rating = isError ? 'error' : Util.calculateRating(score);
    element.classList.add(`lh-audit--${rating}`,
        `lh-audit--${scoreDisplayMode}`);
    return element;
  }

  /**
   * @param {!ReportRenderer.CategoryJSON} category
   * @return {!Element}
   */
  renderCategoryScore(category) {
    const tmpl = this.dom.cloneTemplate('#tmpl-lh-category-header', this.templateContext);

    const gaugeContainerEl = this.dom.find('.lh-score__gauge', tmpl);
    const gaugeEl = this.renderScoreGauge(category);
    gaugeContainerEl.appendChild(gaugeEl);

    this.dom.find('.lh-category-header__title', tmpl).appendChild(
      this.dom.convertMarkdownCodeSnippets(category.name));
    this.dom.find('.lh-category-header__description', tmpl)
      .appendChild(this.dom.convertMarkdownLinkSnippets(category.description));

    return /** @type {!Element} */ (tmpl.firstElementChild);
  }

  /**
   * Renders the group container for a group of audits. Individual audit elements can be added
   * directly to the returned element.
   * @param {!ReportRenderer.GroupJSON} group
   * @param {{expandable: boolean, itemCount: (number|undefined)}} opts
   * @return {!Element}
   */
  renderAuditGroup(group, opts) {
    const expandable = opts.expandable;
    const groupEl = this.dom.createElement(expandable ? 'details' : 'div', 'lh-audit-group');
    const summmaryEl = this.dom.createChildOf(groupEl, 'summary', 'lh-audit-group__summary');
    const headerEl = this.dom.createChildOf(summmaryEl, 'div', 'lh-audit-group__header');
    const itemCountEl = this.dom.createChildOf(summmaryEl, 'div', 'lh-audit-group__itemcount');
    this.dom.createChildOf(summmaryEl, 'div',
      `lh-toggle-arrow  ${expandable ? '' : ' lh-toggle-arrow-unexpandable'}`, {
        title: 'Show audits',
      });

    if (group.description) {
      const auditGroupDescription = this.dom.createElement('div', 'lh-audit-group__description');
      auditGroupDescription.appendChild(this.dom.convertMarkdownLinkSnippets(group.description));
      groupEl.appendChild(auditGroupDescription);
    }
    headerEl.textContent = group.title;

    if (opts.itemCount) {
      itemCountEl.textContent = `${opts.itemCount} audits`;
    }
    return groupEl;
  }

  /**
   * Find the total number of audits contained within a section.
   * Accounts for nested subsections like Accessibility.
   * @param {!Array<!Element>} elements
   * @return {number}
   */
  _getTotalAuditsLength(elements) {
    // Create a scratch element to append sections to so we can reuse querySelectorAll().
    const scratch = this.dom.createElement('div');
    elements.forEach(function(element) {
      scratch.appendChild(element);
    });
    const subAudits = scratch.querySelectorAll('.lh-audit');
    if (subAudits.length) {
      return subAudits.length;
    } else {
      return elements.length;
    }
  }

  /**
   * @param {!Array<!Element>} elements
   * @return {!Element}
   */
  _renderFailedAuditsSection(elements) {
    const failedElem = this.renderAuditGroup({
      title: `Failed audits`,
    }, {expandable: false, itemCount: this._getTotalAuditsLength(elements)});
    failedElem.classList.add('lh-failed-audits');
    elements.forEach(elem => failedElem.appendChild(elem));
    return failedElem;
  }

  /**
   * @param {!Array<!Element>} elements
   * @return {!Element}
   */
  renderPassedAuditsSection(elements) {
    const passedElem = this.renderAuditGroup({
      title: `Passed audits`,
    }, {expandable: true, itemCount: this._getTotalAuditsLength(elements)});
    passedElem.classList.add('lh-passed-audits');
    elements.forEach(elem => passedElem.appendChild(elem));
    return passedElem;
  }

  /**
   * @param {!Array<!Element>} elements
   * @return {!Element}
   */
  _renderNotApplicableAuditsSection(elements) {
    const notApplicableElem = this.renderAuditGroup({
      title: `Not applicable`,
    }, {expandable: true, itemCount: this._getTotalAuditsLength(elements)});
    notApplicableElem.classList.add('lh-audit-group--notapplicable');
    elements.forEach(elem => notApplicableElem.appendChild(elem));
    return notApplicableElem;
  }

  /**
   * @param {!Array<!ReportRenderer.AuditJSON>} manualAudits
   * @param {string} manualDescription
   * @return {!Element}
   */
  _renderManualAudits(manualAudits, manualDescription) {
    const group = {title: 'Additional items to manually check', description: manualDescription};
    const auditGroupElem = this.renderAuditGroup(group,
        {expandable: true, itemCount: manualAudits.length});
    auditGroupElem.classList.add('lh-audit-group--manual');
    manualAudits.forEach((audit, i) => {
      auditGroupElem.appendChild(this.renderAudit(audit, i));
    });
    return auditGroupElem;
  }

  /**
   * @param {!Document|!Element} context
   */
  setTemplateContext(context) {
    this.templateContext = context;
    this.detailsRenderer.setTemplateContext(context);
  }

  /**
   * @param {!ReportRenderer.CategoryJSON} category
   * @return {!DocumentFragment}
   */
  renderScoreGauge(category) {
    const tmpl = this.dom.cloneTemplate('#tmpl-lh-gauge', this.templateContext);
    const wrapper = this.dom.find('.lh-gauge__wrapper', tmpl);
    wrapper.href = `#${category.id}`;
    wrapper.classList.add(`lh-gauge__wrapper--${Util.calculateRating(category.score)}`);

    const gauge = this.dom.find('.lh-gauge', tmpl);
    // 329 is ~= 2 * Math.PI * gauge radius (53)
    // https://codepen.io/xgad/post/svg-radial-progress-meters
    // score of 50: `stroke-dasharray: 164.5 329`;
    this.dom.find('.lh-gauge-arc', gauge).style.strokeDasharray = `${category.score * 329} 329`;

    const scoreOutOf100 = Math.round(category.score * 100);
    this.dom.find('.lh-gauge__percentage', tmpl).textContent = scoreOutOf100;
    this.dom.find('.lh-gauge__label', tmpl).textContent = category.name;
    return tmpl;
  }

  /**
   * @param {!ReportRenderer.CategoryJSON} category
   * @param {!Object<string, !ReportRenderer.GroupJSON>} groupDefinitions
   * @return {!Element}
   */
  render(category, groupDefinitions) {
    const element = this.dom.createElement('div', 'lh-category');
    this.createPermalinkSpan(element, category.id);
    element.appendChild(this.renderCategoryScore(category));

    const manualAudits = category.audits.filter(item => item.result.scoreDisplayMode === 'manual');
    const nonManualAudits = category.audits.filter(audit => !manualAudits.includes(audit));

    const auditsGroupedByGroup = /** @type {!Object<string,
      {passed: !Array<!ReportRenderer.AuditJSON>,
      failed: !Array<!ReportRenderer.AuditJSON>,
      notApplicable: !Array<!ReportRenderer.AuditJSON>}>} */ ({});
    const auditsUngrouped = {passed: [], failed: [], notApplicable: []};

    nonManualAudits.forEach(audit => {
      let group;

      if (audit.group) {
        const groupId = audit.group;

        if (auditsGroupedByGroup[groupId]) {
          group = auditsGroupedByGroup[groupId];
        } else {
          group = {passed: [], failed: [], notApplicable: []};
          auditsGroupedByGroup[groupId] = group;
        }
      } else {
        group = auditsUngrouped;
      }

      if (audit.result.scoreDisplayMode === 'not-applicable') {
        group.notApplicable.push(audit);
      } else if (audit.result.score === 1 && !audit.result.debugString) {
        group.passed.push(audit);
      } else {
        group.failed.push(audit);
      }
    });

    const failedElements = /** @type {!Array<!Element>} */ ([]);
    const passedElements = /** @type {!Array<!Element>} */ ([]);
    const notApplicableElements = /** @type {!Array<!Element>} */ ([]);

    auditsUngrouped.failed.forEach((/** @type {!ReportRenderer.AuditJSON} */ audit, i) =>
      failedElements.push(this.renderAudit(audit, i)));
    auditsUngrouped.passed.forEach((/** @type {!ReportRenderer.AuditJSON} */ audit, i) =>
      passedElements.push(this.renderAudit(audit, i)));
    auditsUngrouped.notApplicable.forEach((/** @type {!ReportRenderer.AuditJSON} */ audit, i) =>
      notApplicableElements.push(this.renderAudit(audit, i)));

    let hasFailedGroups = false;

    Object.keys(auditsGroupedByGroup).forEach(groupId => {
      const group = groupDefinitions[groupId];
      const groups = auditsGroupedByGroup[groupId];

      if (groups.failed.length) {
        const auditGroupElem = this.renderAuditGroup(group, {expandable: false});
        groups.failed.forEach((item, i) => auditGroupElem.appendChild(this.renderAudit(item, i)));
        auditGroupElem.open = true;
        failedElements.push(auditGroupElem);

        hasFailedGroups = true;
      }

      if (groups.passed.length) {
        const auditGroupElem = this.renderAuditGroup(group, {expandable: true});
        groups.passed.forEach((item, i) => auditGroupElem.appendChild(this.renderAudit(item, i)));
        passedElements.push(auditGroupElem);
      }

      if (groups.notApplicable.length) {
        const auditGroupElem = this.renderAuditGroup(group, {expandable: true});
        groups.notApplicable.forEach((item, i) =>
            auditGroupElem.appendChild(this.renderAudit(item, i)));
        notApplicableElements.push(auditGroupElem);
      }
    });

    if (failedElements.length) {
      // if failed audits are grouped skip the 'X Failed Audits' header
      if (hasFailedGroups) {
        failedElements.forEach(elem => element.appendChild(elem));
      } else {
        const failedElem = this._renderFailedAuditsSection(failedElements);
        element.appendChild(failedElem);
      }
    }

    if (manualAudits.length) {
      const manualEl = this._renderManualAudits(manualAudits, category.manualDescription);
      element.appendChild(manualEl);
    }

    if (passedElements.length) {
      const passedElem = this.renderPassedAuditsSection(passedElements);
      element.appendChild(passedElem);
    }

    if (notApplicableElements.length) {
      const notApplicableElem = this._renderNotApplicableAuditsSection(notApplicableElements);
      element.appendChild(notApplicableElem);
    }

    return element;
  }

  /**
   * Create a non-semantic span used for hash navigation of categories
   * @param {!Element} element
   * @param {string} id
   */
  createPermalinkSpan(element, id) {
    const permalinkEl = this.dom.createChildOf(element, 'span', 'lh-permalink');
    permalinkEl.id = id;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = CategoryRenderer;
} else {
  self.CategoryRenderer = CategoryRenderer;
}
