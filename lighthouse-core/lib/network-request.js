/**
 * @license Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/**
 * @fileoverview Fills most of the role of NetworkManager and NetworkRequest classes from DevTools.
 * @see https://cs.chromium.org/chromium/src/third_party/blink/renderer/devtools/front_end/sdk/NetworkRequest.js
 * @see https://cs.chromium.org/chromium/src/third_party/blink/renderer/devtools/front_end/sdk/NetworkManager.js
 */

const URL = require('./url-shim');

const SECURE_SCHEMES = ['data', 'https', 'wss', 'blob', 'chrome', 'chrome-extension', 'about'];

/** @type {Record<LH.Crdp.Page.ResourceType, LH.Crdp.Page.ResourceType>} */
const RESOURCE_TYPES = {
  XHR: 'XHR',
  Fetch: 'Fetch',
  EventSource: 'EventSource',
  Script: 'Script',
  Stylesheet: 'Stylesheet',
  Image: 'Image',
  Media: 'Media',
  Font: 'Font',
  Document: 'Document',
  TextTrack: 'TextTrack',
  WebSocket: 'WebSocket',
  Other: 'Other',
  Manifest: 'Manifest',
};

module.exports = class NetworkRequest {
  constructor() {
    this.requestId = '';
    this._requestId = '';
    // TODO(phulce): remove default DevTools connectionId
    this.connectionId = '0';
    this.connectionReused = false;

    this.url = '';
    this._url = '';
    this.protocol = '';
    this.isSecure = false;
    this.parsedURL = /** @type {LH.WebInspector.ParsedURL} */ ({scheme: ''});
    this.documentURL = '';

    this.startTime = -1;
    /** @type {number} */
    this.endTime = -1;
    /** @type {number} */
    this._responseReceivedTime = -1;

    this.transferSize = 0;
    this._resourceSize = 0;
    this._fromDiskCache = false;
    this._fromMemoryCache = false;

    this.finished = false;
    this.requestMethod = '';
    this.statusCode = -1;
    /** @type {NetworkRequest|undefined} The network request that redirected to this one */
    this.redirectSource = undefined;
    /** @type {NetworkRequest|undefined} The network request that this one redirected to */
    this.redirectDestination = undefined;
    /** @type {NetworkRequest[]|undefined} The chain of network requests that redirected to this one */
    this.redirects = undefined;
    this.failed = false;
    this.localizedFailDescription = '';

    this._initiator = /** @type {LH.Crdp.Network.Initiator} */ ({type: 'other'});
    /** @type {LH.Crdp.Network.ResourceTiming|undefined} */
    this._timing = undefined;
    /** @type {LH.Crdp.Page.ResourceType|undefined} */
    this._resourceType = undefined;
    this._mimeType = '';
    this.priority = () => /** @type {LH.Crdp.Network.ResourcePriority} */ ('Low');
    /** @type {() => NetworkRequest|undefined} */
    this.initiatorRequest = () => undefined;
    /** @type {LH.WebInspector.HeaderValue[]} */
    this._responseHeaders = [];

    this._fetchedViaServiceWorker = false;
    /** @type {string|undefined} */
    this._frameId = '';
    this._isLinkPreload = false;

    // Make sure we're compatible with old WebInspector.NetworkRequest
    // eslint-disable-next-line no-unused-vars
    const record = /** @type {LH.WebInspector.NetworkRequest} */ (this);
  }

  /**
   * @param {NetworkRequest} initiator
   */
  setInitiatorRequest(initiator) {
    this.initiatorRequest = () => initiator;
  }

  /**
   * @param {LH.Crdp.Network.RequestWillBeSentEvent} data
   */
  onRequestWillBeSent(data) {
    this.requestId = data.requestId;
    this._requestId = data.requestId;

    const url = new URL(data.request.url);
    this.url = data.request.url;
    this._url = data.request.url;
    this.documentURL = data.documentURL;
    this.parsedURL = {
      scheme: url.protocol.split(':')[0],
      // Intentional, DevTools uses different terminology
      host: url.hostname,
      securityOrigin: () => url.origin,
    };
    this.isSecure = SECURE_SCHEMES.includes(this.parsedURL.scheme);

    this.startTime = data.timestamp;

    this.requestMethod = data.request.method;

    this._initiator = data.initiator;
    this._resourceType = data.type && RESOURCE_TYPES[data.type];
    this.priority = () => data.request.initialPriority;

    this._frameId = data.frameId;
    this._isLinkPreload = data.initiator.type === 'preload' || !!data.request.isLinkPreload;
  }

  onRequestServedFromCache() {
    this._fromMemoryCache = true;
  }

  /**
   * @param {LH.Crdp.Network.ResponseReceivedEvent} data
   */
  onResponseReceived(data) {
    this._onResponse(data.response, data.timestamp, data.type);
    this._frameId = data.frameId;
  }

  /**
   * @param {LH.Crdp.Network.DataReceivedEvent} data
   */
  onDataReceived(data) {
    this._resourceSize += data.dataLength;
    if (data.encodedDataLength !== -1) {
      this.transferSize += data.encodedDataLength;
    }
  }

  /**
   * @param {LH.Crdp.Network.LoadingFinishedEvent} data
   */
  onLoadingFinished(data) {
    // On some requests DevTools can send duplicate events, prefer the first one for best timing data
    if (this.finished) return;

    this.finished = true;
    this.endTime = data.timestamp;
    if (data.encodedDataLength >= 0) {
      this.transferSize = data.encodedDataLength;
    }

    this._updateResponseReceivedTimeIfNecessary();
  }

  /**
   * @param {LH.Crdp.Network.LoadingFailedEvent} data
   */
  onLoadingFailed(data) {
    // On some requests DevTools can send duplicate events, prefer the first one for best timing data
    if (this.finished) return;

    this.finished = true;
    this.endTime = data.timestamp;

    this.failed = true;
    this._resourceType = data.type && RESOURCE_TYPES[data.type];
    this.localizedFailDescription = data.errorText;

    this._updateResponseReceivedTimeIfNecessary();
  }

  /**
   * @param {LH.Crdp.Network.ResourceChangedPriorityEvent} data
   */
  onResourceChangedPriority(data) {
    this.priority = () => data.newPriority;
  }

  /**
   * @param {LH.Crdp.Network.RequestWillBeSentEvent} data
   */
  onRedirectResponse(data) {
    if (!data.redirectResponse) throw new Error('Missing redirectResponse data');
    this._onResponse(data.redirectResponse, data.timestamp, data.type);
    this._resourceType = undefined;
    this.finished = true;
    this.endTime = data.timestamp;

    this._updateResponseReceivedTimeIfNecessary();
  }

  /**
   * @param {LH.Crdp.Network.Response} response
   * @param {number} timestamp
   * @param {LH.Crdp.Network.ResponseReceivedEvent['type']=} resourceType
   */
  _onResponse(response, timestamp, resourceType) {
    this.url = response.url;
    this._url = response.url;

    this.connectionId = String(response.connectionId);
    this.connectionReused = response.connectionReused;

    if (response.protocol) this.protocol = response.protocol;

    this._responseReceivedTime = timestamp;

    this.transferSize = response.encodedDataLength;
    if (typeof response.fromDiskCache === 'boolean') this._fromDiskCache = response.fromDiskCache;

    this.statusCode = response.status;

    this._timing = response.timing;
    if (resourceType) this._resourceType = RESOURCE_TYPES[resourceType];
    this._mimeType = response.mimeType;
    this._responseHeaders = NetworkRequest._headersDictToHeadersArray(response.headers);

    this._fetchedViaServiceWorker = !!response.fromServiceWorker;

    if (this._fromMemoryCache) this._timing = undefined;
    if (this._timing) this._recomputeTimesWithResourceTiming(this._timing);
  }

  /**
   * Resolve differences between conflicting timing signals. Based on the property setters in DevTools.
   * @see https://github.com/ChromeDevTools/devtools-frontend/blob/56a99365197b85c24b732ac92b0ac70feed80179/front_end/sdk/NetworkRequest.js#L485-L502
   * @param {LH.Crdp.Network.ResourceTiming} timing
   */
  _recomputeTimesWithResourceTiming(timing) {
    // Take startTime and responseReceivedTime from timing data for better accuracy.
    // Timing's requestTime is a baseline in seconds, rest of the numbers there are ticks in millis.
    this.startTime = timing.requestTime;
    const headersReceivedTime = timing.requestTime + timing.receiveHeadersEnd / 1000;
    if (!this._responseReceivedTime || this._responseReceivedTime < 0) {
      this._responseReceivedTime = headersReceivedTime;
    }

    this._responseReceivedTime = Math.min(this._responseReceivedTime, headersReceivedTime);
    this._responseReceivedTime = Math.max(this._responseReceivedTime, this.startTime);
    this.endTime = Math.max(this.endTime, this._responseReceivedTime);
  }

  /**
   * Update responseReceivedTime to the endTime if endTime is earlier.
   * A response can't be received after the entire request finished.
   */
  _updateResponseReceivedTimeIfNecessary() {
    this._responseReceivedTime = Math.min(this.endTime, this._responseReceivedTime);
  }

  /**
   * Convert the requestId to backend-version by removing the `:redirect` portion
   *
   * @param {string} requestId
   * @return {string}
   */
  static getRequestIdForBackend(requestId) {
    return requestId.replace(/(:redirect)+$/, '');
  }

  /**
   * Based on DevTools NetworkManager.
   * @see https://github.com/ChromeDevTools/devtools-frontend/blob/3415ee28e86a3f4bcc2e15b652d22069938df3a6/front_end/sdk/NetworkManager.js#L285-L297
   * @param {LH.Crdp.Network.Headers} headersDict
   * @return {Array<LH.WebInspector.HeaderValue>}
   */
  static _headersDictToHeadersArray(headersDict) {
    const result = [];
    for (const name of Object.keys(headersDict)) {
      const values = headersDict[name].split('\n');
      for (let i = 0; i < values.length; ++i) {
        result.push({name: name, value: values[i]});
      }
    }
    return result;
  }

  static get TYPES() {
    return RESOURCE_TYPES;
  }
};
