/**
 * @license Copyright 2020 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/**
 * @fileoverview This file dislays a screenshot of the page with a particular element being
 * highlighted.
 */

/* globals self RectHelpers */

/** @typedef {import('./dom.js')} DOM */
/** @typedef {LH.Artifacts.Rect} Rect */
/** @typedef {{width: number, height: number}} Size */

/**
 * @param {number} value
 * @param {number} min
 * @param {number} max
 */
function clamp(value, min, max) {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

class ElementScreenshotRenderer {
  /**
   * @param {Rect} highlightRect
   * @param {Size} viewport
   * @param {Size} screenshotSize
   */
  static getScreenshotPositionDetails(highlightRect, viewport, screenshotSize) {
    const highlightCenter = RectHelpers.getRectCenterPoint(highlightRect);

    // Try to center on highlighted area
    const screenshotLeftVisibleEdge = clamp(
      highlightCenter.x - viewport.width / 2,
      0, screenshotSize.width - viewport.width
    );
    const screenshotTopVisisbleEdge = clamp(
      highlightCenter.y - viewport.height / 2,
      0, screenshotSize.height - viewport.height
    );

    return {
      screenshot: {
        left: screenshotLeftVisibleEdge,
        top: screenshotTopVisisbleEdge,
      },
      highlight: {
        left: highlightRect.left - screenshotLeftVisibleEdge,
        top: highlightRect.top - screenshotTopVisisbleEdge,
      },
    };
  }

  /**
   * @param {DOM} dom
   * @param {string} clipId
   * @param {{top: number, bottom: number, left: number, right: number}} _
   */
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
   * @param {LH.Artifacts.FullPageScreenshot} fullPageScreenshot
   */
  static _installBackgroundImageStyle(dom, fullPageScreenshot) {
    const containerEl = dom.find('.lh-container', dom._document);
    if (containerEl.querySelector('#full-page-screenshot-style')) return;

    const fullpageScreenshotUrl = fullPageScreenshot.data;
    const fullPageScreenshotStyleTag = dom.createElement('style');
    fullPageScreenshotStyleTag.id = 'full-page-screenshot-style';
    fullPageScreenshotStyleTag.innerText = `
      .lh-element-screenshot__image {
        background-image: url(${fullpageScreenshotUrl})
      }`;
    containerEl.appendChild(fullPageScreenshotStyleTag);
  }

  /**
   * @param {DOM} dom
   * @param {ParentNode} templateContext
   * @param {LH.Artifacts.FullPageScreenshot} fullPageScreenshot
   */
  static installOverlayFeature(dom, templateContext, fullPageScreenshot) {
    ElementScreenshotRenderer._installBackgroundImageStyle(dom, fullPageScreenshot);

    for (const el of dom.document().querySelectorAll('.lh-element-screenshot')) {
      el.addEventListener('click', () => {
        const overlay = dom.createElement('div');
        overlay.classList.add('lh-element-screenshot__overlay');
        const boundingRect = {
          width: Number(el.getAttribute('rectWidth')),
          height: Number(el.getAttribute('rectHeight')),
          left: Number(el.getAttribute('rectLeft')),
          right: Number(el.getAttribute('rectRight')),
          top: Number(el.getAttribute('rectTop')),
          bottom: Number(el.getAttribute('rectBottom')),
        };
        overlay.appendChild(ElementScreenshotRenderer.render(
          dom,
          templateContext,
          boundingRect,
          fullPageScreenshot,
          {
            // TODO: should this be documentElement width?
            width: window.innerWidth * 0.75,
            height: window.innerHeight * 0.75,
          }
        ));
        document.body.appendChild(overlay);
        overlay.addEventListener('click', () => {
          overlay.remove();
        });
      });
    }
  }

  /**
   * @param {DOM} dom
   * @param {ParentNode} templateContext
   * @param {LH.Artifacts.Rect} boundingRect
   * @param {LH.Artifacts.FullPageScreenshot} fullPageScreenshot
   * @param {Size} viewportSize
   * @return {Element}
   */
  static render(dom, templateContext, boundingRect, fullPageScreenshot, viewportSize) {
    const tmpl = dom.cloneTemplate('#tmpl-lh-element-screenshot', templateContext);
    const previewContainer = dom.find('.lh-element-screenshot', tmpl);

    // TODO(cjamcl): Understand this :)

    let zoomFactor = 1;
    const viewport = {
      width: viewportSize.width,
      height: viewportSize.height,
    };

    previewContainer.setAttribute('rectWidth', boundingRect.width.toString());
    previewContainer.setAttribute('rectHeight', boundingRect.height.toString());
    previewContainer.setAttribute('rectLeft', boundingRect.left.toString());
    previewContainer.setAttribute('rectRight', boundingRect.right.toString());
    previewContainer.setAttribute('rectTop', boundingRect.top.toString());
    previewContainer.setAttribute('rectBottom', boundingRect.bottom.toString());

    // For large elements zoom out to better show where on the page they are
    /* todo: maybe only apply the width criterium in the preview screenshot */
    if (boundingRect.height > viewportSize.height / 2 || boundingRect.width > viewportSize.width / 2) {
      zoomFactor = 0.5;
      viewport.width *= 2;
      viewport.height *= 2;
    }

    viewport.width = Math.min(fullPageScreenshot.width, viewport.width);

    const positionDetails = ElementScreenshotRenderer.getScreenshotPositionDetails(
      boundingRect,
      viewport,
      fullPageScreenshot
    );

    const contentEl = /** @type {HTMLElement} */
      (previewContainer.querySelector('.lh-element-screenshot__content'));
    // contentEl.style.transform = `scale(${zoomFactor})`;
    contentEl.style.top = `-${viewport.height * zoomFactor}px`;

    const image = /** @type {HTMLElement} */
      (previewContainer.querySelector('.lh-element-screenshot__image'));
    image.style.width = viewport.width * zoomFactor + 'px';
    image.style.height = viewport.height * zoomFactor + 'px';

    image.style.backgroundPositionY = -(positionDetails.screenshot.top * zoomFactor) + 'px';
    image.style.backgroundPositionX = -(positionDetails.screenshot.left * zoomFactor) + 'px';
    // image.style.backgroundSize = (zoomFactor * 100) + '%';
    image.style.backgroundSize =
      `${fullPageScreenshot.width * zoomFactor}px ${fullPageScreenshot.height * zoomFactor}px`;

    const elMarker = /** @type {HTMLElement} */
      (previewContainer.querySelector('.lh-element-screenshot__element-marker'));
    elMarker.style.width = boundingRect.width * zoomFactor + 'px';
    elMarker.style.height = boundingRect.height * zoomFactor + 'px';
    elMarker.style.left = positionDetails.highlight.left * zoomFactor + 'px';
    elMarker.style.top = positionDetails.highlight.top * zoomFactor + 'px';

    const mask = /** @type {HTMLElement} */
      (previewContainer.querySelector('.lh-element-screenshot__mask'));
    const clipId = 'clip-' + Math.floor(Math.random() * 100000000);
    mask.style.width = viewport.width * zoomFactor + 'px';
    mask.style.height = viewport.height * zoomFactor + 'px';
    mask.style.clipPath = 'url(#' + clipId + ')';

    const top = positionDetails.highlight.top / viewport.height;
    const bottom = top + boundingRect.height / viewport.height;
    const left = positionDetails.highlight.left / viewport.width;
    const right = left + boundingRect.width / viewport.width;
    mask.appendChild(
      ElementScreenshotRenderer.renderClipPath(dom, clipId, {top, bottom, left, right})
    );

    return previewContainer;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ElementScreenshotRenderer;
} else {
  self.ElementScreenshotRenderer = ElementScreenshotRenderer;
}
