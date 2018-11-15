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
  addRectWidthAndHeight,
} = require('../../lib/client-rect-functions');
const FINGER_SIZE_PX = 48;

/**
 * @param {LH.Artifacts.ClientRect} clientRect
 */
function getFingerAtCenter(clientRect) {
  return addRectWidthAndHeight({
    left: clientRect.left + clientRect.width / 2 - FINGER_SIZE_PX / 2,
    top: clientRect.top + clientRect.height / 2 - FINGER_SIZE_PX / 2,
    right: clientRect.right - clientRect.width / 2 + FINGER_SIZE_PX / 2,
    bottom: clientRect.bottom - clientRect.height / 2 + FINGER_SIZE_PX / 2,
  });
}

/**
 * @param {LH.Artifacts.ClientRect} rect1
 * @param {LH.Artifacts.ClientRect} rect2
 */
function getRectXOverlap(rect1, rect2) {
  // https:// stackoverflow.com/a/9325084/1290545
  return Math.max(
    0,
    Math.min(rect1.right, rect2.right) - Math.max(rect1.left, rect2.left)
  );
}
/**
 * @param {LH.Artifacts.ClientRect} rect1
 * @param {LH.Artifacts.ClientRect} rect2
 */
function getRectYOverlap(rect1, rect2) {
  // https:// stackoverflow.com/a/9325084/1290545
  return Math.max(
    0,
    Math.min(rect1.bottom, rect2.bottom) - Math.max(rect1.top, rect2.top)
  );
}

/**
 * @param {LH.Artifacts.ClientRect} rect1
 * @param {LH.Artifacts.ClientRect} rect2
 */
function getRectOverlap(rect1, rect2) {
  return getRectXOverlap(rect1, rect2) * getRectYOverlap(rect1, rect2);
}

/**
 * @param {LH.Artifacts.ClientRect} rect
 * @return {LH.Artifacts.ClientRect[]}
 */
function getFingerQuadrants(rect) {
  return [
    addRectWidthAndHeight({
      left: rect.left + rect.width / 2 - FINGER_SIZE_PX / 2,
      top: rect.top + rect.height / 2 - FINGER_SIZE_PX / 2,
      right: rect.right - rect.width / 2,
      bottom: rect.bottom - rect.height / 2,
    }),
    addRectWidthAndHeight({
      left: rect.left + rect.width / 2,
      top: rect.top + rect.height / 2 - FINGER_SIZE_PX / 2,
      right: rect.right - rect.width / 2 + FINGER_SIZE_PX / 2,
      bottom: rect.bottom - rect.height / 2,
    }),
    addRectWidthAndHeight({
      left: rect.left + rect.width / 2 - FINGER_SIZE_PX / 2,
      top: rect.top + rect.height / 2,
      right: rect.right - rect.width / 2,
      bottom: rect.bottom - rect.height / 2 + FINGER_SIZE_PX / 2,
    }),
    addRectWidthAndHeight({
      left: rect.left + rect.width / 2,
      top: rect.top + rect.height / 2,
      right: rect.right - rect.width / 2 + FINGER_SIZE_PX / 2,
      bottom: rect.bottom - rect.height / 2 + FINGER_SIZE_PX / 2,
    }),
  ];
}

/**
 * @param {LH.Artifacts.ClientRect} rectWithFinger
 * @param {LH.Artifacts.ClientRect} scoredRect
 */
function getFingerScore(rectWithFinger, scoredRect) {
  if (getRectOverlap(getFingerAtCenter(rectWithFinger), scoredRect) === 0) {
    // No overlap at all, don't need to get per-quadrant score
    return 0;
  }

  const q = getFingerQuadrants(rectWithFinger);

  let maxScore = 0;
  q.forEach(finger => {
    const score = getRectOverlap(finger, scoredRect);
    if (score > maxScore) {
      maxScore = score;
    }
  });

  return maxScore;
}

/**
 *
 * @param {LH.Artifacts.TapTarget[]} targets
 */
function getTooCloseTargets(targets) {
  const count = targets.length;

  /** @typedef {{targetA: LH.Artifacts.TapTarget, targetB: LH.Artifacts.TapTarget, overlap: number}} TapTargetFailure */

  /** @type TapTargetFailure[] */
  const failures = [];

  for (let i = 0; i < count; i++) {
    for (let j = 0; j < count; j++) {
      if (i === j) {
        continue;
      }

      const targetA = targets[i];
      const targetB = targets[j];
      if (/https?:\/\//.test(targetA.href) && targetA.href === targetB.href) {
        // no overlap because same target action
        continue;
      }

      let maxExtraDistanceNeeded = 0;
      // todo: wouldn't a better name for simplifyclientrects be getrectsthatneedfinger?
      simplifyClientRects(targetA.clientRects).forEach(crA => {
        const fingerAtCenter = getFingerAtCenter(crA);
        const aOverlapScore = getFingerScore(crA, crA);

        for (const crB of targetB.clientRects) {
          if (rectContains(crB, crA)) {
            return;
          }
        }

        targetB.clientRects.forEach(crB => {
          for (const crA of targetA.clientRects) {
            if (rectContains(crA, crB)) {
              return;
            }
          }

          const bOverlapScore = getFingerScore(crA, crB);

          if (bOverlapScore > aOverlapScore / 2) {
            const overlapAreaExcess = Math.ceil(
              bOverlapScore - aOverlapScore / 2
            );
            const xMovementNeededToFix =
              overlapAreaExcess / getRectXOverlap(fingerAtCenter, crB);
            const yMovementNeededToFix =
              overlapAreaExcess / getRectYOverlap(fingerAtCenter, crB);
            const extraDistanceNeeded = Math.min(
              xMovementNeededToFix,
              yMovementNeededToFix
            );
            if (extraDistanceNeeded > maxExtraDistanceNeeded) {
              maxExtraDistanceNeeded = extraDistanceNeeded;
            }
          }
        });
      });

      if (maxExtraDistanceNeeded > 0) {
        failures.push({
          targetA,
          targetB,
          overlap: Math.ceil(maxExtraDistanceNeeded),
        });
      }
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
 * @param {LH.Artifacts.ClientRect} cr
 */
function getClientRectArea(cr) {
  return cr.width * cr.height;
}

/**
 * @param {LH.Artifacts.TapTarget} target
 */
function getLargestClientRect(target) {
  let largestBcr = target.clientRects[0];
  for (const bcr of target.clientRects) {
    if (getClientRectArea(bcr) > getClientRectArea(largestBcr)) {
      largestBcr = bcr;
    }
  }
  return largestBcr;
}

/**
 *
 * @param {LH.Artifacts.TapTarget[]} targets
 */
function getTooSmallTargets(targets) {
  return targets.filter(targetIsTooSmall);
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
        'Interactive elements like buttons and links should be large enough, and have enough space around them, to be easy enough to tap without overlapping onto other elements. [Learn more](https://developers.google.com/web/fundamentals/accessibility/accessible-styles#multi-device_responsive_design).',
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

    const tooClose = getTooCloseTargets(artifacts.TapTargets);

    /** @type {Array<LH.Audit.TooSmallTapTargetItem>} */
    const tableItems = [];

    tooSmallTargets.forEach(target => {
      const largestBcr = getLargestClientRect(target);
      const largestClientRectArea = getClientRectArea(largestBcr);
      const size =
        Math.floor(largestBcr.width) + 'x' + Math.floor(largestBcr.height);
      // todo: better name for this var
      const overlappingTargets = tooClose.filter(
        tooClose => tooClose.targetA === target
      );

      /**
       * @param {{targetB: LH.Audit.DetailsRendererNodeDetailsJSON, extraDistanceNeeded: number}} args
       * @returns {LH.Audit.TooSmallTapTargetItem}
       */
      function makeItem({targetB, extraDistanceNeeded}) {
        return {
          // todo: include path etc
          targetA: {
            type: 'node',
            snippet: target.snippet,
          },
          // todo: should not be type node if it's not a node...
          targetB,
          size,
          extraDistanceNeeded,
          largestClientRectArea,
        };
      }
      if (overlappingTargets.length > 0) {
        overlappingTargets.forEach(({targetB, overlap}) => {
          tableItems.push(
            makeItem({
              targetB: {
                type: 'node',
                snippet: targetB.snippet,
              },
              extraDistanceNeeded: overlap,
            })
          );
        });
      } else {
        tableItems.push(
          makeItem({
            targetB: {type: 'node', snippet: 'n/a'},
            extraDistanceNeeded: 0,
          })
        );
      }
    });

    tableItems.sort((a, b) => {
      /**
       * @param {LH.Audit.TooSmallTapTargetItem} failure
       */
      function getFailureSeriousness(failure) {
        let magnitude = failure.largestClientRectArea;
        if (failure.extraDistanceNeeded) {
          magnitude -= failure.extraDistanceNeeded * 10000;
        }
        return magnitude;
      }
      return getFailureSeriousness(a) - getFailureSeriousness(b);
    });

    const headings = [
      {key: 'targetA', itemType: 'node', text: 'Element 1'},
      {key: 'issue', itemType: 'text', text: 'Size (px)'},
      {key: 'targetB', itemType: 'node', text: 'Element that\'s too close'},
    ];

    // todo: figure out how to fix ts failure here
    // "[x: string]: any" on TooSmallTapTarget fixes it, but seems bad
    const details = Audit.makeTableDetails(headings, tableItems);

    let displayValue;
    if (tableItems.length) {
      displayValue =
        tableItems.length > 1
          ? `${tableItems.length} issues found`
          : '1 issue found';
    }

    const scorePerElement = new Map();
    artifacts.TapTargets.forEach(target => {
      scorePerElement.set(target, 1);
    });
    tooClose.forEach(({targetA}) => {
      scorePerElement.set(targetA, 0);
    });

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

    return {
      rawValue: tooClose.length === 0,
      score,
      details,
      displayValue,
    };
  }
}

TapTargets.FINGER_SIZE_PX = FINGER_SIZE_PX;

module.exports = TapTargets;
