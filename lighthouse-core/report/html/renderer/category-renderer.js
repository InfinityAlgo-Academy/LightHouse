/**
 * @license
 * Copyright 2017 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS-IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';

/* globals self, Util */

/** @typedef {import('./dom.js')} DOM */
/** @typedef {import('./report-renderer.js')} ReportRenderer */
/** @typedef {import('./details-renderer.js')} DetailsRenderer */
/** @typedef {import('./util.js')} Util */
/** @typedef {'failed'|'warning'|'manual'|'passed'|'notApplicable'|'changed'} TopLevelClumpId */

class CategoryRenderer {
  /**
   * @param {DOM} dom
   * @param {DetailsRenderer} detailsRenderer
   */
  constructor(dom, detailsRenderer) {
    /** @type {DOM} */
    this.dom = dom;
    /** @type {DetailsRenderer} */
    this.detailsRenderer = detailsRenderer;
    /** @type {ParentNode} */
    this.templateContext = this.dom.document();

    this.detailsRenderer.setTemplateContext(this.templateContext);
  }

  /**
   * Display info per top-level clump. Define on class to avoid race with Util init.
   */
  get _clumpTitles() {
    return {
      warning: Util.UIStrings.warningAuditsGroupTitle,
      manual: Util.UIStrings.manualAuditsGroupTitle,
      passed: Util.UIStrings.passedAuditsGroupTitle,
      notApplicable: Util.UIStrings.notApplicableAuditsGroupTitle,
      changed: 'Changed',
      failed: 'Failed',
    };
  }

  /**
   * @param {LH.ReportResult.AuditRef | LH.ReportResult.AuditRef[]} audit
   * @param {number} index
   * @return {Element}
   */
  renderAudit(audit, index) {
    const tmpl = this.dom.cloneTemplate('#tmpl-lh-audit', this.templateContext);
    return this.populateAuditValues(audit, index, tmpl);
  }

  /**
   * Populate an DOM tree with audit details. Used by renderAudit and renderOpportunity
   * @param {LH.ReportResult.AuditRef | LH.ReportResult.AuditRef[]} audits
   * @param {number} index
   * @param {DocumentFragment} tmpl
   * @return {Element}
   */
  populateAuditValues(audits, index, tmpl) {
    if (!Array.isArray(audits)) audits = [audits];
    const baseAudit = audits[0];
    const isDiff = audits.length > 1;

    const auditEl = this.dom.find('.lh-audit', tmpl);
    auditEl.id = baseAudit.result.id;
    const scoreDisplayMode = baseAudit.result.scoreDisplayMode;

    if (baseAudit.result.displayValue) {
      const displayValue = Util.formatDisplayValue(baseAudit.result.displayValue);
      this.dom.find('.lh-audit__display-text', auditEl).textContent = displayValue;
    }

    const titleEl = this.dom.find('.lh-audit__title', auditEl);
    titleEl.appendChild(this.dom.convertMarkdownCodeSnippets(baseAudit.result.title));
    this.dom.find('.lh-audit__description', auditEl)
        .appendChild(this.dom.convertMarkdownLinkSnippets(baseAudit.result.description));

    const header = /** @type {HTMLDetailsElement} */ (this.dom.find('details', auditEl));
    for (const audit of audits) {
      let elem;
      if (audit.result.details) {
        elem = this.detailsRenderer.render(audit.result.details);
      }

      if (isDiff) {
        // if (!elem) {
        //   elem = this.dom.createElement('div');
        //   elem.textContent = 'No details.';
        // }
        header.appendChild(this._createLetterNode(audits.indexOf(audit)));
        // elem.classList.add('lh-details');
      }

      if (elem) header.appendChild(elem);
    }
    this.dom.find('.lh-audit__index', auditEl).textContent = `${index + 1}`;

    // Add chevron SVG to the end of the summary
    this.dom.find('.lh-chevron-container', auditEl).appendChild(this._createChevron());
    for (const audit of audits) {
      const exists = this.dom.findAll('.lh-audit__score-icons', auditEl).length > 0;
      if (!exists) continue;
      const scoreIcon = this.dom.createElement('div', 'lh-audit__score-icon');
      this._setRatingClass(scoreIcon, audit.result.score, scoreDisplayMode);
      this.dom.find('.lh-audit__score-icons', auditEl).appendChild(scoreIcon);

      // Add an icon to each details' letter node.
      if (isDiff) {
        this.dom.findAll('.lh-letter-node', auditEl)[audits.indexOf(audit)].prepend(scoreIcon.cloneNode());
      }
    }

    for (const audit of audits) {
      if (audit.result.scoreDisplayMode === 'error') {
        auditEl.classList.add(`lh-audit--error`);
        const textEl = this.dom.find('.lh-audit__display-text', auditEl);
        textEl.textContent = Util.UIStrings.errorLabel;
        textEl.classList.add('tooltip-boundary');
        const tooltip = this.dom.createChildOf(textEl, 'div', 'tooltip tooltip--error');
        tooltip.textContent = audit.result.errorMessage || Util.UIStrings.errorMissingAuditInfo;
      } else if (audit.result.explanation) {
        const explEl = this.dom.createChildOf(titleEl, 'div', 'lh-audit-explanation');
        explEl.textContent = audit.result.explanation;
        // hack
        if (isDiff) explEl.textContent = this._createLetterNode(audits.indexOf(audit)).textContent + ': ' + explEl.textContent;
      }
      const warnings = audit.result.warnings;
      if (!warnings || warnings.length === 0) continue;

      // Add list of warnings or singular warning
      const warningsEl = this.dom.createChildOf(titleEl, 'div', 'lh-warnings');
      if (warnings.length === 1) {
        warningsEl.textContent = `${Util.UIStrings.warningHeader} ${warnings.join('')}`;
        if (isDiff) warningsEl.prepend(this._createLetterNode(audits.indexOf(audit)));
      } else {
        warningsEl.textContent = Util.UIStrings.warningHeader;
        const warningsUl = this.dom.createChildOf(warningsEl, 'ul');
        for (const warning of warnings) {
          const item = this.dom.createChildOf(warningsUl, 'li');
          item.textContent = warning;
        }
      }
    }

    return auditEl;
  }

  /**
   * @return {HTMLElement}
   */
  _createChevron() {
    const chevronTmpl = this.dom.cloneTemplate('#tmpl-lh-chevron', this.templateContext);
    const chevronEl = this.dom.find('.lh-chevron', chevronTmpl);
    return chevronEl;
  }

  /**
   * @param {Element} element DOM node to populate with values.
   * @param {number|null} score
   * @param {string} scoreDisplayMode
   * @return {Element}
   */
  _setRatingClass(element, score, scoreDisplayMode) {
    const rating = Util.calculateRating(score, scoreDisplayMode);
    element.classList.add(`lh-audit--${rating}`, `lh-audit--${scoreDisplayMode.toLowerCase()}`);
    return element;
  }

  /**
   * @param {LH.ReportResult.Category} category
   * @param {Record<string, LH.Result.ReportGroup>} groupDefinitions
   * @return {Element}
   */
  renderCategoryHeader(category, groupDefinitions) {
    const tmpl = this.dom.cloneTemplate('#tmpl-lh-category-header', this.templateContext);

    const gaugeContainerEl = this.dom.find('.lh-score__gauge', tmpl);
    const gaugeEl = this.renderScoreGauge(category, groupDefinitions);
    gaugeContainerEl.appendChild(gaugeEl);

    this.dom.find('.lh-category-header__title', tmpl).appendChild(
      this.dom.convertMarkdownCodeSnippets(category.title));
    if (category.description) {
      const descEl = this.dom.convertMarkdownLinkSnippets(category.description);
      this.dom.find('.lh-category-header__description', tmpl).appendChild(descEl);
    }

    return /** @type {Element} */ (tmpl.firstElementChild);
  }

  /**
   * Renders the group container for a group of audits. Individual audit elements can be added
   * directly to the returned element.
   * @param {LH.Result.ReportGroup} group
   * @return {Element}
   */
  renderAuditGroup(group) {
    const groupEl = this.dom.createElement('div', 'lh-audit-group');
    const summaryEl = this.dom.createChildOf(groupEl, 'div');
    const summaryInnerEl = this.dom.createChildOf(summaryEl, 'div', 'lh-audit-group__summary');
    const headerEl = this.dom.createChildOf(summaryInnerEl, 'div', 'lh-audit-group__header');

    if (group.description) {
      const auditGroupDescription = this.dom.createElement('div', 'lh-audit-group__description');
      auditGroupDescription.appendChild(this.dom.convertMarkdownLinkSnippets(group.description));
      groupEl.appendChild(auditGroupDescription);
    }
    headerEl.textContent = group.title;

    return groupEl;
  }

  /**
   * Takes an array of auditRefs, groups them if requested, then returns an
   * array of audit and audit-group elements.
   * @param {Array<LH.ReportResult.AuditRef[]>} auditRefs
   * @param {Object<string, LH.Result.ReportGroup>} groupDefinitions
   * @return {Array<Element>}
   */
  _renderGroupedAudits(auditRefs, groupDefinitions) {
    // Audits grouped by their group (or under notAGroup).
    /** @type {Map<string, Array<LH.ReportResult.AuditRef[]>>} */
    const grouped = new Map();

    // Add audits without a group first so they will appear first.
    const notAGroup = 'NotAGroup';
    grouped.set(notAGroup, []);

    for (const auditRef of auditRefs) {
      const groupId = auditRef[0].group || notAGroup;
      const groupAuditRefs = grouped.get(groupId) || [];
      groupAuditRefs.push(auditRef);
      grouped.set(groupId, groupAuditRefs);
    }

    /** @type {Array<Element>} */
    const auditElements = [];
    // Continuous numbering across all groups.
    let index = 0;

    for (const [groupId, groupAuditRefs] of grouped) {
      if (groupId === notAGroup) {
        // Push not-grouped audits individually.
        for (const auditRef of groupAuditRefs) {
          auditElements.push(this.renderAudit(auditRef, index++));
        }
        continue;
      }

      // Push grouped audits as a group.
      const groupDef = groupDefinitions[groupId];
      const auditGroupElem = this.renderAuditGroup(groupDef);
      for (const auditRef of groupAuditRefs) {
        auditGroupElem.appendChild(this.renderAudit(auditRef, index++));
      }
      auditGroupElem.classList.add(`lh-audit-group--${groupId}`);
      auditElements.push(auditGroupElem);
    }

    return auditElements;
  }

  /**
   * Take a set of audits, group them if they have groups, then render in a top-level
   * clump that can't be expanded/collapsed.
   * @param {Array<LH.ReportResult.AuditRef[]>} auditRefs
   * @param {Object<string, LH.Result.ReportGroup>} groupDefinitions
   * @return {Element}
   */
  renderUnexpandableClump(auditRefs, groupDefinitions) {
    const clumpElement = this.dom.createElement('div');
    const elements = this._renderGroupedAudits(auditRefs, groupDefinitions);
    elements.forEach(elem => clumpElement.appendChild(elem));
    return clumpElement;
  }

  /**
   * Take a set of audits and render in a top-level, expandable clump that starts
   * in a collapsed state.
   * @param {TopLevelClumpId} clumpId
   * @param {{auditRefs: Array<LH.ReportResult.AuditRef | LH.ReportResult.AuditRef[]>, description?: string}} clumpOpts
   * @return {Element}
   */
  renderClump(clumpId, {auditRefs, description}) {
    const clumpTmpl = this.dom.cloneTemplate('#tmpl-lh-clump', this.templateContext);
    const clumpElement = this.dom.find('.lh-clump', clumpTmpl);

    if (clumpId === 'warning' || clumpId === 'changed' || clumpId === 'failed') {
      clumpElement.setAttribute('open', '');
    }

    const summaryInnerEl = this.dom.find('.lh-audit-group__summary', clumpElement);
    const chevronEl = summaryInnerEl.appendChild(this._createChevron());
    chevronEl.title = Util.UIStrings.auditGroupExpandTooltip;

    const headerEl = this.dom.find('.lh-audit-group__header', clumpElement);
    const title = this._clumpTitles[clumpId];
    headerEl.textContent = title;
    if (description) {
      const markdownDescriptionEl = this.dom.convertMarkdownLinkSnippets(description);
      const auditGroupDescription = this.dom.createElement('div', 'lh-audit-group__description');
      auditGroupDescription.appendChild(markdownDescriptionEl);
      clumpElement.appendChild(auditGroupDescription);
    }

    const itemCountEl = this.dom.find('.lh-audit-group__itemcount', clumpElement);
    // TODO(i18n): support multiple locales here
    itemCountEl.textContent = `${auditRefs.length} audits`;

    // Add all audit results to the clump.
    const auditElements = auditRefs.map(this.renderAudit.bind(this));
    clumpElement.append(...auditElements);

    clumpElement.classList.add(`lh-clump--${clumpId.toLowerCase()}`);
    return clumpElement;
  }

  /**
   * @param {ParentNode} context
   */
  setTemplateContext(context) {
    this.templateContext = context;
    this.detailsRenderer.setTemplateContext(context);
  }

  /**
   * @param {LH.ReportResult.Category} category
   * @param {Record<string, LH.Result.ReportGroup>} groupDefinitions
   * @return {DocumentFragment}
   */
  renderScoreGauge(category, groupDefinitions) { // eslint-disable-line no-unused-vars
    const tmpl = this.dom.cloneTemplate('#tmpl-lh-gauge', this.templateContext);
    const wrapper = /** @type {HTMLAnchorElement} */ (this.dom.find('.lh-gauge__wrapper', tmpl));
    wrapper.href = `#${category.id}`;
    wrapper.classList.add(`lh-gauge__wrapper--${Util.calculateRating(category.score)}`);

    // Cast `null` to 0
    const numericScore = Number(category.score);
    const gauge = this.dom.find('.lh-gauge', tmpl);
    // 329 is ~= 2 * Math.PI * gauge radius (53)
    // https://codepen.io/xgad/post/svg-radial-progress-meters
    // score of 50: `stroke-dasharray: 164.5 329`;
    /** @type {?SVGCircleElement} */
    const gaugeArc = gauge.querySelector('.lh-gauge-arc');
    if (gaugeArc) {
      gaugeArc.style.strokeDasharray = `${numericScore * 329} 329`;
    }

    const scoreOutOf100 = Math.round(numericScore * 100);
    const percentageEl = this.dom.find('.lh-gauge__percentage', tmpl);
    percentageEl.textContent = scoreOutOf100.toString();
    if (category.score === null) {
      percentageEl.textContent = '?';
      percentageEl.title = Util.UIStrings.errorLabel;
    }

    this.dom.find('.lh-gauge__label', tmpl).textContent = category.title;
    return tmpl;
  }

  /**
   * @param {LH.ReportResult.AuditRef} audit
   * @return {boolean}
   */
  _auditHasWarning(audit) {
    return Boolean(audit.result.warnings && audit.result.warnings.length);
  }

  /**
   * Returns the id of the top-level clump to put this audit in.
   * @param {LH.ReportResult.AuditRef} auditRef
   * @return {TopLevelClumpId}
   */
  _getClumpIdForAuditRef(auditRef) {
    const scoreDisplayMode = auditRef.result.scoreDisplayMode;
    if (scoreDisplayMode === 'manual' || scoreDisplayMode === 'notApplicable') {
      return scoreDisplayMode;
    }

    if (Util.showAsPassed(auditRef.result)) {
      if (this._auditHasWarning(auditRef)) {
        return 'warning';
      } else {
        return 'passed';
      }
    } else {
      return 'failed';
    }
  }

  /**
   * Renders a set of top level sections (clumps), under a status of failed, warning,
   * manual, passed, or notApplicable. The result ends up something like:
   *
   * failed clump
   *   ├── audit 1 (w/o group)
   *   ├── audit 2 (w/o group)
   *   ├── audit group
   *   |  ├── audit 3
   *   |  └── audit 4
   *   └── audit group
   *      ├── audit 5
   *      └── audit 6
   * other clump (e.g. 'manual')
   *   ├── audit 1
   *   ├── audit 2
   *   ├── …
   *   ⋮
   * @param {LH.ReportResult.Category} category
   * @param {Object<string, LH.Result.ReportGroup>} [groupDefinitions]
   * @return {Element}
   */
  render(category, groupDefinitions = {}) {
    const element = this.dom.createElement('div', 'lh-category');
    this.createPermalinkSpan(element, category.id);
    element.appendChild(this.renderCategoryHeader(category, groupDefinitions));

    // Top level clumps for audits, in order they will appear in the report.
    /** @type {Map<TopLevelClumpId, Array<LH.ReportResult.AuditRef>>} */
    const clumps = new Map();
    clumps.set('failed', []);
    clumps.set('warning', []);
    clumps.set('manual', []);
    clumps.set('passed', []);
    clumps.set('notApplicable', []);

    // Sort audits into clumps.
    for (const auditRef of category.auditRefs) {
      const clumpId = this._getClumpIdForAuditRef(auditRef);
      const clump = /** @type {Array<LH.ReportResult.AuditRef>} */ (clumps.get(clumpId)); // already defined
      clump.push(auditRef);
      clumps.set(clumpId, clump);
    }

    // Render each clump.
    for (const [clumpId, auditRefs] of clumps) {
      if (auditRefs.length === 0) continue;
      const auditRefsCoercedToSingleItemArray = auditRefs.map(auditRef => [auditRef]);

      if (clumpId === 'failed') {
        const clumpElem = this.renderUnexpandableClump(auditRefsCoercedToSingleItemArray, groupDefinitions);
        clumpElem.classList.add(`lh-clump--failed`);
        element.appendChild(clumpElem);
        continue;
      }

      const description = clumpId === 'manual' ? category.manualDescription : undefined;
      const clumpElem = this.renderClump(clumpId, {auditRefs: auditRefsCoercedToSingleItemArray, description});
      element.appendChild(clumpElem);
    }

    return element;
  }

  /**
   * @param {Array<LH.ReportResult.Category>} allCategory
   * @param {Array<Object<string, LH.Result.ReportGroup>>} allGroupDefinitions
   * @return {Element}
   */
  renderDiff(allCategory, allGroupDefinitions) {
    const baseCategory = allCategory[0];
    const baseGroupDefinitions = allGroupDefinitions[0];

    const element = this.dom.createElement('div', 'lh-category');
    this.createPermalinkSpan(element, baseCategory.id);
    element.appendChild(this.renderCategoryHeader(baseCategory, baseGroupDefinitions));

    // const idx = baseCategory.auditRefs.findIndex(a => a.id === 'html-has-lang');
    // console.log(allCategory[0].auditRefs[idx],
    //   allCategory[1].auditRefs[idx],)
    // element.append(this.renderAuditDiff([
    //   allCategory[0].auditRefs[idx],
    //   allCategory[1].auditRefs[idx],
    // ], idx));

    // return element;

    if (allCategory.length >= 2) {
      // Top level clumps for audits, in order they will appear in the report.
      /** @type {Map<TopLevelClumpId, Array<LH.ReportResult.AuditRef[]>>} */
      const clumps = new Map();
      clumps.set('changed', []);
      clumps.set('failed', []);
      clumps.set('passed', []);

      /** @type {Map<string, Array<LH.ReportResult.AuditRef>>} */
      const auditRefsGroupedById = new Map();
      for (const category of allCategory) {
        for (const auditRef of category.auditRefs) {
          const auditRefs = auditRefsGroupedById.get(auditRef.id) || [];
          auditRefs.push(auditRef);
          auditRefsGroupedById.set(auditRef.id, auditRefs);
        }
      }

      // Sort audits into clumps.
      for (const [id, auditRefs] of auditRefsGroupedById) {
        let allPassed = true;
        let allFailed = true;
        let na = false;
        for (const auditRef of auditRefs) {
          const clumpId = this._getClumpIdForAuditRef(auditRef);
          if (clumpId === 'passed') {
            allFailed = false;
          } else if (clumpId === 'failed') {
            allPassed = false;
          } else {
            na = true;
          }
        }

        if (na) continue;
        /** @type {TopLevelClumpId} */
        let clumpId = 'changed';
        if (allPassed) clumpId = 'passed';
        if (allFailed) clumpId = 'failed';

        const clump = /** @type {Array<LH.ReportResult.AuditRef[]>} */ (clumps.get(clumpId)); // already defined
        clump.push(auditRefs);
        clumps.set(clumpId, clump);
      }

      // Render each clump.
      for (const [clumpId, auditRefs] of clumps) {
        if (auditRefs.length === 0) continue;

        // if (clumpId === 'failed') {
        //   const clumpElem = this.renderUnexpandableClump(auditRefs, baseGroupDefinitions);
        //   clumpElem.classList.add(`lh-clump--failed`);
        //   element.appendChild(clumpElem);
        //   continue;
        // }

        const description = clumpId === 'manual' ? baseCategory.manualDescription : undefined;
        const clumpElem = this.renderClump(clumpId, {auditRefs, description});
        element.appendChild(clumpElem);
      }
    } else if (allCategory.length > 2) {
      // ...
    }

    return element;
  }

  /**
   * Create a non-semantic span used for hash navigation of categories
   * @param {Element} element
   * @param {string} id
   */
  createPermalinkSpan(element, id) {
    const permalinkEl = this.dom.createChildOf(element, 'span', 'lh-permalink');
    permalinkEl.id = id;
  }

  /**
   * @param {number} index
   */
  _createLetterNode(index) {
    // TODO add hover text for URL.
    const letter = this.dom.createElement('text', 'lh-letter-node');
    letter.textContent = String.fromCharCode('A'.charCodeAt(0) + index);
    letter.style.backgroundColor = this._getLetterColor(index);
    return letter;
  }

  /**
   * @param {number} index
   */
  _getLetterColor(index) {
    // colors from https://stackoverflow.com/a/31817723
    const colors = ['#00b016', '#0013cd', '#d6d40a', '#d900b5', '#e02800', '#69ee00', '#c27e00', '#7900a8', '#008fda', '#00db53', '#3f00c8', '#dd004e', '#9c0008', '#9c00e0', '#c3007f'];
    if (index < colors.length) return colors[index];
    return '';
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = CategoryRenderer;
} else {
  self.CategoryRenderer = CategoryRenderer;
}
