/**
 * @license Copyright 2021 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/**
 * @fileoverview Fetcher is a utility for making requests within the context of the page.
 * Requests can circumvent CORS, and so are good for fetching source maps that may be hosted
 * on a different origin.
 */

const {getBrowserVersion} = require('../driver/environment.js');

/**
 * `Network.loadNetworkResource` was introduced in M88.
 * The long timeout bug with `IO.read` was fixed in M92:
 * https://bugs.chromium.org/p/chromium/issues/detail?id=1191757
 * Lightrider has a bug forcing us to use the old version for now:
 * https://docs.google.com/document/d/1V-DxgsOFMPxUuFrdGPQpyiCqSljvgNlOqXCtqDtd0b8/edit?usp=sharing&resourcekey=0-aIaIqcHFKG-0dX4MAudBEw
 * @param {LH.Gatherer.FRProtocolSession} session
 * @return {Promise<boolean>}
 */
async function shouldUseLegacyFetcher(session) {
  const {milestone} = await getBrowserVersion(session);
  return milestone < 92 || Boolean(global.isLightrider);
}

/**
 * @param {LH.Gatherer.FRProtocolSession} session
 * @param {string} handle
 * @return {Promise<string>}
 */
async function _readIOStream(session, handle) {
  let ioResponse;
  let data = '';
  while (!ioResponse || !ioResponse.eof) {
    ioResponse = await session.sendCommand('IO.read', {handle});
    const responseData = ioResponse.base64Encoded ?
      Buffer.from(ioResponse.data, 'base64').toString('utf-8') :
      ioResponse.data;
    data = data.concat(responseData);
  }

  return data;
}

/**
 * @param {LH.Gatherer.FRProtocolSession} session
 * @param {string} url
 * @return {Promise<{stream: LH.Crdp.IO.StreamHandle|null, status: number|null}>}
 */
async function _loadNetworkResource(session, url) {
  const frameTreeResponse = await session.sendCommand('Page.getFrameTree');
  const networkResponse = await session.sendCommand('Network.loadNetworkResource', {
    frameId: frameTreeResponse.frameTree.frame.id,
    url,
    options: {
      disableCache: true,
      includeCredentials: true,
    },
  });

  return {
    stream: networkResponse.resource.success ? (networkResponse.resource.stream || null) : null,
    status: networkResponse.resource.httpStatusCode || null,
  };
}

/**
 * @param {LH.Gatherer.FRProtocolSession} session
 * @param {string} url
 */
async function _fetchResourceOverProtocol(session, url) {
  const response = await _loadNetworkResource(session, url);

  const isOk = response.status && response.status >= 200 && response.status <= 299;
  if (!response.stream || !isOk) return {status: response.status, content: null};

  const content = await _readIOStream(session, response.stream);

  return {status: response.status, content};
}

/**
 * @param {LH.Gatherer.FRProtocolSession} session
 * @param {string} url
 * @param {{timeout: number}=} options timeout is in ms
 * @return {Promise<{content: string|null, status: number|null}>}
 */
async function fetchResource(session, url, options = {timeout: 2_000}) {
  /** @type {NodeJS.Timeout} */
  let timeoutHandle;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutHandle = setTimeout(reject, options.timeout, new Error('Timed out fetching resource'));
  });

  const resultPromise = _fetchResourceOverProtocol(session, url);

  return Promise.race([resultPromise, timeoutPromise])
    .finally(() => clearTimeout(timeoutHandle));
}

module.exports = {
  shouldUseLegacyFetcher,
  fetchResource,
  _loadNetworkResource,
  _readIOStream,
};
