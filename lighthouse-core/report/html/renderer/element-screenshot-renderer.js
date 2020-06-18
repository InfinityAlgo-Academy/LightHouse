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
   * @param {Rect} clipRect
   * @param {Size} viewport
   * @param {Size} screenshotSize
   */
  static getScreenshotPositions(clipRect, viewport, screenshotSize) {
    const clipCenter = RectHelpers.getRectCenterPoint(clipRect);

    // Try to center clipped region.
    const screenshotLeftVisibleEdge = clamp(
      clipCenter.x - viewport.width / 2,
      0, screenshotSize.width - viewport.width
    );
    const screenshotTopVisisbleEdge = clamp(
      clipCenter.y - viewport.height / 2,
      0, screenshotSize.height - viewport.height
    );

    return {
      screenshot: {
        left: screenshotLeftVisibleEdge,
        top: screenshotTopVisisbleEdge,
      },
      clip: {
        left: clipRect.left - screenshotLeftVisibleEdge,
        top: clipRect.top - screenshotTopVisisbleEdge,
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
    const containerEl = dom.find('.lh-container', dom.document());
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
        const clipRect = {
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
          clipRect,
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
   * @param {LH.Artifacts.Rect} clipRect Region of screenshot to highlight.
   * @param {LH.Artifacts.FullPageScreenshot} fullPageScreenshot
   * @param {Size} viewportSize Size of region to render screenshot in.
   * @return {Element}
   */
  static render(dom, templateContext, clipRect, fullPageScreenshot, viewportSize) {
    const tmpl = dom.cloneTemplate('#tmpl-lh-element-screenshot', templateContext);
    const containerEl = dom.find('.lh-element-screenshot', tmpl);

    let zoomFactor = 1;
    const viewport = {
      width: viewportSize.width,
      height: viewportSize.height,
    };

    containerEl.setAttribute('rectWidth', clipRect.width.toString());
    containerEl.setAttribute('rectHeight', clipRect.height.toString());
    containerEl.setAttribute('rectLeft', clipRect.left.toString());
    containerEl.setAttribute('rectRight', clipRect.right.toString());
    containerEl.setAttribute('rectTop', clipRect.top.toString());
    containerEl.setAttribute('rectBottom', clipRect.bottom.toString());

    // Zoom out (by double viewport but using 0.5 zoom factor) when highlighted region takes
    // up most of the viewport. This provides more context for where on the page this element is.
    /* todo: maybe only apply the width criterium in the preview screenshot (what's in the table, not the overlay) */
    // if (clipRect.height > viewportSize.height / 2 || clipRect.width > viewportSize.width / 2) {
    //   zoomFactor = 0.5;
    //   viewport.width *= 2;
    //   viewport.height *= 2;
    // }

    const intendedClipToViewportRatio = 0.75;
    const zoomRatioXY = {
      x: viewportSize.width / clipRect.width,
      // x: 1, // ignore x?
      y: viewportSize.height / clipRect.height,
    };
    const zoomRatio = intendedClipToViewportRatio * Math.min(zoomRatioXY.x, zoomRatioXY.y);
    if (zoomRatio < 1) {
      zoomFactor = zoomRatio;
      viewport.width /= zoomRatio;
      viewport.height /= zoomRatio;
    }

    viewport.width = Math.min(fullPageScreenshot.width, viewport.width);

    const positions = ElementScreenshotRenderer.getScreenshotPositions(
      clipRect,
      viewport,
      {width: fullPageScreenshot.width, height: fullPageScreenshot.height}
    );

    const contentEl = dom.find('.lh-element-screenshot__content', containerEl);
    // TODO: can all the `* zoomFactor` be replaces with setting some CSS on the container?
    // just `scale` doesn't work b/c won't change size of the element.
    // containerEl.style.transform = `scale(${zoomFactor})`;
    contentEl.style.top = `-${viewport.height * zoomFactor}px`;

    const image = dom.find('.lh-element-screenshot__image', containerEl);
    image.style.width = viewport.width * zoomFactor + 'px';
    image.style.height = viewport.height * zoomFactor + 'px';

    image.style.backgroundPositionY = -(positions.screenshot.top * zoomFactor) + 'px';
    image.style.backgroundPositionX = -(positions.screenshot.left * zoomFactor) + 'px';
    // image.style.backgroundSize = (zoomFactor * 100) + '%';
    image.style.backgroundSize =
      `${fullPageScreenshot.width * zoomFactor}px ${fullPageScreenshot.height * zoomFactor}px`;

    const elMarker = dom.find('.lh-element-screenshot__element-marker', containerEl);
    elMarker.style.width = clipRect.width * zoomFactor + 'px';
    elMarker.style.height = clipRect.height * zoomFactor + 'px';
    elMarker.style.left = positions.clip.left * zoomFactor + 'px';
    elMarker.style.top = positions.clip.top * zoomFactor + 'px';

    const mask = dom.find('.lh-element-screenshot__mask', containerEl);
    const clipId = 'clip-' + Math.floor(Math.random() * 100000000);
    mask.style.width = viewport.width * zoomFactor + 'px';
    mask.style.height = viewport.height * zoomFactor + 'px';
    mask.style.clipPath = 'url(#' + clipId + ')';

    const top = positions.clip.top / viewport.height;
    const bottom = top + clipRect.height / viewport.height;
    const left = positions.clip.left / viewport.width;
    const right = left + clipRect.width / viewport.width;
    mask.appendChild(
      ElementScreenshotRenderer.renderClipPath(dom, clipId, {top, bottom, left, right})
    );

    return containerEl;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ElementScreenshotRenderer;
} else {
  self.ElementScreenshotRenderer = ElementScreenshotRenderer;
}
