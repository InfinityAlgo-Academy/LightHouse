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
  getRectOverlapArea,
  getRectAtCenter,
  allRectsContainedWithinEachOther,
  getLargestRect,
} = require('../../lib/rect-helpers');
const {
  getTappableRectsFromClientRects,
} = require('../../lib/tappable-rects');
const FINGER_SIZE_PX = 48;


/**
 * @param {LH.Artifacts.Rect} targetCR
 * @param {LH.Artifacts.Rect} maybeOverlappingCR
 */
function getOverlapFailure(targetCR, maybeOverlappingCR) {
  const fingerRect = getRectAtCenter(targetCR, FINGER_SIZE_PX);
  // Score indicates how much area of each target the finger overlaps with
  // when the user taps on the targetCR
  const tapTargetScore = getRectOverlapArea(fingerRect, targetCR);
  const maybeOverlappingScore = getRectOverlapArea(fingerRect, maybeOverlappingCR);

  const overlapScoreRatio = maybeOverlappingScore / tapTargetScore;
  if (overlapScoreRatio < 0.25) {
    // low score means it's clear that the user tried to tap on the targetCR,
    // rather than the other tap target client rect
    return null;
  }

  return {
    overlapScoreRatio,
    tapTargetScore,
    overlappingTargetScore: maybeOverlappingScore,
  };
}

/**
 *
 * @param {LH.Artifacts.TapTarget} tapTarget
 * @param {LH.Artifacts.TapTarget[]} allTapTargets
 */
function getTooCloseTargets(tapTarget, allTapTargets) {
  /** @type LH.Audit.TapTargetOverlapDetail[] */
  const failures = [];

  for (const maybeOverlappingTarget of allTapTargets) {
    if (maybeOverlappingTarget === tapTarget) {
      // checking the same target with itself, skip
      continue;
    }

    const failure = getTargetTooCloseFailure(tapTarget, maybeOverlappingTarget);
    if (failure) {
      failures.push(failure);
    }
  }

  return failures;
}

/**
 * @param {LH.Artifacts.TapTarget} tapTarget
 * @param {LH.Artifacts.TapTarget} maybeOverlappingTarget
 * @returns {LH.Audit.TapTargetOverlapDetail | null}
 */
function getTargetTooCloseFailure(tapTarget, maybeOverlappingTarget) {
  const tappableRects = getTappableRectsFromClientRects(tapTarget.clientRects);
  const isHttpOrHttpsLink = /https?:\/\//.test(tapTarget.href);
  if (isHttpOrHttpsLink && tapTarget.href === maybeOverlappingTarget.href) {
    // no overlap because same target action
    return null;
  }

  /** @type LH.Audit.TapTargetOverlapDetail | null */
  let greatestFailure = null;
  tappableRects.forEach(targetCR => {
    if (allRectsContainedWithinEachOther(tappableRects, maybeOverlappingTarget.clientRects)) {
      // If one tap target is fully contained within the other that's
      // probably intentional (e.g. an item with a delete button inside)
      return;
    }
    maybeOverlappingTarget.clientRects.forEach(maybeOverlappingCR => {
      const failure = getOverlapFailure(targetCR, maybeOverlappingCR);
      if (failure) {
        // only update our state if this was the biggest failure we've seen for this pair
        if (!greatestFailure ||
          failure.overlapScoreRatio > greatestFailure.overlapScoreRatio) {
          greatestFailure = {
            ...failure,
            tapTarget,
            overlappingTarget: maybeOverlappingTarget,
          };
        }
      }
    });
  });
  return greatestFailure;
}

/**
 * @param {LH.Artifacts.Rect} cr
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
 *
 * @param {LH.Artifacts.TapTarget[]} tooSmallTargets
 * @param {LH.Artifacts.TapTarget[]} allTargets
 */
function getOverlapFailures(tooSmallTargets, allTargets) {
  /** @type {LH.Audit.TapTargetOverlapDetail[]} */
  const failures = [];

  tooSmallTargets.forEach(target => {
    const overlappingTargets = getTooCloseTargets(
      target,
      allTargets
    );

    if (overlappingTargets.length > 0) {
      overlappingTargets.forEach(
        (targetOverlapDetail) => {
          failures.push(targetOverlapDetail);
        }
      );
    }
  });

  return failures;
}

/**
 * @param {LH.Audit.TapTargetOverlapDetail[]} overlapFailures
 */
function getTableItems(overlapFailures) {
  const tableItems = overlapFailures.map(
    ({
      tapTarget,
      overlappingTarget,
      overlappingTargetScore,
      tapTargetScore,
      overlapScoreRatio,
    }) => {
      const largestCr = getLargestRect(tapTarget.clientRects);
      const width = Math.floor(largestCr.width);
      const height = Math.floor(largestCr.height);
      const size = width + 'x' + height;
      return {
        tapTarget: targetToTableNode(tapTarget),
        overlappingTarget: targetToTableNode(overlappingTarget),
        size,
        width,
        height,
        overlappingTargetScore,
        overlapScoreRatio,
        tapTargetScore,
      };
    });

  tableItems.sort((a, b) => {
    return b.overlapScoreRatio - a.overlapScoreRatio;
  });

  return tableItems;
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
    const overlapFailures = getOverlapFailures(tooSmallTargets, artifacts.TapTargets);
    const tableItems = getTableItems(overlapFailures);

    const headings = [
      {key: 'tapTarget', itemType: 'node', text: 'Tap Target'},
      {key: 'size', itemType: 'text', text: 'Size'},
      {key: 'overlappingTarget', itemType: 'node', text: 'Overlapping Target'},
    ];

    const details = Audit.makeTableDetails(headings, tableItems);

    const tapTargetCount = artifacts.TapTargets.length;
    const failingTapTargetCount = new Set(overlapFailures.map(f => f.tapTarget)).size;
    const passingTapTargetCount = tapTargetCount - failingTapTargetCount;

    const score = tapTargetCount > 0 ? passingTapTargetCount / tapTargetCount : 1;
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
