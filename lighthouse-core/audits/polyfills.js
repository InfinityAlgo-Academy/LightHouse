/**
 * @license Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/** @typedef {{object: string | undefined, property: string}} Poly */
/** @typedef {{row: number, col: number, poly: Poly}} PolyIssue */

const Audit = require('./audit');
const NetworkRecords = require('../computed/network-records.js');
const i18n = require('../lib/i18n/i18n.js');

const UIStrings = {
  /** Imperative title of a Lighthouse audit that tells the user about all JavaScript polyfills loaded on the page. This is displayed in a list of audit titles that Lighthouse generates. */
  title: 'Polyfills',
  /** TODO: write this */
  // eslint-disable-next-line max-len
  description: 'Polyfills enable older browsers to use new JavaScript language features. However, they aren\'t always necessary. Research what browsers you must support and consider removing polyfils for features that are well supported by them.',
};

const str_ = i18n.createMessageInstanceIdFn(__filename, UIStrings);

class Polyfills extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'polyfills',
      scoreDisplayMode: Audit.SCORING_MODES.MANUAL,
      description: str_(UIStrings.description),
      title: str_(UIStrings.title),
      requiredArtifacts: ['Scripts'],
    };
  }

  /**
     * @param {Poly[]} polys
     * @param {string} code
     * @return {PolyIssue[]}
     */
  static detectPolys(polys, code) {
    const qt = (/** @type {string} */ token) =>
      `['"]${token}['"]`; // don't worry about matching string delims
    const pattern = polys.map(({object, property}) => {
      let subpattern = '';

      // String.prototype.startsWith =
      subpattern += `${object || ''}\\.?${property}\\s*=`;
      subpattern += `|${object || ''}\\[${qt(property)}\\]\\s*=`;

      // Object.defineProperty(String.prototype, 'startsWith'
      subpattern += `|defineProperty\\(${object || qt('window')},\\s*${qt(property)}`;

      // check for lodash. Assume that there is a lodash module for most polys.
      // TODO this would only work if the bundle has not been stripped of module names (and replaced with an index into the bundled modules),
      // which is unlikely in a production environment. Instead, look at source map?
      // TODO how to detect if all of lodash is bundled (a waste)?
      // TODO maybe just punt entirely for now?
      // subpattern += `|lodash/${property}`;

      return `(${subpattern})`;
    }).join('|');

    const polysSeen = new Set();
    const polyMatches = [];
    const re = new RegExp(`(^\r\n|\r|\n)|${pattern}`, 'g');
    /** @type {RegExpExecArray | null} */
    let result;
    let row = 0;
    let rowBeginsAtIndex = 0;
    // each poly maps to one subgroup in the generated regex. for each iteration of the regex exec,
    // only one subgroup will be defined. Exec until no more matches.
    while ((result = re.exec(code)) !== null) {
      // discard first (it's the whole matching pattern)
      // index 1 is truthy if matching a newline, and is used to track the row number
      // matches maps to each possible poly. Exec until no more matches
      // only one of [isNewline, ...matches] is ever defined.
      const [, isNewline, ...matches] = result;
      if (isNewline) {
        row++;
        rowBeginsAtIndex = result.index;
        continue;
      }
      const poly = polys[matches.findIndex(Boolean)];

      // don't report more than one instance of a poly for this code.
      // would be nice, but it also reports false positives if both '='
      // and 'Object.defineProperty' are used conditionally based on feature detection.
      if (polysSeen.has(poly)) {
        continue;
      }

      polysSeen.add(poly);
      polyMatches.push({
        row,
        col: result.index - rowBeginsAtIndex,
        poly,
      });
    }

    return polyMatches;
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @param {LH.Audit.Context} context
   * @return {Promise<LH.Audit.Product>}
   */
  static async audit(artifacts, context) {
    const devtoolsLog = artifacts.devtoolsLogs[Polyfills.DEFAULT_PASS];
    const networkRecords = await NetworkRecords.request(devtoolsLog, context);

    // TODO
    // how do we determine which polys are not necessary?
    // ex: only reason to polyfill Array.prototype.filter is if IE <9,
    //     only reason to polyfill String.prototype.startsWith is if IE, ...
    // Is there a standard way to declare "we support these browsers"? A meta tag?
    /** @type {Poly[]} */
    const polys = [
      'Object.assign',
      'Object.create',
      'Object.entries',
      'Object.values',
      'Array.from',
      'Array.of',
      'Array.prototype.find',
      'Array.prototype.forEach',
      'Array.prototype.filter',
      'Array.prototype.findIndex',
      'Array.prototype.includes',
      'Array.prototype.some',
      'String.prototype.includes',
      'String.prototype.repeat',
      'String.prototype.startsWith',
      'String.prototype.endsWith',
      'String.prototype.padStart',
      'String.prototype.padEnd',
      'String.prototype.trim',
      'Function.prototype.bind',
      'Node.prototype.append',
      'Node.prototype.prepend',
      'Node.prototype.before',
      'Node.prototype.after',
      'Node.prototype.remove',
      'Node.prototype.replaceWith',
      'Node.prototype.children',
      'NodeList.prototype.forEach',
      'Element.prototype.closest',
      'Element.prototype.toggleAttribute',
      'Element.prototype.matches',
      'Element.prototype.classList',
      'MouseEvent',
      'CustomEvent',
      'Number.isNaN',
      'HTMLCanvasElement.prototype.toBlob',
    ].map(str => {
      const parts = str.split('.');
      return {
        object: parts.length > 1 ?
                parts.slice(0, parts.length - 1).join('.')
          : undefined,
        property: parts[parts.length - 1],
      };
    });

    /** @type {Map<Poly, number>} */
    const polyCounter = new Map();

    /** @type {Map<PolyIssue, number>} */
    const polyIssueCounter = new Map();

    /** @type {Map<string, PolyIssue[]>} */
    const urlToPolyIssues = new Map();

    for (const [requestId, content] of Object.entries(artifacts.Scripts)) {
      const networkRecord = networkRecords.find(record => record.requestId === requestId);
      if (!networkRecord) continue;
      const extPolys = this.detectPolys(polys, content);
      urlToPolyIssues.set(networkRecord.url, extPolys);
      for (const polyIssue of extPolys) {
        const val = polyCounter.get(polyIssue.poly) || 0;
        polyIssueCounter.set(polyIssue, val);
        polyCounter.set(polyIssue.poly, val + 1);
      }
    }

    /** @type {Array<{url: string, description: string, location: string}>} */
    const tableRows = [];
    urlToPolyIssues.forEach((polyIssues, url) => {
      for (const polyIssue of polyIssues) {
        const {poly, row, col} = polyIssue;
        const polyStatement = `${poly.object ? poly.object + '.' : ''}${poly.property}`;
        const numOfThisPoly = polyCounter.get(poly) || 0;
        const polyIssueOccurrence = polyIssueCounter.get(polyIssue) || 0;
        const isMoreThanOne = (polyCounter.get(poly) || 0) > 1;
        const countText = isMoreThanOne ? ` (${polyIssueOccurrence + 1} / ${numOfThisPoly})` : '';
        tableRows.push({
          url,
          description: `${polyStatement}${countText}`,
          // TODO use sourcemaps
          location: `r: ${row}, c: ${col}`,
        });
      }
    });
    const headings = [
      {key: 'url', itemType: 'url', text: 'URL'},
      {key: 'description', itemType: 'code', text: 'Description'},
      {key: 'location', itemType: 'code', text: 'Location'},
      // TODO include estimate for size based on https://www.npmjs.com/package/mdn-polyfills#supported-polyfills ?
    ];
    const details = Audit.makeTableDetails(headings, tableRows);

    return {
      score: Number(urlToPolyIssues.size === 0),
      rawValue: urlToPolyIssues.size,
      details,
    };
  }
}

module.exports = Polyfills;
module.exports.UIStrings = UIStrings;
