/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

 /**
  * @fileoverview Gathers all images used on the page with their src, size,
  *   and attribute information. Executes script in the context of the page.
  */
'use strict';

const Gatherer = require('./gatherer');
const DOMHelpers = require('../../lib/dom-helpers.js');

/* global window, getElementsInDocument, Image */

/* istanbul ignore next */
function collectImageElementInfo() {
  function getClientRect(element) {
    const clientRect = element.getBoundingClientRect();
    return {
      // manually copy the properties because ClientRect does not JSONify
      top: clientRect.top,
      bottom: clientRect.bottom,
      left: clientRect.left,
      right: clientRect.right,
    };
  }

  const allElements = getElementsInDocument();
  const allImageElements = allElements.filter(element => element.localName === 'img');

  const htmlImages = allImageElements.map(element => {
    return {
      // currentSrc used over src to get the url as determined by the browser
      // after taking into account srcset/media/sizes/etc.
      src: element.currentSrc,
      clientWidth: element.clientWidth,
      clientHeight: element.clientHeight,
      clientRect: getClientRect(element),
      naturalWidth: element.naturalWidth,
      naturalHeight: element.naturalHeight,
      isCss: false,
      isLikelySprite: false,
      isPicture: element.parentElement.tagName === 'PICTURE',
    };
  });

  // Chrome normalizes background image style from getComputedStyle to be an absolute URL in quotes.
  // Only match basic background-image: url("http://host/image.jpeg") declarations
  const CSS_URL_REGEX = /^url\("([^"]+)"\)$/;
  // Only find images that aren't specifically scaled
  const CSS_SIZE_REGEX = /(auto|contain|cover)/;

  const cssImages = allElements.reduce((images, element) => {
    const style = window.getComputedStyle(element);
    if (!CSS_URL_REGEX.test(style.backgroundImage) ||
        !CSS_SIZE_REGEX.test(style.backgroundSize)) {
      return images;
    }

    const imageMatch = style.backgroundImage.match(CSS_URL_REGEX);
    const url = imageMatch[1];

    images.push({
      src: url,
      clientWidth: element.clientWidth,
      clientHeight: element.clientHeight,
      clientRect: getClientRect(element),
      // CSS Images do not expose natural size, we'll determine the size later
      naturalWidth: Number.MAX_VALUE,
      naturalHeight: Number.MAX_VALUE,
      isCss: true,
      isPicture: false,
    });

    return images;
  }, []);

  // Find likely sprite sheets in css image usage records
  for (const image of cssImages) {
    image.isLikelySprite = cssImages.filter(candidate => candidate.src === image.src).length > 2;
  }

  return htmlImages.concat(cssImages);
}

/* istanbul ignore next */
function determineNaturalSize(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.addEventListener('error', reject);
    img.addEventListener('load', () => {
      resolve({
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight
      });
    });

    img.src = url;
  });
}

class ImageUsage extends Gatherer {

  /**
   * @param {{src: string}} element
   * @return {!Promise<!Object>}
   */
  fetchElementWithSizeInformation(element) {
    const url = JSON.stringify(element.src);
    return this.driver.evaluateAsync(`(${determineNaturalSize.toString()})(${url})`)
      .then(size => {
        return Object.assign(element, size);
      });
  }

  /**
   * @param {{driver: !Driver}} options
   * @param {{trace: !Trace, networkRecords: !Array<!WebInspector.NetworkRequest>}} passData
   * @return {!Promise<!Array<ImageUsageRecord>>}
   */
  afterPass(options, passData) {
    const traceResults = this._traceMethod(options, passData);
    if (traceResults.length) return traceResults;
    return this._fallbackMethod(options, passData);
  }

  /**
   * @param {!Trace} trace
   * @return {!Array<!ImageUsageRecord>}
   */
  _findPaintImagesInTrace(trace) {
    const imageSizes = trace.traceEvents
      .filter(e => e.name === 'PaintImage')
      .map(e => e.args.data)
      .filter(image => image && image.url && image.srcWidth);

    const imagesByUrl = new Map();
    for (const image of imageSizes) {
      const images = imagesByUrl.get(image.url) || [];
      images.push(image);
      imagesByUrl.set(image.url, images);
    }

    let outputImages = [];
    for (const [url, images] of imagesByUrl.entries()) {
      const imagesBySize = new Map();

      for (const image of images) {
        const key = [
          image.x,
          image.y,
          image.width,
          image.height,
          image.srcWidth,
          image.srcHeight
        ].map(n => Math.round(n / 10) * 10).join(',');

        if (imagesBySize.has(key)) continue;

        imagesBySize.set(key, {
          src: url,
          naturalWidth: image.srcWidth,
          naturalHeight: image.srcHeight,
          clientWidth: image.width,
          clientHeight: image.height,
          clientRect: {
            top: image.y,
            bottom: image.y + image.height,
            left: image.x,
            right: image.x + image.width,
          },
        });
      }

      const uniqueImagesForUrl = Array.from(imagesBySize.values());
      for (const image of uniqueImagesForUrl) {
        image.isLikelySprite = uniqueImagesForUrl.length > 2;
      }

      outputImages = outputImages.concat(uniqueImagesForUrl);
    }

    return outputImages;
  }

  /**
   * @param {{trace: !Trace, networkRecords: !Array<!WebInspector.NetworkRequest>}} passData
   * @return {!Map<string, !WebInspector.NetworkRequest>}
   */
  _indexNetworkRecords(passData) {
    return passData.networkRecords.reduce((map, record) => {
      if (/^image/.test(record._mimeType) && record.finished) {
        map.set(record._url, {
          url: record.url,
          resourceSize: record.resourceSize,
          startTime: record.startTime,
          endTime: record.endTime,
          responseReceivedTime: record.responseReceivedTime,
          mimeType: record._mimeType
        });
      }

      return map;
    }, new Map());
  }

  /**
   * @param {{driver: !Driver}} options
   * @param {{trace: !Trace, networkRecords: !Array<!WebInspector.NetworkRequest>}} passData
   * @return {!Promise<!Array<ImageUsageRecord>>}
   */
  _traceMethod(options, passData) {
    const usedUrls = new Set();
    const networkRecordsByUrl = this._indexNetworkRecords(passData);
    const images = this._findPaintImagesInTrace(passData.trace).map(image => {
      usedUrls.add(image.src);
      image.networkRecord = networkRecordsByUrl.get(image.src);
      return image;
    });

    // short-circuit if we couldn't find any PaintImage events at all
    if (!images.length) return [];

    const unusedImages = [];
    for (const networkRecord of networkRecordsByUrl.values()) {
      if (usedUrls.has(networkRecord.url)) continue;
      unusedImages.push({networkRecord, src: networkRecord.url});
    }

    return images.concat(unusedImages);
  }

  /**
   * @param {{driver: !Driver}} options
   * @param {{trace: !Trace, networkRecords: !Array<!WebInspector.NetworkRequest>}} passData
   * @return {!Promise<!Array<ImageUsageRecord>>}
   */
  _fallbackMethod(options, passData) {
    const driver = this.driver = options.driver;
    const indexedNetworkRecords = this._indexNetworkRecords(passData);

    const expression = `(function() {
      ${DOMHelpers.getElementsInDocumentFnString}; // define function on page
      return (${collectImageElementInfo.toString()})();
    })()`;

    return driver.evaluateAsync(expression)
      .then(elements => {
        return elements.reduce((promise, element) => {
          return promise.then(collector => {
            // link up the image with its network record
            element.networkRecord = indexedNetworkRecords.get(element.src);

            // Images within `picture` behave strangely and natural size information isn't accurate,
            // CSS images have no natural size information at all.
            // Try to get the actual size if we can.
            const elementPromise = (element.isPicture || element.isCss) && element.networkRecord ?
                this.fetchElementWithSizeInformation(element) :
                Promise.resolve(element);

            return elementPromise.then(element => {
              collector.push(element);
              return collector;
            });
          });
        }, Promise.resolve([]));
      });
  }
}

module.exports = ImageUsage;

/** @typedef {{
 *    src: string,
 *    networkRecord: ?WebInspector.NetworkRequest,
 *    naturalWidth: ?number,
 *    naturalHeight: ?number,
 *    clientWidth: ?number,
 *    clientHeight: ?number,
 *    clientRect: ?BoundingRect,
 *  }} */
ImageUsage.ImageUsageRecord; // eslint-disable-line no-unused-expressions
