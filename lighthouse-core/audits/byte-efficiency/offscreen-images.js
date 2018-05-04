/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
/**
 * @fileoverview Checks to see if images are displayed only outside of the viewport.
 *     Images requested after TTI are not flagged as violations.
 */
'use strict';

const ByteEfficiencyAudit = require('./byte-efficiency-audit');
const Sentry = require('../../lib/sentry');
const URL = require('../../lib/url-shim');

const ALLOWABLE_OFFSCREEN_X = 100;
const ALLOWABLE_OFFSCREEN_Y = 200;

const IGNORE_THRESHOLD_IN_BYTES = 2048;
const IGNORE_THRESHOLD_IN_PERCENT = 75;

/** @typedef {{url: string, requestStartTime: number, totalBytes: number, wastedBytes: number, wastedPercent: number}} WasteResult */

class OffscreenImages extends ByteEfficiencyAudit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      name: 'offscreen-images',
      description: 'Defer offscreen images',
      scoreDisplayMode: ByteEfficiencyAudit.SCORING_MODES.NUMERIC,
      helpText:
        'Consider lazy-loading offscreen and hidden images after all critical resources have ' +
        'finished loading to lower time to interactive. ' +
        '[Learn more](https://developers.google.com/web/tools/lighthouse/audits/offscreen-images).',
      requiredArtifacts: ['ImageUsage', 'ViewportDimensions', 'traces', 'devtoolsLogs'],
    };
  }

  /**
   * @param {{top: number, bottom: number, left: number, right: number}} imageRect
   * @param {{innerWidth: number, innerHeight: number}} viewportDimensions
   * @return {number}
   */
  static computeVisiblePixels(imageRect, viewportDimensions) {
    const innerWidth = viewportDimensions.innerWidth;
    const innerHeight = viewportDimensions.innerHeight;

    const top = Math.max(imageRect.top, -1 * ALLOWABLE_OFFSCREEN_Y);
    const right = Math.min(imageRect.right, innerWidth + ALLOWABLE_OFFSCREEN_X);
    const bottom = Math.min(imageRect.bottom, innerHeight + ALLOWABLE_OFFSCREEN_Y);
    const left = Math.max(imageRect.left, -1 * ALLOWABLE_OFFSCREEN_X);

    return Math.max(right - left, 0) * Math.max(bottom - top, 0);
  }

  /**
   * @param {LH.Artifacts.SingleImageUsage} image
   * @param {{innerWidth: number, innerHeight: number}} viewportDimensions
   * @return {null|Error|WasteResult}
   */
  static computeWaste(image, viewportDimensions) {
    if (!image.networkRecord) {
      return null;
    }

    const url = URL.elideDataURI(image.src);
    const totalPixels = image.clientWidth * image.clientHeight;
    const visiblePixels = this.computeVisiblePixels(image.clientRect, viewportDimensions);
    // Treat images with 0 area as if they're offscreen. See https://github.com/GoogleChrome/lighthouse/issues/1914
    const wastedRatio = totalPixels === 0 ? 1 : 1 - visiblePixels / totalPixels;
    const totalBytes = image.networkRecord.resourceSize;
    const wastedBytes = Math.round(totalBytes * wastedRatio);

    if (!Number.isFinite(wastedRatio)) {
      return new Error(`Invalid image sizing information ${url}`);
    }

    return {
      url,
      requestStartTime: image.networkRecord.startTime,
      totalBytes,
      wastedBytes,
      wastedPercent: 100 * wastedRatio,
    };
  }

  /**
   * The default byte efficiency audit will report max(TTI, load), since lazy-loading offscreen
   * images won't reduce the overall time and the wasted bytes are really only "wasted" for TTI,
   * override the function to just look at TTI savings.
   *
   * @param {Array<LH.Audit.ByteEfficiencyResult>} results
   * @param {LH.Gatherer.Simulation.GraphNode} graph
   * @param {LH.Gatherer.Simulation.Simulator} simulator
   * @return {number}
   */
  static computeWasteWithTTIGraph(results, graph, simulator) {
    return ByteEfficiencyAudit.computeWasteWithTTIGraph(results, graph, simulator,
      {includeLoad: false});
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @param {Array<LH.WebInspector.NetworkRequest>} networkRecords
   * @param {LH.Audit.Context} context
   * @return {Promise<LH.Audit.ByteEfficiencyProduct>}
   */
  static audit_(artifacts, networkRecords, context) {
    const images = artifacts.ImageUsage;
    const viewportDimensions = artifacts.ViewportDimensions;
    const trace = artifacts.traces[ByteEfficiencyAudit.DEFAULT_PASS];
    const devtoolsLog = artifacts.devtoolsLogs[ByteEfficiencyAudit.DEFAULT_PASS];

    /** @type {string|undefined} */
    let debugString;
    const resultsMap = images.reduce((results, image) => {
      const processed = OffscreenImages.computeWaste(image, viewportDimensions);
      if (processed === null) {
        return results;
      }

      if (processed instanceof Error) {
        debugString = processed.message;
        // @ts-ignore TODO(bckenny): Sentry type checking
        Sentry.captureException(processed, {tags: {audit: this.meta.name}, level: 'warning'});
        return results;
      }

      // If an image was used more than once, warn only about its least wasteful usage
      const existing = results.get(processed.url);
      if (!existing || existing.wastedBytes > processed.wastedBytes) {
        results.set(processed.url, processed);
      }

      return results;
    }, /** @type {Map<string, WasteResult>} */ (new Map()));

    const settings = context.settings;
    return artifacts.requestFirstCPUIdle({trace, devtoolsLog, settings}).then(firstInteractive => {
      // The filter below is just to be extra safe that we exclude images that were loaded post-TTI.
      // If we're in the Lantern case and `timestamp` isn't available, we just have to rely on the
      // graph simulation doing the right thing.
      const ttiTimestamp = firstInteractive.timestamp ? firstInteractive.timestamp / 1e6 : Infinity;

      const results = Array.from(resultsMap.values()).filter(item => {
        const isWasteful =
          item.wastedBytes > IGNORE_THRESHOLD_IN_BYTES &&
          item.wastedPercent > IGNORE_THRESHOLD_IN_PERCENT;
        const loadedEarly = item.requestStartTime < ttiTimestamp;
        return isWasteful && loadedEarly;
      });

      const headings = [
        {key: 'url', itemType: 'thumbnail', text: ''},
        {key: 'url', itemType: 'url', text: 'URL'},
        {key: 'totalBytes', itemType: 'bytes', displayUnit: 'kb', granularity: 1, text: 'Original'},
        {
          key: 'wastedBytes',
          itemType: 'bytes',
          displayUnit: 'kb',
          granularity: 1,
          text: 'Potential Savings',
        },
      ];

      return {
        debugString,
        results,
        headings,
      };
    });
  }
}

module.exports = OffscreenImages;
