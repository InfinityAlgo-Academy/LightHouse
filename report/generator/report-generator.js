/**
 * @license Copyright 2017 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const htmlReportAssets = require('./report-assets.js');


/** @typedef {import('../../types/lhr/lhr').default} LHResult */
/** @typedef {import('../../types/lhr/flow').default} FlowResult */

class ReportGenerator {
  /**
   * Replaces all the specified strings in source without serial replacements.
   * @param {string} source
   * @param {!Array<{search: string, replacement: string}>} replacements
   * @return {string}
   */
  static replaceStrings(source, replacements) {
    if (replacements.length === 0) {
      return source;
    }

    const firstReplacement = replacements[0];
    const nextReplacements = replacements.slice(1);
    return source
        .split(firstReplacement.search)
        .map(part => ReportGenerator.replaceStrings(part, nextReplacements))
        .join(firstReplacement.replacement);
  }

  /**
   * @param {unknown} object
   * @return {string}
   */
  static sanitizeJson(object) {
    return JSON.stringify(object)
    .replace(/</g, '\\u003c') // replaces opening script tags
    .replace(/\u2028/g, '\\u2028') // replaces line separators ()
    .replace(/\u2029/g, '\\u2029'); // replaces paragraph separators
  }

  /**
   * Returns the standalone report HTML as a string with the report JSON and renderer JS inlined.
   * @param {LHResult} lhr
   * @return {string}
   */
  static async generateReportHtml(lhr) {
    const comp = await import('../renderer/components.js');
    let reportJs = [

      `

const ELLIPSIS = '\u2026';
const NBSP = '\xa0';
const PASS_THRESHOLD = 0.9;
const SCREENSHOT_PREFIX = 'data:image/jpeg;base64,';

const RATINGS = {
  PASS: {label: 'pass', minScore: PASS_THRESHOLD},
  AVERAGE: {label: 'average', minScore: 0.5},
  FAIL: {label: 'fail'},
  ERROR: {label: 'error'},
};

// 25 most used tld plus one domains (aka public suffixes) from http archive.
// @see https://github.com/GoogleChrome/lighthouse/pull/5065#discussion_r191926212
// The canonical list is https://publicsuffix.org/learn/ but we're only using subset to conserve bytes
const listOfTlds = [
  'com', 'co', 'gov', 'edu', 'ac', 'org', 'go', 'gob', 'or', 'net', 'in', 'ne', 'nic', 'gouv',
  'web', 'spb', 'blog', 'jus', 'kiev', 'mil', 'wi', 'qc', 'ca', 'bel', 'on',
];

const URL_PREFIXES = ['http://', 'https://', 'data:'];

      `,

      (await import('../renderer/i18n.js')).I18n.toString(), // DOM
      (await import('../renderer/util.js')).Util.toString(), // DOM
      (await import('../renderer/dom.js')).DOM.toString(), // DOM
      ...comp.fns.map(fn => fn.toString()), // DOM
      comp.createComponent.toString(), // DOM
      (await import('../renderer/report-renderer.js')).ReportRenderer.toString(), // ReportRenderer
      (await import('../renderer/report-ui-features.js')).ReportUIFeatures.toString(), // ReportUIFeatures
      (await import('../renderer/category-renderer.js')).CategoryRenderer.toString(), // CategoryRenderer
      (await import('../renderer/performance-category-renderer.js')).PerformanceCategoryRenderer.toString(), // CategoryRenderer
      (await import('../renderer/pwa-category-renderer.js')).PwaCategoryRenderer.toString(), // CategoryRenderer
      (await import('../renderer/details-renderer.js')).DetailsRenderer.toString(), // DetailsRenderer
      (await import('../renderer/element-screenshot-renderer.js')).ElementScreenshotRenderer.toString(), // DetailsRenderer
      (await import('../renderer/crc-details-renderer.js')).CriticalRequestChainRenderer.toString(), // DetailsRenderer
      (await import('../renderer/topbar-features.js')).TopbarFeatures.toString(), // DetailsRenderer
      (await import('../renderer/drop-down-menu.js')).DropDownMenu.toString(), // DetailsRenderer
      //  (await import('../renderer/details-renderer.js')).DetailsRenderer.toString(), // DetailsRenderer
      (await import('../renderer/api.js')).renderReport.toString(), // DetailsRenderer


      `

      function getTableRows(tableEl) {
        return Array.from(tableEl.tBodies[0].rows);
      }

      const NBSP2 = '\xa0';
      const KiB = 1024;
      const MiB = KiB * KiB;

      const CRCRenderer = CriticalRequestChainRenderer;

      function toggleDarkTheme(dom, force) {
        const el = dom.rootEl;
        // This seems unnecessary, but in DevTools, passing "undefined" as the second
        // parameter acts like passing "false".
        // https://github.com/ChromeDevTools/devtools-frontend/blob/dd6a6d4153647c2a4203c327c595692c5e0a4256/front_end/dom_extension/DOMExtension.js#L809-L819
        if (typeof force === 'undefined') {
          el.classList.toggle('lh-dark');
        } else {
          el.classList.toggle('lh-dark', force);
        }
      }


      Util.getUniqueSuffix = (() => {
        let svgSuffix = 0;
        return function() {
          return svgSuffix++;
        };
      })();

    `,

    ].join(';\n');

    reportJs += `
function __initLighthouseReport__() {
  /** @type {LH.Result} */
  // @ts-expect-error
  const lhr = window.__LIGHTHOUSE_JSON__;

  const reportRootEl = renderReport(lhr);
  document.body.append(reportRootEl);
}

// @ts-expect-error
window.__initLighthouseReport__ = __initLighthouseReport__;
`;


    const sanitizedJson = ReportGenerator.sanitizeJson(lhr);
    // terser does its own sanitization, but keep this basic replace for when
    // we want to generate a report without minification.
    const sanitizedJavascript = reportJs.replace(/<\//g, '\\u003c/');

    return ReportGenerator.replaceStrings(htmlReportAssets.REPORT_TEMPLATE, [
      {search: '%%LIGHTHOUSE_JSON%%', replacement: sanitizedJson},
      {search: '%%LIGHTHOUSE_JAVASCRIPT%%', replacement: sanitizedJavascript},
    ]);
  }

  // /**
  //  * Returns the standalone flow report HTML as a string with the report JSON and renderer JS inlined.
  //  * @param {FlowResult} flow
  //  * @return {string}
  //  */
  // static generateFlowReportHtml(flow) {
  //   const sanitizedJson = ReportGenerator.sanitizeJson(flow);

  //   return ReportGenerator.replaceStrings(htmlReportAssets.FLOW_REPORT_TEMPLATE, [
  //     /* eslint-disable max-len */
  //     {search: '%%LIGHTHOUSE_FLOW_JSON%%', replacement: sanitizedJson},
  //     {search: '%%LIGHTHOUSE_FLOW_JAVASCRIPT%%', replacement: htmlReportAssets.FLOW_REPORT_JAVASCRIPT},
  //     {search: '/*%%LIGHTHOUSE_FLOW_CSS%%*/', replacement: htmlReportAssets.FLOW_REPORT_CSS},
  //     /* eslint-enable max-len */
  //   ]);
  // }

  /**
   * Converts the results to a CSV formatted string
   * Each row describes the result of 1 audit with
   *  - the name of the category the audit belongs to
   *  - the name of the audit
   *  - a description of the audit
   *  - the score type that is used for the audit
   *  - the score value of the audit
   *
   * @param {LHResult} lhr
   * @return {string}
   */
  static generateReportCSV(lhr) {
    // To keep things "official" we follow the CSV specification (RFC4180)
    // The document describes how to deal with escaping commas and quotes etc.
    const CRLF = '\r\n';
    const separator = ',';
    /** @param {string} value @return {string} */
    const escape = value => `"${value.replace(/"/g, '""')}"`;
    /** @param {Array<string | number>} row @return {string[]} */
    const rowFormatter = row => row.map(value => value.toString()).map(escape);

    // Possible TODO: tightly couple headers and row values
    const header = ['requestedUrl', 'finalUrl', 'category', 'name', 'title', 'type', 'score'];
    const table = Object.keys(lhr.categories).map(categoryId => {
      const rows = [];
      const category = lhr.categories[categoryId];
      const overallCategoryScore = category.score === null ? -1 : category.score;
      rows.push(rowFormatter([lhr.requestedUrl, lhr.finalUrl, category.title,
        `${categoryId}-score`, `Overall ${category.title} Category Score`, 'numeric',
        overallCategoryScore]));
      return rows.concat(category.auditRefs.map(auditRef => {
        const audit = lhr.audits[auditRef.id];
        // CSV validator wants all scores to be numeric, use -1 for now
        const numericScore = audit.score === null ? -1 : audit.score;
        return rowFormatter([lhr.requestedUrl, lhr.finalUrl, category.title, audit.id, audit.title,
          audit.scoreDisplayMode, numericScore]);
      }));
    });

    return [header].concat(...table)
      .map(row => row.join(separator)).join(CRLF);
  }

  /**
   * Creates the results output in a format based on the `mode`.
   * @param {LHResult} lhr
   * @param {LHResult['configSettings']['output']} outputModes
   * @return {string|string[]}
   */
  static generateReport(lhr, outputModes) {
    const outputAsArray = Array.isArray(outputModes);
    if (typeof outputModes === 'string') outputModes = [outputModes];

    const output = outputModes.map(outputMode => {
      // HTML report.
      if (outputMode === 'html') {
        return ReportGenerator.generateReportHtml(lhr);
      }
      // CSV report.
      if (outputMode === 'csv') {
        return ReportGenerator.generateReportCSV(lhr);
      }
      // JSON report.
      if (outputMode === 'json') {
        return JSON.stringify(lhr, null, 2);
      }

      throw new Error('Invalid output mode: ' + outputMode);
    });

    return outputAsArray ? output : output[0];
  }
}

module.exports = ReportGenerator;
