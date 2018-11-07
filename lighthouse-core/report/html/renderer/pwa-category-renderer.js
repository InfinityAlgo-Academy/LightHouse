/**
 * @license
 * Copyright 2018 Google Inc. All Rights Reserved.
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

/* globals self, CategoryRenderer */

class PwaCategoryRenderer extends CategoryRenderer {
  /**
   * @param {LH.ReportResult.Category} category
   * @param {Object<string, LH.Result.ReportGroup>} [groupDefinitions]
   * @return {Element}
   */
  render(category, groupDefinitions = {}) {
    const categoryElem = this.dom.createElement('div', 'lh-category');
    this.createPermalinkSpan(categoryElem, category.id);
    categoryElem.appendChild(this.renderCategoryHeader(category));

    const auditRefs = category.auditRefs;

    // Regular audits aren't split up into pass/fail/not-applicable clumps, they're
    // all put in a top-level clump that isn't expandable/collapsable.
    const regularAuditRefs = auditRefs.filter(ref => ref.result.scoreDisplayMode !== 'manual');
    const auditsElem = this.renderUnexpandableClump(regularAuditRefs, groupDefinitions);
    categoryElem.appendChild(auditsElem);

    // Manual audits are still in a manual clump.
    const manualAuditRefs = auditRefs.filter(ref => ref.result.scoreDisplayMode === 'manual');
    const manualElem = this.renderClump('manual',
      {auditRefs: manualAuditRefs, groupDefinitions, description: category.manualDescription});
    categoryElem.appendChild(manualElem);

    return categoryElem;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = PwaCategoryRenderer;
} else {
  self.PwaCategoryRenderer = PwaCategoryRenderer;
}
