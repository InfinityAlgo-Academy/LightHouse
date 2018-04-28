/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
// eslint-disable-next-line spaced-comment
/// <reference types="css-font-loading-module" />
'use strict';

const Gatherer = require('./gatherer');
const Sentry = require('../../lib/sentry');

// All the property keys of FontFace where the value is a string and are worth
// using for finding font matches (see _findSameFontFamily).
/** @typedef {'family'|'style'|'weight'|'stretch'|'unicodeRange'|'variant'|'featureSettings'|'display'} FontFaceStringKeys */
/** @typedef {{err: {message: string, stack: string}}} FontGatherError */

/** @type {Array<FontFaceStringKeys>} */
const fontFaceDescriptors = [
  'display',
  'family',
  'featureSettings',
  'stretch',
  'style',
  'unicodeRange',
  'variant',
  'weight',
];

/* eslint-env browser*/
/**
 * Collect applied webfont data from `document.fonts`
 * @param {Array<FontFaceStringKeys>} descriptors
 * @return {Promise<Array<LH.Artifacts.Font>>}
 */
/* istanbul ignore next */
function getAllLoadedFonts(descriptors) {
  /** @param {FontFace} fontFace */
  const getFont = fontFace => {
    /** @type {Partial<LH.Artifacts.Font>} */
    const fontRule = {
      src: [],
    };
    descriptors.forEach(descriptor => {
      fontRule[descriptor] = fontFace[descriptor];
    });

    return /** @type {LH.Artifacts.Font} */ (fontRule);
  };

  return document.fonts.ready.then(() => {
    return Array.from(document.fonts).filter(fontFace => fontFace.status === 'loaded')
      .map(getFont);
  });
}

/**
 * Collect authored webfont data from the `CSSFontFaceRule`s present in document.styleSheets
 * @return {Promise<Array<LH.Artifacts.Font|FontGatherError>>}
 */
/* istanbul ignore next */
function getFontFaceFromStylesheets() {
  /**
   * Get full data about each CSSFontFaceRule within a styleSheet object
   * @param {CSSStyleSheet} stylesheet
   * @return {Array<LH.Artifacts.Font>}
   */
  function getSheetsFontFaces(stylesheet) {
    const fontUrlRegex = 'url\\((?:")([^"]+)(?:"|\')\\)';
    const fontFaceRules = [];

    if (stylesheet.cssRules) {
      for (const rule of Array.from(stylesheet.cssRules)) {
        if (rule instanceof CSSFontFaceRule) {
          const fontsObject = {
            // @ts-ignore (currently) non-standard Chrome extension to CSSStyleDeclaration
            // See disussion in https://bugzilla.mozilla.org/show_bug.cgi?id=1296373#c4
            display: rule.style.fontDisplay || 'auto',
            family: rule.style.fontFamily ? rule.style.fontFamily.replace(/"|'/g, '') : '',
            stretch: rule.style.fontStretch || 'normal',
            style: rule.style.fontStyle || 'normal',
            weight: rule.style.fontWeight || 'normal',
            variant: rule.style.fontVariant || 'normal',
            // @ts-ignore (currently) non-standard Chrome extension to CSSStyleDeclaration
            unicodeRange: rule.style.unicodeRange || 'U+0-10FFFF',
            // @ts-ignore (currently) non-standard Chrome extension to CSSStyleDeclaration
            featureSettings: rule.style.featureSettings || 'normal',
            /** @type {Array<string>} */
            src: [],
          };

          /** @type {string|undefined} */
          // @ts-ignore (currently) non-standard Chrome extension to CSSStyleDeclaration
          const src = rule.style.src;
          if (src) {
            const matches = src.match(new RegExp(fontUrlRegex, 'g'));
            if (matches) {
              matches.forEach(match => {
                const res = new RegExp(fontUrlRegex).exec(match);
                if (res) {
                  fontsObject.src.push(new URL(res[1], location.href).href);
                }
              });
            }
          }

          fontFaceRules.push(fontsObject);
        }
      }
    }

    return fontFaceRules;
  }

  /**
   * Provided a <link rel=stylesheet> element, it attempts to reload the asset with CORS headers.
   * Without CORS headers, a cross-origin stylesheet will have node.styleSheet.cssRules === null.
   * @param {HTMLLinkElement} oldNode
   * @return {Promise<Array<LH.Artifacts.Font|FontGatherError>>}
   */
  function loadStylesheetWithCORS(oldNode) {
    const newNode = /** @type {HTMLLinkElement} */ (oldNode.cloneNode(true));

    return new Promise(resolve => {
      newNode.addEventListener('load', function onload() {
        newNode.removeEventListener('load', onload);
        resolve(getFontFaceFromStylesheets());
      });
      newNode.crossOrigin = 'anonymous';
      oldNode.parentNode && oldNode.parentNode.insertBefore(newNode, oldNode);
      oldNode.remove();
    });
  }

  /** @type {Array<LH.Artifacts.Font|FontGatherError>} */
  const data = [];
  /** @type {Array<Promise<Array<LH.Artifacts.Font|FontGatherError>>>} */
  const corsDataPromises = [];
  // Get all loaded stylesheets
  for (const stylesheet of Array.from(document.styleSheets)) {
    try {
      const cssStylesheet = /** @type {CSSStyleSheet} */ (stylesheet);
      // Cross-origin stylesheets don't expose cssRules by default. We reload them w/ CORS headers.
      if (cssStylesheet.cssRules === null && cssStylesheet.href && cssStylesheet.ownerNode &&
        // @ts-ignore - crossOrigin exists if ownerNode is an HTMLLinkElement
        !cssStylesheet.ownerNode.crossOrigin) {
        const ownerLinkEl = /** @type {HTMLLinkElement} */ (cssStylesheet.ownerNode);
        corsDataPromises.push(loadStylesheetWithCORS(ownerLinkEl));
      } else {
        data.push(...getSheetsFontFaces(cssStylesheet));
      }
    } catch (err) {
      data.push({err: {message: err.message, stack: err.stack}});
    }
  }
  // Flatten results
  return Promise.all(corsDataPromises).then(corsFontFaces => data.concat(...corsFontFaces));
}
/* eslint-env node */

class Fonts extends Gatherer {
  /**
   * @param {LH.Artifacts.Font} fontFace
   * @param {Array<LH.Artifacts.Font>} fontFacesList
   * @return {LH.Artifacts.Font|undefined}
   */
  _findSameFontFamily(fontFace, fontFacesList) {
    return fontFacesList.find(fontItem => {
      return !fontFaceDescriptors.find(descriptor => {
        return fontFace[descriptor] !== fontItem[descriptor];
      });
    });
  }

  /**
   * @param {LH.Gatherer.PassContext} passContext
   * @return {Promise<LH.Artifacts['Fonts']>}
   */
  afterPass(passContext) {
    const driver = passContext.driver;
    const args = JSON.stringify(fontFaceDescriptors);
    /** @type {Promise<[Array<LH.Artifacts.Font>, Array<LH.Artifacts.Font|FontGatherError>]>} */
    const fontData = Promise.all(
      [
        driver.evaluateAsync(`(${getAllLoadedFonts.toString()})(${args})`),
        driver.evaluateAsync(`(${getFontFaceFromStylesheets.toString()})()`),
      ]
    );
    return fontData.then(([loadedFonts, fontsAndErrors]) => {
      // Filter out errors from retrieving data on font faces.
      const fontFaces = /** @type {Array<LH.Artifacts.Font>} */ (fontsAndErrors.filter(
        fontOrError => {
          // Abuse the type system a bit since `err` property isn't common between types.
          const dataError = /** @type {FontGatherError} */ (fontOrError);
          if (dataError.err) {
            const err = new Error(dataError.err.message);
            err.stack = dataError.err.stack;
            // @ts-ignore TODO(bckenny): Sentry type checking
            Sentry.captureException(err, {tags: {gatherer: 'Fonts'}, level: 'warning'});
            return false;
          }
          return true;
        }));

      return loadedFonts.map(loadedFont => {
        const fontFaceItem = this._findSameFontFamily(loadedFont, fontFaces);
        loadedFont.src = (fontFaceItem && fontFaceItem.src) || [];

        return loadedFont;
      });
    });
  }
}

module.exports = Fonts;
