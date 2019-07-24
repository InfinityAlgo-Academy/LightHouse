/**
 * @license Copyright 2019 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/** @typedef {{name: string, expression: string}} Pattern */
/** @typedef {{name: string, line: number, column: number}} PatternMatchResult */

const Audit = require('./audit.js');
const NetworkRecords = require('../computed/network-records.js');
const i18n = require('../lib/i18n/i18n.js');

const UIStrings = {
  /** Title of a Lighthouse audit that tells the user about legacy polyfills and transforms used on the page. This is displayed in a list of audit titles that Lighthouse generates. */
  title: 'Legacy JavaScript',
  // eslint-disable-next-line max-len
  description: 'Polyfills and transforms enable legacy browsers to use new JavaScript features. However, many aren\'t necessary for modern browsers. For your bundled JavaScript, adopt a modern script deployment strategy using module/nomodule feature detection to reduce the amount of code shipped to modern browsers, while retaining support for legacy browsers. [Learn More](https://philipwalton.com/articles/deploying-es2015-code-in-production-today/)',
};

const str_ = i18n.createMessageInstanceIdFn(__filename, UIStrings);

/**
 * Takes a list of patterns (consisting of a name identifier and a RegExp expression string)
 * and returns match results with line / column information for a given code input.
 */
class CodePatternMatcher {
  /**
   * @param {Pattern[]} patterns
   */
  constructor(patterns) {
    const patternsExpression = patterns.map(pattern => `(${pattern.expression})`).join('|');
    this.re = new RegExp(`(^\r\n|\r|\n)|${patternsExpression}`, 'g');
    this.patterns = patterns;
  }

  /**
   * @param {string} code
   * @return {PatternMatchResult[]}
   */
  match(code) {
    // Reset RegExp state.
    this.re.lastIndex = 0;

    const seen = new Set();
    /** @type {PatternMatchResult[]} */
    const matches = [];
    /** @type {RegExpExecArray | null} */
    let result;
    let line = 0;
    let lineBeginsAtIndex = 0;
    // Each pattern maps to one subgroup in the generated regex. For each iteration of RegExp.exec,
    // only one subgroup will be defined. Exec until no more matches.
    while ((result = this.re.exec(code)) !== null) {
      // Index 0 - the entire match, discard.
      // Index 1 - truthy if matching a newline, used to track the line number.
      // `patternExpressionMatches` maps to each possible pattern.
      // Only one of [isNewline, ...patternExpressionMatches] is ever defined.
      const [, isNewline, ...patternExpressionMatches] = result;
      if (isNewline) {
        line++;
        lineBeginsAtIndex = result.index + 1;
        continue;
      }
      const pattern = this.patterns[patternExpressionMatches.findIndex(Boolean)];

      // Don't report more than one instance of a pattern for this code.
      // Would result in multiple matches for the same pattern, ex: if both '='
      // and 'Object.defineProperty' are used conditionally based on feature detection.
      // Would also result in many matches for transform patterns.
      if (seen.has(pattern)) {
        continue;
      }
      seen.add(pattern);

      matches.push({
        name: pattern.name,
        line,
        column: result.index - lineBeginsAtIndex,
      });
    }

    return matches;
  }
}

/**
 * Identifies polyfills and transforms that should not be present if using @babel/preset-env with
 * esmodules = true.
 * @see https://docs.google.com/spreadsheets/d/1z28Au8wo8-c2UsM2lDVEOJcI3jOkb2c951xEBqzBKCc/edit?usp=sharing
 */
class LegacyJavascript extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'legacy-javascript',
      scoreDisplayMode: Audit.SCORING_MODES.INFORMATIVE,
      description: str_(UIStrings.description),
      title: str_(UIStrings.title),
      requiredArtifacts: ['devtoolsLogs', 'ScriptElements'],
    };
  }

  /**
   * @param {string?} object
   * @param {string} property
   */
  static buildPolyfillExpression(object, property) {
    const qt = (/** @type {string} */ token) =>
      `['"]${token}['"]`; // don't worry about matching string delims

    let expression = '';

    // String.prototype.startsWith =
    expression += `${object || ''}\\.?${property}\\s*=`;

    // String.prototype['startsWith'] =
    expression += `|${object || ''}\\[${qt(property)}\\]\\s*=`;

    // Object.defineProperty(String.prototype, 'startsWith'
    expression += `|defineProperty\\(${object || 'window'},\\s*${qt(property)}`;

    if (object) {
      const objectWithoutPrototype = object.replace('.prototype', '');
      // e(e.S,"Object",{values
      // minified pattern found in babel-polyfill
      // see https://cdnjs.cloudflare.com/ajax/libs/babel-polyfill/7.2.5/polyfill.min.js
      expression += `|;e\\([^,]+,${qt(objectWithoutPrototype)},{${property}`;
    }

    return expression;
  }

  /**
   * @return {Pattern[]}
   */
  static getPolyfillPatterns() {
    return [
      'Array.prototype.filter',
      'Array.prototype.find',
      'Array.prototype.findIndex',
      'Array.prototype.forEach',
      'Array.from',
      'Array.prototype.indexOf',
      'Array.isArray',
      'Array.prototype.lastIndexOf',
      'Array.prototype.map',
      'Array.of',
      'Array.prototype.reduce',
      'Array.prototype.reduceRight',
      'Array.prototype.some',
      'Date.now',
      'Date.prototype.toISOString',
      'Date.prototype.toJSON',
      'Date.prototype.toString',
      'Function.prototype.bind',
      'Function.prototype.name',
      'Map',
      'Number.isInteger',
      'Number.isSafeInteger',
      'Number.parseFloat',
      'Number.parseInt',
      'Object.assign',
      'Object.create',
      'Object.defineProperties',
      'Object.defineProperty',
      'Object.freeze',
      'Object.getOwnPropertyDescriptor',
      'Object.getOwnPropertyNames',
      'Object.getPrototypeOf',
      'Object.isExtensible',
      'Object.isFrozen',
      'Object.isSealed',
      'Object.keys',
      'Object.preventExtensions',
      'Object.seal',
      'Object.setPrototypeOf',
      'Promise',
      'Reflect.apply',
      'Reflect.construct',
      'Reflect.defineProperty',
      'Reflect.deleteProperty',
      'Reflect.get',
      'Reflect.getOwnPropertyDescriptor',
      'Reflect.getPrototypeOf',
      'Reflect.has',
      'Reflect.isExtensible',
      'Reflect.ownKeys',
      'Reflect.preventExtensions',
      'Reflect.set',
      'Reflect.setPrototypeOf',
      'Set',
      'String.prototype.codePointAt',
      'String.prototype.endsWith',
      'String.fromCodePoint',
      'String.prototype.includes',
      'String.raw',
      'String.prototype.repeat',
      'String.prototype.startsWith',
      'String.prototype.trim',
      'ArrayBuffer',
      'DataView',
      'Float32Array',
      'Float64Array',
      'Int16Array',
      'Int32Array',
      'Int8Array',
      'Uint16Array',
      'Uint32Array',
      'Uint8Array',
      'Uint8ClampedArray',
      'WeakMap',
      'WeakSet',
      'Array.prototype.includes',
      'Object.entries',
      'Object.getOwnPropertyDescriptors',
      'Object.values',
      'String.prototype.padEnd',
      'String.prototype.padStart',
    ].map(polyfillName => {
      const parts = polyfillName.split('.');
      const object = parts.length > 1 ? parts.slice(0, parts.length - 1).join('.') : null;
      const property = parts[parts.length - 1];
      return {
        name: polyfillName,
        expression: this.buildPolyfillExpression(object, property),
      };
    });
  }

  /**
   * @return {Pattern[]}
   */
  static getTransformPatterns() {
    return [
      {
        name: '@babel/plugin-transform-classes',
        expression: 'Cannot call a class as a function',
      },
      {
        name: '@babel/plugin-transform-regenerator',
        expression: 'regeneratorRuntime.wrap',
      },
      {
        name: '@babel/plugin-transform-spread',
        expression: /\.apply\(void 0/.source,
      },
    ];
  }

  /**
   * Returns a collection of match results grouped by script url and with a mapping
   * to determine the order in which the matches were discovered.
   *
   * @param {CodePatternMatcher} matcher
   * @param {LH.GathererArtifacts['ScriptElements']} scripts
   * @param {LH.Artifacts.NetworkRequest[]} networkRecords
   * @return {{
   *  patternCounter: Map<string, number>,
   *  patternMatchCounter: Map<PatternMatchResult, number>,
   *  urlToMatchResults: Map<string, PatternMatchResult[]>,
   * }}
   */
  static detectCodePatternsAcrossScripts(matcher, scripts, networkRecords) {
    /** @type {Map<string, number>} */
    const patternCounter = new Map();
    /** @type {Map<PatternMatchResult, number>} */
    const patternMatchCounter = new Map();
    /** @type {Map<string, PatternMatchResult[]>} */
    const urlToMatchResults = new Map();

    for (const {requestId, content} of Object.values(scripts)) {
      if (!content) continue;
      const networkRecord = networkRecords.find(record => record.requestId === requestId);
      if (!networkRecord) continue;
      const matches = matcher.match(content);
      if (!matches.length) continue;

      urlToMatchResults.set(networkRecord.url, matches);
      for (const match of matches) {
        const val = patternCounter.get(match.name) || 0;
        patternMatchCounter.set(match, val);
        patternCounter.set(match.name, val + 1);
      }
    }

    return {patternCounter, patternMatchCounter, urlToMatchResults};
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @param {LH.Audit.Context} context
   * @return {Promise<LH.Audit.Product>}
   */
  static async audit(artifacts, context) {
    const devtoolsLog = artifacts.devtoolsLogs[LegacyJavascript.DEFAULT_PASS];
    const networkRecords = await NetworkRecords.request(devtoolsLog, context);

    /** @type {Array<{url: string, description: string, location: string}>} */
    const tableRows = [];

    const matcher = new CodePatternMatcher([
      ...this.getPolyfillPatterns(),
      ...this.getTransformPatterns(),
    ]);
    const {patternCounter, patternMatchCounter, urlToMatchResults} =
      this.detectCodePatternsAcrossScripts(matcher, artifacts.ScriptElements, networkRecords);
    urlToMatchResults.forEach((matches, url) => {
      for (const match of matches) {
        const {name, line, column} = match;
        const patternOccurrences = patternCounter.get(name) || 0;
        const isMoreThanOne = patternOccurrences > 1;
        const matchOrdinal = patternMatchCounter.get(match) || 0;
        // Only show ordinal if there is more than one occurrence across all scripts.
        const description = isMoreThanOne ?
          `${name} (${matchOrdinal + 1} / ${patternOccurrences})` :
          name;
        tableRows.push({
          url,
          description,
          location: `Ln: ${line}, Col: ${column}`,
        });
      }
    });

    /** @type {LH.Audit.Details.Table['headings']} */
    const headings = [
      {key: 'url', itemType: 'url', text: str_(i18n.UIStrings.columnURL)},
      {key: 'description', itemType: 'code', text: 'Description'},
      {key: 'location', itemType: 'code', text: str_(i18n.UIStrings.columnLocation)},
    ];
    const details = Audit.makeTableDetails(headings, tableRows);

    return {
      score: Number(patternMatchCounter.size === 0),
      numericValue: patternMatchCounter.size,
      details,
    };
  }
}

module.exports = LegacyJavascript;
module.exports.UIStrings = UIStrings;
