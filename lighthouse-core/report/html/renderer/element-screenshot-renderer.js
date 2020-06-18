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
   * @param {DOM} dom
   * @param {ParentNode} templateContext
   * @param {LH.Artifacts.FullPageScreenshot} fullPageScreenshot
   */
  constructor(dom, templateContext, fullPageScreenshot) {
    this.dom = dom;
    this.templateContext = templateContext;
    this.fullPageScreenshot = fullPageScreenshot;
  }

  /**
   * @param {Rect} clipRect
   * @param {Size} viewport
   * @param {Size} screenshotSize
   */
  getScreenshotPositions(clipRect, viewport, screenshotSize) {
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
   * @param {string} clipId
   * @param {{top: number, bottom: number, left: number, right: number}} _
   */
  renderClipPath(clipId, {top, bottom, left, right}) {
    const clipPathSvg = this.dom.createElement('div');
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

  _installBackgroundImageStyle() {
    const containerEl = this.dom.find('.lh-container', this.dom.document());
    if (containerEl.querySelector('#full-page-screenshot-style')) return;

    const fullpageScreenshotUrl = this.fullPageScreenshot.data;
    const fullPageScreenshotStyleTag = this.dom.createElement('style');
    fullPageScreenshotStyleTag.id = 'full-page-screenshot-style';
    fullPageScreenshotStyleTag.innerText = `
      .lh-element-screenshot__image {
        background-image: url(${fullpageScreenshotUrl})
      }`;
    containerEl.appendChild(fullPageScreenshotStyleTag);
  }

  installOverlayFeature() {
    this._installBackgroundImageStyle();

    for (const el of this.dom.document().querySelectorAll('.lh-element-screenshot')) {
      el.addEventListener('click', () => {
        const overlay = this.dom.createElement('div');
        overlay.classList.add('lh-element-screenshot__overlay');
        const clipRect = {
          width: Number(el.getAttribute('rectWidth')),
          height: Number(el.getAttribute('rectHeight')),
          left: Number(el.getAttribute('rectLeft')),
          right: Number(el.getAttribute('rectRight')),
          top: Number(el.getAttribute('rectTop')),
          bottom: Number(el.getAttribute('rectBottom')),
        };
        overlay.appendChild(this.render(
          clipRect,
          {
            // TODO: should this be documentElement width?
            width: window.innerWidth * 0.75,
            height: window.innerHeight * 0.75,
          }
        ));
        overlay.addEventListener('click', () => {
          overlay.remove();
        });

        const containerEl = this.dom.find('.lh-container', this.dom.document());
        containerEl.appendChild(overlay);
      });
    }
  }

  /**
   * @param {LH.Artifacts.Rect} clipRect Region of screenshot to highlight.
   * @param {Size} viewportSize Size of region to render screenshot in.
   * @return {Element}
   */
  render(clipRect, viewportSize) {
    const tmpl = this.dom.cloneTemplate('#tmpl-lh-element-screenshot', this.dom.document());
    const containerEl = this.dom.find('.lh-element-screenshot', tmpl);

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

    viewport.width = Math.min(this.fullPageScreenshot.width, viewport.width);

    const positions = this.getScreenshotPositions(
      clipRect,
      viewport,
      {width: this.fullPageScreenshot.width, height: this.fullPageScreenshot.height}
    );

    const contentEl = this.dom.find('.lh-element-screenshot__content', containerEl);
    // TODO: can all the `* zoomFactor` be replaces with setting some CSS on the container?
    // just `scale` doesn't work b/c won't change size of the element.
    // containerEl.style.transform = `scale(${zoomFactor})`;
    contentEl.style.top = `-${viewport.height * zoomFactor}px`;

    const image = this.dom.find('.lh-element-screenshot__image', containerEl);
    image.style.width = viewport.width * zoomFactor + 'px';
    image.style.height = viewport.height * zoomFactor + 'px';

    image.style.backgroundPositionY = -(positions.screenshot.top * zoomFactor) + 'px';
    image.style.backgroundPositionX = -(positions.screenshot.left * zoomFactor) + 'px';
    // image.style.backgroundSize = (zoomFactor * 100) + '%';
    const backgroundSizeX = this.fullPageScreenshot.width * zoomFactor;
    const backgroundSizeY = this.fullPageScreenshot.height * zoomFactor;
    image.style.backgroundSize = `${backgroundSizeX}px ${backgroundSizeY}px`;

    const elMarker = this.dom.find('.lh-element-screenshot__element-marker', containerEl);
    elMarker.style.width = clipRect.width * zoomFactor + 'px';
    elMarker.style.height = clipRect.height * zoomFactor + 'px';
    elMarker.style.left = positions.clip.left * zoomFactor + 'px';
    elMarker.style.top = positions.clip.top * zoomFactor + 'px';

    const mask = this.dom.find('.lh-element-screenshot__mask', containerEl);
    const top = positions.clip.top / viewport.height;
    const bottom = top + clipRect.height / viewport.height;
    const left = positions.clip.left / viewport.width;
    const right = left + clipRect.width / viewport.width;

    const clipId = `clip-${top}-${bottom}-${left}-${right}`;
    mask.style.clipPath = 'url(#' + clipId + ')';
    mask.style.width = viewport.width * zoomFactor + 'px';
    mask.style.height = viewport.height * zoomFactor + 'px';

    mask.appendChild(
      this.renderClipPath(clipId, {top, bottom, left, right})
    );

    return containerEl;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ElementScreenshotRenderer;
} else {
  self.ElementScreenshotRenderer = ElementScreenshotRenderer;
}
