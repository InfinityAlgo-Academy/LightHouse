/**
 * @license Copyright 2017 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

// const htmlReportAssets = require('./report-assets.js');

const REPORT_TEMPLATE = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, minimum-scale=1">
  <link rel="icon" href="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAEhklEQVR4AWJxL/BhIAesev1U5tcflpncgNrKIsqNIwzC9feMpDUzs70kOczMzMzJJcxwCTMzncPMnOwtzBwzMzPb0vRfeZPp0VhPS5I39V5fdiXV1/VD+9QC7OVn9BsyH1XIoEI1PfmJvLFowVV564+34DFUHudbmfDh4kVXh//7XwE+WjS/YfXZe3yr4j2rqj1AIhSB7hZ8ZtPZu/zw8cK523U4wE1/rvPfWrz4zs0m9ZdC9yUJAlASdBAgocRegfF/f3/h/PuaFsxMdwjAR0vm1+06eMMfIrhLqTWqdH4EumU2SPfMhigJAlRQbZrgrRsl9U+Y2DYDFCz3ILC9kiAiqSrMwbWT0nceEnR+9Kggc2zjOJCASDENkg0a5HfZZgDP81CM3CrQs2Z1+o7DJ6ePr8sK0AOCHv5Jjdt3evyYSaZ351VIStIxPRAUtrBYbxC6w+BZ0ivVSBKkIhJhemSyZpfB00EiPO2VjzYkxhcqXQqCWCShGplvi3y0QxqbuBurMjyJeWnkHZuAEgIQGsUBqwrfjZ+IlBgKyRJzVVYF8O6qFWdh86YzQzMrZigYmxAyfvHgLZQ/LC1CbeniW2Hkqr/PH16SgvGuf2/uzNMBwJA/njxizGPtSyAf7EziJCMGRDRdhoAC4PL1A/SrKQMAAQkEfpJAcRQdrBJ7gNwjSpJsdwK+CANBkqa1LgQB4IicV9nYUct7gaxuDJUErQIiEAiMxLVOFlKzIktPpT0ggpdpC/8YAHnxbgkUY4tAAFSR7AAXNyAAWHJrA/kHGjzg5nleuwFO7Nd/IoDw4Pm58+4jNLmYG0wRA5bErc2Mr3Y+dXTDW1VvwqbJkzMCHQ4S1GTCBOIgUHJrGdEwqzR+jAp/o2qAZelUDoQnruEEdDclJI6576AlNVfc+22XN/+Y1vnJD0Yind6UpEEvn/Hqq15EYjCW7jZCJEpnNvDgkyelDjs106kuux2AAXCSobULOWP8mLhYlpoDMK4qAFXJGk+grtH8YXVz5KJblqaG1+VUdTc0I290bmUQAriGITRbdQnom0aoFj8kx1+wMD2ifncAXUQE4SkDqN1hE0jEophs1SUwZAOhUAiMCLwRtamtTZtbbmZErSAUHbSysaoEmnrsakiMiUAURi283gN6wans9oX8rOCrj7/JP35DFD+iQ7Au/K2KE1jzx6ujjUnXFH9KjEq6ZlhsTBICrNLJf47Pv/pkHzvup1w4dmUbEei0+bcXRqJuh5kVARQ8byyYxOwNGr7A87xh1tp8sGT+uMInrwi++Xj7TQz2d27NvwEkrOflAFQGIDA5khASBCGdO2/Z/MnLPwYfv5TFhjW7QhVKAB6afwe2LpFlFsCnlQEosgQgDsdOG1/LKeNqJS4JCSPJ/i+TakwEARor7gER1Iva5JmPOJK0RUqmoPnnlzFCtmIAhAAQEIQRgDaiYPIauNXcnDlRIrWNFY3hm7PG9YRqr7IV7HrCgAC17befjEvRq2nGhAHtBqDpOuI/I1diUUAMYIxEdyejBJqLnNoszGZtfiX/CztGv2mq+sdaAAAAAElFTkSuQmCC">
  <title>Lighthouse Report</title>
  <style>body {margin: 0}</style>
</head>
<body>
  <noscript>Lighthouse report requires JavaScript. Please enable.</noscript>

  <div id="lh-log"></div>

  <script>window.__LIGHTHOUSE_JSON__ = %%LIGHTHOUSE_JSON%%;</script>
  <script type=module>%%LIGHTHOUSE_JAVASCRIPT%%
  __initLighthouseReport__();
  //# sourceURL=compiled-reportrenderer.js
  </script>
  <script>console.log('window.__LIGHTHOUSE_JSON__', __LIGHTHOUSE_JSON__);</script>
</body>
</html>
`;


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

    // this shitty shit is almost done.

    // the last step woudl be to only import these if the relvant globals are not there.
    // that way when a report is generating itself again.. it can just reuse its own parts.

    console.log('cur', typeof document !== 'undefined' && document.currentScript);
    console.log('imp cur', typeof globalThis.import !== 'undefined' && globalThis.import?.meta);
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

      (await import('../renderer/i18n.js')).I18n.toString(),
      (await import('../renderer/util.js')).Util.toString(),
      (await import('../renderer/dom.js')).DOM.toString(),
      ...comp.fns.map(fn => fn.toString()),
      comp.createComponent.toString(),
      (await import('../renderer/report-renderer.js')).ReportRenderer.toString(),
      (await import('../renderer/report-ui-features.js')).ReportUIFeatures.toString(),
      (await import('../renderer/category-renderer.js')).CategoryRenderer.toString(),
      (await import('../renderer/performance-category-renderer.js')).PerformanceCategoryRenderer.toString(),
      (await import('../renderer/pwa-category-renderer.js')).PwaCategoryRenderer.toString(),
      (await import('../renderer/details-renderer.js')).DetailsRenderer.toString(),
      (await import('../renderer/element-screenshot-renderer.js')).ElementScreenshotRenderer.toString(),
      (await import('../renderer/crc-details-renderer.js')).CriticalRequestChainRenderer.toString(),
      (await import('../renderer/topbar-features.js')).TopbarFeatures.toString(),
      (await import('../renderer/drop-down-menu.js')).DropDownMenu.toString(),

      (await import('../renderer/api.js')).renderReport.toString(),

      (await import('./report-generator.js')).ReportGenerator.toString(),

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

    return ReportGenerator.replaceStrings(REPORT_TEMPLATE, [
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

module.exports = {ReportGenerator, generateReportHtml: ReportGenerator.generateReportHtml};
