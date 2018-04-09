/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Audit = require('./audit');
const Util = require('../report/v2/renderer/util');
const LHError = require('../lib/errors');

class SpeedIndexMetric extends Audit {
  /**
   * @return {!AuditMeta}
   */
  static get meta() {
    return {
      name: 'speed-index-metric',
      description: 'Perceptual Speed Index',
      helpText: 'Speed Index shows how quickly the contents of a page are visibly populated. ' +
          '[Learn more](https://developers.google.com/web/tools/lighthouse/audits/speed-index).',
      scoreDisplayMode: Audit.SCORING_MODES.NUMERIC,
      requiredArtifacts: ['traces'],
    };
  }

  /**
   * @return {LH.Audit.ScoreOptions}
   */
  static get defaultOptions() {
    return {
      // see https://www.desmos.com/calculator/mdgjzchijg
      scorePODR: 1250,
      scoreMedian: 5500,
    };
  }

  /**
   * Audits the page to give a score for the Speed Index.
   * @see  https://github.com/GoogleChrome/lighthouse/issues/197
   * @param {!Artifacts} artifacts The artifacts from the gather phase.
   * @param {LH.Audit.Context} context
   * @return {!Promise<!AuditResult>}
   */
  static audit(artifacts, context) {
    const trace = artifacts.traces[this.DEFAULT_PASS];

    // run speedline
    return artifacts.requestSpeedline(trace).then(speedline => {
      if (speedline.frames.length === 0) {
        throw new LHError(LHError.errors.NO_SPEEDLINE_FRAMES);
      }

      if (speedline.perceptualSpeedIndex === 0) {
        throw new LHError(LHError.errors.SPEEDINDEX_OF_ZERO);
      }

      let visuallyReadyInMs = undefined;
      speedline.frames.forEach(frame => {
        if (frame.getPerceptualProgress() >= 85 && typeof visuallyReadyInMs === 'undefined') {
          visuallyReadyInMs = frame.getTimeStamp() - speedline.beginning;
        }
      });

      const score = Audit.computeLogNormalScore(
        speedline.perceptualSpeedIndex,
        context.options.scorePODR,
        context.options.scoreMedian
      );

      const extendedInfo = {
        timings: {
          firstVisualChange: speedline.first,
          visuallyReady: visuallyReadyInMs,
          visuallyComplete: speedline.complete,
          perceptualSpeedIndex: speedline.perceptualSpeedIndex,
        },
        timestamps: {
          firstVisualChange: (speedline.first + speedline.beginning) * 1000,
          visuallyReady: (visuallyReadyInMs + speedline.beginning) * 1000,
          visuallyComplete: (speedline.complete + speedline.beginning) * 1000,
          perceptualSpeedIndex: (speedline.perceptualSpeedIndex + speedline.beginning) * 1000,
        },
        frames: speedline.frames.map(frame => {
          return {
            timestamp: frame.getTimeStamp(),
            progress: frame.getPerceptualProgress(),
          };
        }),
      };

      const rawValue = Math.round(speedline.perceptualSpeedIndex);

      return {
        score,
        rawValue,
        displayValue: Util.formatNumber(rawValue),
        extendedInfo: {
          value: extendedInfo,
        },
      };
    });
  }
}

module.exports = SpeedIndexMetric;
