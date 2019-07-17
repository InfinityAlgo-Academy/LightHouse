/**
 * @license Copyright 2019 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/** @typedef {{object: string | undefined, property: string}} Poly */
/** @typedef {{line: number, col: number, poly: Poly}} PolyIssue */

const Audit = require('./audit.js');
const NetworkRecords = require('../computed/network-records.js');
const i18n = require('../lib/i18n/i18n.js');

const UIStrings = {
  /** Title of a Lighthouse audit that tells the user about legacy polyfills and transforms used on the page. This is displayed in a list of audit titles that Lighthouse generates. */
  title: 'Legacy JavaScript',
  // eslint-disable-next-line max-len
  description: 'Polyfills and transforms enable older browsers to use new JavaScript language features. However, many aren\'t necessary for modern browsers. Adopt a modern script deployment strategy using `module`/`nomodule` feature detection. [Learn More](https://philipwalton.com/articles/deploying-es2015-code-in-production-today/)',
};

const str_ = i18n.createMessageInstanceIdFn(__filename, UIStrings);

class LegacyJavascript extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'legacy-javascript',
      scoreDisplayMode: Audit.SCORING_MODES.MANUAL,
      description: str_(UIStrings.description),
      title: str_(UIStrings.title),
      requiredArtifacts: ['devtoolsLogs', 'ScriptElements'],
    };
  }

  /**
   * @param {Poly[]} polyfills
   * @param {string} code
   * @return {PolyIssue[]}
   */
  static detectPolyfills(polyfills, code) {
    const qt = (/** @type {string} */ token) =>
      `['"]${token}['"]`; // don't worry about matching string delims
    const pattern = polyfills.map(({object, property}) => {
      let subpattern = '';

      // String.prototype.startsWith =
      subpattern += `${object || ''}\\.?${property}\\s*=`;

      // String.prototype['startsWith'] =
      subpattern += `|${object || ''}\\[${qt(property)}\\]\\s*=`;

      // Object.defineProperty(String.prototype, 'startsWith'
      subpattern += `|defineProperty\\(${object || 'window'},\\s*${qt(property)}`;

      if (object) {
        const objectWithoutPrototype = object.replace('.prototype', '');
        // e(e.S,"Object",{values
        // minified pattern found in babel-polyfill
        // see https://cdnjs.cloudflare.com/ajax/libs/babel-polyfill/7.2.5/polyfill.min.js
        subpattern += `|;e\\([^,]+,${qt(objectWithoutPrototype)},{${property}`;
      }

      return `(${subpattern})`;
    }).join('|');

    const polysSeen = new Set();
    const polyMatches = [];
    const re = new RegExp(`(^\r\n|\r|\n)|${pattern}`, 'g');
    /** @type {RegExpExecArray | null} */
    let result;
    let line = 0;
    let lineBeginsAtIndex = 0;
    // each poly maps to one subgroup in the generated regex. for each iteration of the regex exec,
    // only one subgroup will be defined. Exec until no more matches.
    while ((result = re.exec(code)) !== null) {
      // discard first (it's the whole matching pattern)
      // index 1 is truthy if matching a newline, and is used to track the line number
      // matches maps to each possible poly.
      // only one of [isNewline, ...matches] is ever defined.
      const [, isNewline, ...matches] = result;
      if (isNewline) {
        line++;
        lineBeginsAtIndex = result.index + 1;
        continue;
      }
      const poly = polyfills[matches.findIndex(Boolean)];

      // don't report more than one instance of a poly for this code.
      // would be nice, but it also reports false positives if both '='
      // and 'Object.defineProperty' are used conditionally based on feature detection.
      if (polysSeen.has(poly)) {
        continue;
      }

      polysSeen.add(poly);
      polyMatches.push({
        line,
        col: result.index - lineBeginsAtIndex,
        poly,
      });
    }

    return polyMatches;
  }

  /**
   * @return {Poly[]}
   */
  static getPolyDefinitions() {
    // If latest Chrome supports a feature natively, we should
    // complain about the existence of a polyfill.
    // list sourced from a couple places. not exhaustive.
    // from babel-polyfill: https://gist.github.com/connorjclark/1b019f7caf1c31b49596e7628145eb3f
    // casual perusal of https://developer.mozilla.org/en-US/docs/Web/API

    return [
      'Array.from',
      'Array.isArray',
      'Array.of',
      'Array.prototype.copyWithin',
      'Array.prototype.fill',
      'Array.prototype.filter',
      'Array.prototype.find',
      'Array.prototype.findIndex',
      'Array.prototype.forEach',
      'Array.prototype.includes',
      'Array.prototype.indexOf',
      'Array.prototype.join',
      'Array.prototype.lastIndexOf',
      'Array.prototype.slice',
      'Array.prototype.some',
      'Array.prototype.sort',
      'CustomEvent',
      'Date.now',
      'Date.prototype.toISOString',
      'Date.prototype.toJSON',
      'Element.prototype.classList',
      'Element.prototype.closest',
      'Element.prototype.matches',
      'Element.prototype.toggleAttribute',
      'Function.prototype.bind',
      'HTMLCanvasElement.prototype.toBlob',
      'Math.acosh',
      'Math.asinh',
      'Math.atanh',
      'Math.cbrt',
      'Math.cosh',
      'Math.fround',
      'Math.hypot',
      'Math.sign',
      'Math.sinh',
      'Math.tanh',
      'Math.trunc',
      'MouseEvent',
      'Node.prototype.after',
      'Node.prototype.append',
      'Node.prototype.before',
      'Node.prototype.children',
      'Node.prototype.prepend',
      'Node.prototype.remove',
      'Node.prototype.replaceWith',
      'NodeList.prototype.forEach',
      'Number.EPSILON',
      'Number.isFinite',
      'Number.isInteger',
      'Number.isNaN',
      'Number.isSafeInteger',
      'Number.parseFloat',
      'Number.parseInt',
      'Number.prototype.toFixed',
      'Object.assign',
      'Object.create',
      'Object.defineProperties',
      'Object.defineProperty',
      'Object.entries',
      'Object.getOwnPropertyDescriptors',
      'Object.is',
      'Object.setPrototypeOf',
      'Object.values',
      'Promise.prototype.finally',
      'Reflect.apply',
      'Reflect.construct',
      'Reflect.deleteProperty',
      'Reflect.getPrototypeOf',
      'Reflect.has',
      'Reflect.isExtensible',
      'Reflect.ownKeys',
      'Reflect.preventExtensions',
      'String.fromCodePoint',
      'String.prototype.codePointAt',
      'String.prototype.endsWith',
      'String.prototype.includes',
      'String.prototype.padEnd',
      'String.prototype.padStart',
      'String.prototype.repeat',
      'String.prototype.startsWith',
      'String.prototype.trim',
      'String.raw',
    ].map(str => {
      const parts = str.split('.');
      const object = parts.length > 1 ? parts.slice(0, parts.length - 1).join('.') : undefined;
      const property = parts[parts.length - 1];
      return {
        object,
        property,
      };
    });
  }

  /**
   * @param {LH.GathererArtifacts['ScriptElements']} scripts
   * @param {LH.Artifacts.NetworkRequest[]} networkRecords
   * @return {{
   *  polyCounter: Map<Poly, number>,
   *  polyIssueCounter: Map<PolyIssue, number>,
   *  urlToPolyIssues: Map<string, PolyIssue[]>,
   * }}
   */
  static calculatePolyIssues(scripts, networkRecords) {
    const polyfills = this.getPolyDefinitions();
    /** @type {Map<Poly, number>} */
    const polyCounter = new Map();
    /** @type {Map<PolyIssue, number>} */
    const polyIssueCounter = new Map();
    /** @type {Map<string, PolyIssue[]>} */
    const urlToPolyIssues = new Map();

    for (const {requestId, content} of Object.values(scripts)) {
      if (!content) continue;
      const networkRecord = networkRecords.find(record => record.requestId === requestId);
      if (!networkRecord) continue;
      const extPolys = this.detectPolyfills(polyfills, content);
      if (extPolys.length) {
        urlToPolyIssues.set(networkRecord.url, extPolys);
        for (const polyIssue of extPolys) {
          const val = polyCounter.get(polyIssue.poly) || 0;
          polyIssueCounter.set(polyIssue, val);
          polyCounter.set(polyIssue.poly, val + 1);
        }
      }
    }

    return {polyCounter, polyIssueCounter, urlToPolyIssues};
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @param {LH.Audit.Context} context
   * @return {Promise<LH.Audit.Product>}
   */
  static async audit(artifacts, context) {
    const devtoolsLog = artifacts.devtoolsLogs[LegacyJavascript.DEFAULT_PASS];
    const networkRecords = await NetworkRecords.request(devtoolsLog, context);
    const {polyCounter, polyIssueCounter, urlToPolyIssues} =
      this.calculatePolyIssues(artifacts.ScriptElements, networkRecords);

    /** @type {Array<{url: string, description: string, location: string}>} */
    const tableRows = [];
    urlToPolyIssues.forEach((polyIssues, url) => {
      for (const polyIssue of polyIssues) {
        const {poly, line, col} = polyIssue;
        const polyStatement = `${poly.object ? poly.object + '.' : ''}${poly.property}`;
        const numOfThisPoly = polyCounter.get(poly) || 0;
        const isMoreThanOne = numOfThisPoly > 1;
        const polyIssueOccurrence = polyIssueCounter.get(polyIssue) || 0;
        const countText = isMoreThanOne ? ` (${polyIssueOccurrence + 1} / ${numOfThisPoly})` : '';
        tableRows.push({
          url,
          description: `${polyStatement}${countText}`,
          location: `Ln: ${line}, Col: ${col}`,
        });
      }
    });
    /** @type {LH.Audit.Details.Table['headings']} */
    const headings = [
      {key: 'url', itemType: 'url', text: 'URL'},
      {key: 'description', itemType: 'code', text: 'Description'},
      {key: 'location', itemType: 'code', text: 'Location'},
    ];
    const details = Audit.makeTableDetails(headings, tableRows);

    return {
      score: Number(polyIssueCounter.size === 0),
      extendedInfo: {
        value: polyIssueCounter.size,
      },
      details,
    };
  }
}

module.exports = LegacyJavascript;
module.exports.UIStrings = UIStrings;
