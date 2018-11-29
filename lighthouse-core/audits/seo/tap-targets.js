/**
 * @license Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/**
 * @fileoverview Checks that links, buttons, etc. are sufficiently large and don't overlap.
 */
const Audit = require('../audit');
const ViewportAudit = require('../viewport');
const {
  rectContains,
  simplifyClientRects,
  getRectOverlap,
  getRectXOverlap,
  getRectYOverlap,
  getFingerAtCenter,
  getFingerQuadrants,
  getLargestClientRect,
} = require('../../lib/client-rect-functions');
const FINGER_SIZE_PX = 48;

/**
 * @param {LH.Artifacts.ClientRect} rectWithFinger
 * @param {LH.Artifacts.ClientRect} scoredRect
 */
function getFingerScore(rectWithFinger, scoredRect) {
  if (getRectOverlap(getFingerAtCenter(rectWithFinger, FINGER_SIZE_PX), scoredRect) === 0) {
    // No overlap at all, don't need to get per-quadrant score
    return 0;
  }

  const q = getFingerQuadrants(rectWithFinger, FINGER_SIZE_PX);

  let maxScore = 0;
  q.forEach(finger => {
    const score = getRectOverlap(finger, scoredRect);
    if (score > maxScore) {
      maxScore = score;
    }
  });

  return Math.ceil(maxScore);
}

/**
 * @param {LH.Artifacts.ClientRect} targetCR
 * @param {LH.Artifacts.ClientRect} maybeOverlappingCR
 */
function getOverlapFailure(targetCR, maybeOverlappingCR) {
  const tapTargetScore = getFingerScore(targetCR, targetCR);
  const maybeOverlappingScore = getFingerScore(targetCR, maybeOverlappingCR);

  if (maybeOverlappingScore <= tapTargetScore / 2) {
    return null;
  }

  const fingerAtCenter = getFingerAtCenter(targetCR, FINGER_SIZE_PX);
  const overlapAreaExcess = Math.ceil(
    maybeOverlappingScore - tapTargetScore / 2
  );

  const xMovementNeededToFix =
    overlapAreaExcess / getRectXOverlap(fingerAtCenter, maybeOverlappingCR);
  const yMovementNeededToFix =
    overlapAreaExcess / getRectYOverlap(fingerAtCenter, maybeOverlappingCR);
  const extraDistanceNeeded = Math.min(
    xMovementNeededToFix,
    yMovementNeededToFix
  );

  return {
    extraDistanceNeeded: Math.ceil(extraDistanceNeeded),
    tapTargetScore,
    overlappingTargetScore: maybeOverlappingScore,
  };
}

/**
 *
 * @param {LH.Artifacts.TapTarget} tapTarget
 * @param {LH.Artifacts.TapTarget[]} allTargets
 */
function getTooCloseTargets(tapTarget, allTargets) {
  /** @type LH.Audit.TapTargetOverlapDetail[] */
  const failures = [];

  for (let i = 0; i < allTargets.length; i++) {
    if (allTargets[i] === tapTarget) {
      continue;
    }
    const maybeOverlappingTarget = allTargets[i];
    if (
      /https?:\/\//.test(tapTarget.href) &&
      tapTarget.href === maybeOverlappingTarget.href
    ) {
      // no overlap because same target action
      continue;
    }

    /** @type LH.Audit.TapTargetOverlapDetail | null */
    let greatestFailure = null;
    simplifyClientRects(tapTarget.clientRects).forEach(targetCR => {
      for (const maybeOverlappingCR of maybeOverlappingTarget.clientRects) {
        if (rectContains(maybeOverlappingCR, targetCR)) {
          return;
        }
      }

      maybeOverlappingTarget.clientRects.forEach(maybeOverlappingCR => {
        for (const crA of tapTarget.clientRects) {
          if (rectContains(crA, maybeOverlappingCR)) {
            // If one tap target is contained within the other that's
            // probably intentional (e.g. an item with a delete button inside)
            return;
          }
        }

        const failure = getOverlapFailure(targetCR, maybeOverlappingCR);
        if (failure) {
          if (
            !greatestFailure ||
            failure.extraDistanceNeeded > greatestFailure.extraDistanceNeeded
          ) {
            greatestFailure = {
              ...failure,
              tapTarget,
              overlappingTarget: maybeOverlappingTarget,
            };
          }
        }
      });
    });

    if (greatestFailure) {
      failures.push(greatestFailure);
    }
  }

  return failures;
}

/**
 * @param {LH.Artifacts.ClientRect} cr
 */
function clientRectMeetsMinimumSize(cr) {
  return cr.width >= FINGER_SIZE_PX && cr.height >= FINGER_SIZE_PX;
}

/**
 * @param {LH.Artifacts.TapTarget} target
 */
function targetIsTooSmall(target) {
  for (const cr of target.clientRects) {
    if (clientRectMeetsMinimumSize(cr)) {
      return false;
    }
  }
  return true;
}

/**
 *
 * @param {LH.Artifacts.TapTarget[]} targets
 */
function getTooSmallTargets(targets) {
  return targets.filter(targetIsTooSmall);
}

/**
 * @param {LH.Artifacts.TapTarget} target
 * @returns {LH.Audit.DetailsRendererNodeDetailsJSON}
 */
function targetToTableNode(target) {
  return {
    type: 'node',
    snippet: target.snippet,
    path: target.path,
    selector: target.selector,
  };
}

class TapTargets extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'tap-targets',
      title: 'Tap targets are sized appropriately',
      failureTitle: 'Tap targets are not sized appropriately',
      description:
        'Interactive elements like buttons and links should be large enough (48x48px), and have enough space around them, to be easy enough to tap without overlapping onto other elements. [Learn more](https://developers.google.com/web/fundamentals/accessibility/accessible-styles#multi-device_responsive_design).',
      requiredArtifacts: ['Viewport', 'TapTargets'],
    };
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @return {LH.Audit.Product}
   */
  static audit(artifacts) {
    const hasViewportSet = ViewportAudit.audit(artifacts).rawValue;
    if (!hasViewportSet) {
      return {
        rawValue: false,
        explanation:
          'Tap targets are too small because of a missing viewport config',
      };
    }

    const tooSmallTargets = getTooSmallTargets(artifacts.TapTargets);

    /** @type {Array<LH.Audit.TooSmallTapTargetItem>} */
    const tableItems = [];

    const scorePerElement = new Map();
    artifacts.TapTargets.forEach(target => {
      scorePerElement.set(target, 1);
    });

    tooSmallTargets.forEach(target => {
      const largestCr = getLargestClientRect(target);
      const width = Math.floor(largestCr.width);
      const height = Math.floor(largestCr.height);
      const size = width + 'x' + height;

      const overlappingTargets = getTooCloseTargets(
        target,
        artifacts.TapTargets
      );

      if (overlappingTargets.length > 0) {
        scorePerElement.set(target, 0);
        overlappingTargets.forEach(
          ({
            overlappingTarget,
            extraDistanceNeeded,
            overlappingTargetScore,
            tapTargetScore,
          }) => {
            tableItems.push({
              tapTarget: targetToTableNode(target),
              overlappingTarget: targetToTableNode(overlappingTarget),
              size,
              extraDistanceNeeded,
              width,
              height,
              overlappingTargetScore,
              tapTargetScore,
            });
          }
        );
      }
    });

    tableItems.sort((a, b) => {
      /**
       * @param {LH.Audit.TooSmallTapTargetItem} failure
       */
      function getFailureSeriousness(failure) {
        let magnitude = failure.width * failure.height;
        if (failure.extraDistanceNeeded) {
          magnitude -= failure.extraDistanceNeeded * 10000;
        }
        return magnitude;
      }
      return getFailureSeriousness(a) - getFailureSeriousness(b);
    });

    const headings = [
      {key: 'tapTarget', itemType: 'node', text: 'Tap Target'},
      {key: 'size', itemType: 'text', text: 'Size'},
      {key: 'overlappingTarget', itemType: 'node', text: 'Overlapping Target'},
    ];

    const details = Audit.makeTableDetails(headings, tableItems);


    let score = 1;
    if (artifacts.TapTargets.length > 0) {
      score = 0;
      artifacts.TapTargets.forEach(target => {
        const elementScore = scorePerElement.get(target);
        score += elementScore / artifacts.TapTargets.length;
      });
    }

    // handle floating point number issue where score is greater than 1, e.g. 1.00...0002)
    score = Math.round(score * 1000) / 1000;

    const displayValue = Math.round(score * 100) + '% appropriately sized tap targets';

    return {
      rawValue: tableItems.length === 0,
      score,
      details,
      displayValue,
    };
  }
}

TapTargets.FINGER_SIZE_PX = FINGER_SIZE_PX;

module.exports = TapTargets;
