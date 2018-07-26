/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

/**
 * @fileoverview Audits a page to see how the size of DOM it creates. Stats like
 * tree depth, # children, and total nodes are returned. The score is calculated
 * based solely on the total number of nodes found on the page.
 */

'use strict';

const Audit = require('../audit');
const Util = require('../../report/html/renderer/util.js');
const i18n = require('../../lib/i18n');

const MAX_DOM_NODES = 1500;
const MAX_DOM_TREE_WIDTH = 60;
const MAX_DOM_TREE_DEPTH = 32;

const UIStrings = {
  title: 'Avoids an excessive DOM size',
  failureTitle: 'Avoid an excessive DOM size',
  description: 'Browser engineers recommend pages contain fewer than ' +
    `~${MAX_DOM_NODES.toLocaleString()} DOM nodes. The sweet spot is a tree ` +
    `depth < ${MAX_DOM_TREE_DEPTH} elements and fewer than ${MAX_DOM_TREE_WIDTH} ` +
    'children/parent element. A large DOM can increase memory usage, cause longer ' +
    '[style calculations](https://developers.google.com/web/fundamentals/performance/rendering/reduce-the-scope-and-complexity-of-style-calculations), ' +
    'and produce costly [layout reflows](https://developers.google.com/speed/articles/reflow). [Learn more](https://developers.google.com/web/tools/lighthouse/audits/dom-size).',
  columnDOMNodes: 'Total DOM Nodes',
  columnDOMDepth: 'Maximum DOM Depth',
  columnDOMWidth: 'Maximum Children',
  displayValue: `{itemCount, plural,
    =1 {1 node}
    other {# nodes}
    }`,
};

const str_ = i18n.createMessageInstanceIdFn(__filename, UIStrings);


class DOMSize extends Audit {
  static get MAX_DOM_NODES() {
    return MAX_DOM_NODES;
  }

  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'dom-size',
      title: str_(UIStrings.title),
      failureTitle: str_(UIStrings.failureTitle),
      description: str_(UIStrings.description),
      scoreDisplayMode: Audit.SCORING_MODES.NUMERIC,
      requiredArtifacts: ['DOMStats'],
    };
  }

  /**
   * @return {LH.Audit.ScoreOptions}
   */
  static get defaultOptions() {
    return {
      // 25th and 50th percentiles HTTPArchive -> 50 and 75
      // https://bigquery.cloud.google.com/table/httparchive:lighthouse.2018_04_01_mobile?pli=1
      // see https://www.desmos.com/calculator/vqot3wci4g
      scorePODR: 700,
      scoreMedian: 1400,
    };
  }


  /**
   * @param {LH.Artifacts} artifacts
   * @param {LH.Audit.Context} context
   * @return {LH.Audit.Product}
   */
  static audit(artifacts, context) {
    const stats = artifacts.DOMStats;

    const score = Audit.computeLogNormalScore(
      stats.totalDOMNodes,
      context.options.scorePODR,
      context.options.scoreMedian
    );

    const headings = [
      {key: 'totalNodes', itemType: 'text', text: str_(UIStrings.columnDOMNodes)},
      {key: 'depth', itemType: 'text', text: str_(UIStrings.columnDOMDepth)},
      {key: 'width', itemType: 'text', text: str_(UIStrings.columnDOMWidth)},
    ];

    const items = [
      {
        totalNodes: Util.formatNumber(stats.totalDOMNodes),
        depth: Util.formatNumber(stats.depth.max),
        width: Util.formatNumber(stats.width.max),
      },
      {
        totalNodes: '',
        depth: {
          type: 'code',
          value: stats.depth.snippet,
        },
        width: {
          type: 'code',
          value: stats.width.snippet,
        },
      },
    ];

    return {
      score,
      rawValue: stats.totalDOMNodes,
      displayValue: str_(UIStrings.displayValue, {itemCount: stats.totalDOMNodes}),
      extendedInfo: {
        value: items,
      },
      details: Audit.makeTableDetails(headings, items),
    };
  }
}

module.exports = DOMSize;
module.exports.UIStrings = UIStrings;
