/**
 * @license Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/**
 * @fileoverview Audits a page to make sure there are no newer CSS/JS/HTML
 * features used that may not be indexed properly by Google Search. Search
 * uses Chrome 41 and may lack those features to render the page properly.
 * known vulnerabilities being used. Browser data is provided by
 * third-party/caniuse/db.json and chromestatus.com for the feature id -> name
 * mappings.
 */


const Audit = require('../audit');

const caniuseDB = require('../../../third-party/caniuse/db.json');
const blinkCSSProps = require('../../../third-party/chromestatus/cssprops.json');
const blinkFeatures = require('../../../third-party/chromestatus/features.json');

const GOOGLE_SEARCH_CHROME_VERSION = 41;

// Hand crafted list of Blink feature names -> caniuse.com feature names.
const BlinkFeatureNameToCaniuseName = {
  AddEventListenerPassiveTrue: 'passive-event-listener',
  AddEventListenerPassiveFalse: 'passive-event-listener',
  PromiseConstructor: 'promises',
  PromiseResolve: 'promises',
  PromiseReject: 'promises',
  V8PromiseChain: 'promises',
  DocumentRegisterElement: 'custom-elements',
  V0CustomElementsRegisterHTMLCustomTag: 'custom-elements',
  V0CustomElementsCreateCustomTagElement: 'custom-elements',
  V0CustomElementsRegisterHTMLTypeExtension: 'custom-elements',
  V0CustomElementsCreateTypeExtensionElement: 'custom-elements',
  CSSSelectorPseudoMatches: 'css-matches-pseudo',
  CustomElementRegistryDefine: 'custom-elementsv1',
  ElementAttachShadow: 'shadowdomv1',
  ElementAttachShadowOpen: 'shadowdomv1',
  ElementAttachShadowClosed: 'shadowdomv1',
  CSSSelectorPseudoSlotted: 'shadowdomv1',
  HTMLSlotElement: 'shadowdomv1',
  CSSSelectorPseudoHost: 'shadowdom',
  ElementCreateShadowRoot: 'shadowdom',
  CSSSelectorPseudoShadow: 'shadowdom',
  CSSSelectorPseudoContent: 'shadowdom',
  CSSSelectorPseudoHostContext: 'shadowdom',
  HTMLShadowElement: 'shadowdom',
  HTMLContentElement: 'shadowdom',
  LinkRelPreconnect: 'link-rel-preconnect',
  LinkRelPreload: 'link-rel-preload',
  HTMLImports: 'imports',
  HTMLImportsAsyncAttribute: 'imports',
  LinkRelModulePreload: 'es6-module',
  V8BroadcastChannel_Constructor: 'broadcastchannel',
  Fetch: 'fetch',
  GlobalCacheStorage: 'cachestorage', // missing: https://github.com/Fyrd/caniuse/issues/3122
  OffMainThreadFetch: 'fetch',
  IntersectionObserver_Constructor: 'intersectionobserver',
  V8Window_RequestIdleCallback_Method: 'requestidlecallback',
  NotificationPermission: 'notifications',
  UnprefixedPerformanceTimeline: 'user-timing',
  V8Element_GetBoundingClientRect_Method: 'getboundingclientrect',
  AddEventListenerThirdArgumentIsObject: 'once-event-listener', // TODO: not a perfect match.
  // TODO: appears to be no UMA tracking for classes, async/await, spread, and
  // other newer js features. Those aren't being caught here.
  contain: 'css-containment',
  'tab-size': 'css3-tabsize',
  // Explicitly disabled by search https://developers.google.com/search/docs/guides/rendering
  UnprefixedIndexedDB: 'indexeddb',
  DocumentCreateEventWebGLContextEvent: 'webgl',
  CSSGridLayout: 'css-grid',
  CSSValueDisplayContents: 'css-display-contents',
  CSSPaintFunction: 'css-paint-api',
  WorkerStart: 'webworkers',
  ServiceWorkerControlledPage: 'serviceworkers',
  // CookieGet:
  // CookieSet
};

/**
 * Returns true if `feature` is supported by the Google Search bot.
 * @param {string} feature caniuse.com feature name/id.
 * @return {boolean} True if the feature is (likely) supported by Google Search.
 */
function supportedByGoogleSearch(feature) {
  const data = caniuseDB[feature];
  if (!data) {
    return null;
  }
  const support = data.stats.chrome[GOOGLE_SEARCH_CHROME_VERSION];
  // TODO: flag 'p', partial support / polyfill available.
  return support === 'y';
}

/**
 * Returns the HTML/CSS/JS feature names used by the page.
 * @param {!Array} traceOfTab Trace events from the main thread.
 * @return {!Object}
 */
function getFeaturesUsed(traceOfTab) {
  const blinkFeatureEvents = traceOfTab.mainThreadEvents.filter(e =>
      e.cat.includes('disabled-by-default-blink.feature_usage'));

  const cssPropMap = new Map(blinkCSSProps);
  const featureMap = new Map(blinkFeatures);

  const usage = blinkFeatureEvents.reduce((usage, e) => {
    if (!(e.name in usage)) {
      usage[e.name] = [];
    }
    const id = e.args.feature;
    const isCSS = e.name === 'CSSFirstUsed';
    const name = isCSS ? cssPropMap.get(id) : featureMap.get(id);
    usage[e.name].push({id, name, ts: e.ts, css: isCSS});
    return usage;
  }, {});

  // Unique events based on feature property id.
  return Object.values([...usage.FeatureFirstUsed, ...usage.CSSFirstUsed]);
}

class UsedFeaturesMissinFromSearch extends Audit {
  /**
   * @return {!AuditMeta}
   */
  static get meta() {
    return {
      category: 'SEO',
      name: 'search-features',
      description: 'Uses features supported by Google Search',
      failureDescription: 'Does not use features that could cause rendering ' +
          'issues for search engines',
      helpText: 'Search engines may not be able to render pages that use newer features without ' +
          'a fallback. [Learn more](https://developers.google.com/search/docs/guides/rendering).',
      requiredArtifacts: ['traces'],
    };
  }

  /**
   * @param {!Artifacts} artifacts
   * @return {!AuditResult}
   */
  static audit(artifacts) {
    const trace = artifacts.traces[UsedFeaturesMissinFromSearch.DEFAULT_PASS];

    return artifacts.requestTraceOfTab(trace).then(traceOfTab => {
      const featuresUsed = getFeaturesUsed(traceOfTab);

      // Map data in correct format to create a table
      const results = Array.from(featuresUsed).map(feature => {
        const caniuseName = BlinkFeatureNameToCaniuseName[feature.name];
        const supported = supportedByGoogleSearch(caniuseName);
        return {
          featureName: feature.css ? `CSS ${feature.name}` : feature.name,
          caniuse: {
            name: caniuseName,
            text: `caniuse.com/#feat=${caniuseName}`,
            url: `https://caniuse.com/#feat=${caniuseName}`,
            type: 'link',
          },
          supported,
        };
      })
      .filter(result => result.caniuse.name && !result.supported);

      const headings = [
        {key: 'featureName', itemType: 'text', text: 'Feature'},
        {key: 'caniuse', itemType: 'link', text: 'Browser support'},
      ];

      const details = UsedFeaturesMissinFromSearch.makeTableDetails(headings, results, {});

      let displayValue;
      if (results.length) {
        displayValue = results.length > 1 ?
          `${results.length} potential issues` : '1 potential issue';
      }

      return {
        rawValue: results.length === 0,
        details,
        displayValue,
      };
    });
  }
}

module.exports = UsedFeaturesMissinFromSearch;
