/**
 * @license
 * Copyright 2019 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS-IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';

/**
 * @fileoverview This file dislays a screenshot of the page with a particular element being
 * highlighted.
 */

/* globals self  */

class ElementScreenshotRenderer {
  static renderClipPath(dom, clipId, {top, bottom, left, right}) {
    const clipPathSvg = dom.createElement('div');
    clipPathSvg.innerHTML = `<svg height="0" width="0">
        <defs>
          <clipPath id='${clipId}' clipPathUnits='objectBoundingBox'>
            <polygon points="0,0  1,0  1,${top} 0,${top}" ></polygon>
            <polygon points="0,${bottom} 1,${bottom} 1,1 0,1" ></polygon>
            <polygon points="0,${top} ${left},${top} ${left},${bottom} 0,${bottom}" ></polygon>
            <polygon points="${right},${top} 1,${top} 1,${bottom} ${right},${bottom}" ></polygon>
          </clipPath>
        </defs>
      </svg>`;
    return clipPathSvg;
  }

  /**
   * @param {DOM} dom
   * @param {ParentNode} templateContext
   * @param {LH.Audit.Details.NodeValue} item
   * @return {Element}
   */
  static render(dom, templateContext, item, fullPageScreenshotAuditResult) {

    const fullpageScreenshotUrl = fullPageScreenshotAuditResult.details.data

    const tmpl = dom.cloneTemplate('#tmpl-lh-element-screenshot', templateContext);
    const previewContainer = dom.find('.lh-element-screenshot', tmpl);

    // todo: support desktop screenshots
    const previewWidth = 412;
    const previewHeight = 300;
    const boundingRect = /** @type {LH.Artifacts.Rect} */ (item.boundingRect);
    // todo: is this really what this is?
    const CONTEXT_SPACE_ABOVE_ELEMENT = 20
    const elementOffsetTopWithinPreview = Math.max(CONTEXT_SPACE_ABOVE_ELEMENT, previewHeight / 2 - boundingRect.height / 2);
    const elementOffsetLeftWithinPreview = Math.max(CONTEXT_SPACE_ABOVE_ELEMENT, previewWidth / 2 - boundingRect.width / 2);

    // todo: seems like the el marker is always too far to the left, fix that

    // window.keepForDebug = true
    // console.log(item, boundingRect)
    const image = /** @type {HTMLElement} */
        (previewContainer.querySelector('.lh-element-screenshot__image'));
    image.style.width = previewWidth + 'px';
    image.style.height = previewHeight + 'px';
    image.style.backgroundImage = 'url(' + fullpageScreenshotUrl + ')';
    image.style.backgroundPositionY = -(boundingRect.top - elementOffsetTopWithinPreview) + 'px';
    image.style.backgroundPositionX = -(boundingRect.left - elementOffsetLeftWithinPreview) + 'px';

    const elMarker = /** @type {HTMLElement} */
        (previewContainer.querySelector('.lh-element-screenshot__element-marker'));
    elMarker.style.width = boundingRect.width + 'px';
    elMarker.style.height = boundingRect.height + 'px';
    elMarker.style.left = elementOffsetLeftWithinPreview + 'px';
    elMarker.style.top = elementOffsetTopWithinPreview + 'px';

    const mask = /** @type {HTMLElement} */
        (previewContainer.querySelector('.lh-element-screenshot__mask'));
    const clipId = 'clip-' + Math.floor(Math.random() * 100000000);
    mask.style.width = previewWidth + 'px';
    mask.style.height = previewHeight + 'px';
    mask.style.clipPath = 'url(#' + clipId + ')';

    const top = elementOffsetTopWithinPreview / previewHeight;
    // debugger
    const bottom = top + boundingRect.height / previewHeight;
    const left = elementOffsetLeftWithinPreview / previewWidth;
    const right = left + boundingRect.width / previewWidth;
    mask.appendChild(
        ElementScreenshotRenderer.renderClipPath(dom, clipId, {top, bottom, left, right})
    );

    return previewContainer;
  }
}

// Allow Node require()'ing.
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ElementScreenshotRenderer;
} else {
  self.ElementScreenshotRenderer = ElementScreenshotRenderer;
}
