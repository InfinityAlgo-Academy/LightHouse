/**
 * @license Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/**
 * @param {LH.Artifacts.ClientRect} cr1
 * @param {LH.Artifacts.ClientRect} cr2
 */
function rectContains(cr1, cr2) {
  /**
   * @param {LH.Artifacts.ClientRect} cr
   * @param {{x:number, y:number}} point
   */
  function rectContainsPoint(cr, {x, y}) {
    return cr.left <= x && cr.right >= x && cr.top <= y && cr.bottom >= y;
  }

  const topLeft = {
    x: cr2.left,
    y: cr2.top,
  };
  const topRight = {
    x: cr2.right,
    y: cr2.top,
  };
  const bottomLeft = {
    x: cr2.left,
    y: cr2.bottom,
  };
  const bottomRight = {
    x: cr2.right,
    y: cr2.bottom,
  };
  return (
    rectContainsPoint(cr1, topLeft) &&
    rectContainsPoint(cr1, topRight) &&
    rectContainsPoint(cr1, bottomLeft) &&
    rectContainsPoint(cr1, bottomRight)
  );
}

/**
 * Merge client rects together. This may result in a larger overall size than that of the individual client rects.
 * @param {LH.Artifacts.ClientRect[]} clientRects
 */
function simplifyClientRects(clientRects) {
  clientRects = filterOutTinyClientRects(clientRects);
  clientRects = filterOutClientRectsContainedByOthers(clientRects);
  clientRects = mergeTouchingClientRects(clientRects);
  return clientRects;
}

/**
 * @param {LH.Artifacts.ClientRect[]} clientRects
 * @returns {LH.Artifacts.ClientRect[]}
 */
function filterOutTinyClientRects(clientRects) {
  // 1x1px rect shouldn't be reason to treat the rect as something the user should tap on.
  // Often they're made invisble in some obscure way anyway, and only exit for e.g. accessibiliity.
  const nonTinyClientRects = clientRects.filter(
    rect => rect.width > 1 && rect.height > 1
  );
  if (nonTinyClientRects.length > 0) {
    return nonTinyClientRects;
  }
  return clientRects;
}

/**
 * @param {LH.Artifacts.ClientRect[]} clientRects
 * @returns {LH.Artifacts.ClientRect[]}
 */
function filterOutClientRectsContainedByOthers(clientRects) {
  return clientRects.filter(cr => {
    for (const possiblyContainingRect of clientRects) {
      if (possiblyContainingRect === cr) {
        continue;
      }
      if (rectContains(possiblyContainingRect, cr)) {
        return false;
      }
    }
    return true;
  });
}

/**
 * @param {number} a
 * @param {number} b
 */
function almostEqual(a, b) {
  return Math.abs(a - b) <= 2;
}

/**
 * @param {LH.Artifacts.ClientRect} crA
 * @param {LH.Artifacts.ClientRect} crB
 * @returns {boolean}
 */
function clientRectsTouch(crA, crB) {
  // https://stackoverflow.com/questions/2752349/fast-rectangle-to-rectangle-intersection
  return (
    crA.left <= crB.right &&
    crB.left <= crA.right &&
    crA.top <= crB.bottom &&
    crB.top <= crA.bottom
  );
}

/**
 * @param {LH.Artifacts.ClientRect[]} clientRects
 * @returns {LH.Artifacts.ClientRect[]}
 */
function mergeTouchingClientRects(clientRects) {
  for (let i = 0; i < clientRects.length; i++) {
    for (let j = i + 1; j < clientRects.length; j++) {
      const crA = clientRects[i];
      const crB = clientRects[j];

      let canMerge = false;
      const rectsLineUpHorizontally =
        almostEqual(crA.top, crB.top) || almostEqual(crA.bottom, crB.bottom);
      const rectsLineUpVertically =
        almostEqual(crA.left, crB.left) || almostEqual(crA.right, crB.right);
      if (
        clientRectsTouch(crA, crB) &&
        (rectsLineUpHorizontally || rectsLineUpVertically)
      ) {
        canMerge = true;
      }

      if (canMerge) {
        const left = Math.min(crA.left, crB.left);
        const right = Math.max(crA.right, crB.right);
        const top = Math.min(crA.top, crB.top);
        const bottom = Math.max(crA.bottom, crB.bottom);

        const replacementClientRect = addRectWidthAndHeight({
          left,
          right,
          top,
          bottom,
        });
        clientRects.push(replacementClientRect);

        clientRects.splice(i, 1);
        if (i < j) {
          j--; // update index after delete
        }
        clientRects.splice(j, 1);

        return mergeTouchingClientRects(clientRects);
      }
    }
  }

  return clientRects;
}

/**
 * @param {{left:number, top:number, right:number, bottom: number}} rect
 * @return {LH.Artifacts.ClientRect}
 */
function addRectWidthAndHeight({left, top, right, bottom}) {
  return {
    left,
    top,
    right,
    bottom,
    width: right - left,
    height: bottom - top,
  };
}

module.exports = {
  rectContains,
  simplifyClientRects,
  addRectWidthAndHeight,
};
