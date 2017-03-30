/**
 * Copyright 2017 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';

/* eslint-env browser */
/* global Polymer */

const RATINGS = {
  GOOD: {label: 'good', minScore: 75},
  AVERAGE: {label: 'average', minScore: 45},
  POOR: {label: 'failed'}
};

/**
 * Convert a score to a rating label.
 * @param {number} value
 * @return {string}
 */
function calculateRating(value) {
  let rating = RATINGS.POOR.label;
  if (value >= RATINGS.GOOD.minScore) {
    rating = RATINGS.GOOD.label;
  } else if (value >= RATINGS.AVERAGE.minScore) {
    rating = RATINGS.AVERAGE.label;
  }
  return rating;
}

const ElementHelpers = {
  formatScore(score) {
    return score.toLocaleString(undefined, {maximumFractionDigits: 1});
  },
  addScoreFailedClass(score) {
    return `lighthouse-score__value--${calculateRating(score)}`;
  },
  equal(a, b) {
    return a === b;
  }
};

/**
 * @fileoverview The entry point for rendering the Lighthouse report based on the JSON output.
 *    This file is injected into the report HTML along with the JSON report.
 *
 * Dummy text for ensuring report robustness: </script> pre$`post %%LIGHTHOUSE_JSON%%
 */
window.ReportRenderer = class ReportRenderer {
  /**
   * @param {!Element} element
   */
  constructor(element) {
    this._element = element;
    this._element.formatScore = ElementHelpers.formatScore;
    this._element.addScoreFailedClass = ElementHelpers.addScoreFailedClass;
    this._element.equal = ElementHelpers.equal;
  }

  /**
   * @param {!Object} report Lighthouse report json.
   */
  render(report) {
    this._report = report;
    this._element.report = this._report;
  }
};

class LighthouseCards extends Polymer.Element {
  static get is() {
    return 'lighthouse-cards';
  }
  // constructor() {
  //   super();
  // }
  // _attachDom(dom) {
  //   this.appendChild(dom); // Render to the light instead of the shadows.
  // }
}
window.customElements.define(LighthouseCards.is, LighthouseCards);

