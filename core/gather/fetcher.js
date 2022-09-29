/**
 * @license Copyright 2020 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

/**
 * @fileoverview Fetcher is a utility for making requests to any arbitrary resource,
 * ignoring normal browser constraints such as CORS.
 */

/* global fetch */

/** @typedef {{content: string|null, status: number|null, headers: LH.Crdp.Network.Headers|null}} FetchResponse */

class Fetcher {
  /**
   * @param {LH.Gatherer.FRProtocolSession} session
   */
  constructor(session) {
    this.session = session;
  }

  /**
   * Fetches any resource using the network directly.
   *
   * @param {string} url
   * @param {{timeout?: number, responseHeaders?: string[]}=} options
   *  - timeout is in ms
   *  - responseHeaders is used to filter the resulting headers object.
   *  Sometime in the future, when Node has full Fetch support, this can be removed
   *  and instead we can just return a Headers instance. In the meantime, ask users
   *  to early-declare the headers they are interested in so we can skip some processing
   *  in the `_fetchWithFetchApi` case.
   * @return {Promise<FetchResponse>}
   */
  async fetchResource(url, options = {}) {
    const resolvedOptions = {
      timeout: options.timeout ?? 2_000,
      responseHeaders: options.responseHeaders ?? [],
    };

    // In Lightrider, `Network.loadNetworkResource` is not implemented, but fetch
    // is configured to work for any resource.
    if (global.isLightrider) {
      return this._wrapWithTimeout(
        this._fetchWithFetchApi(url, resolvedOptions), resolvedOptions.timeout);
    }

    return this._fetchResourceOverProtocol(url, resolvedOptions);
  }

  /**
   * @param {string} url
   * @param {{responseHeaders: string[]}} options
   * @return {Promise<FetchResponse>}
   */
  async _fetchWithFetchApi(url, options) {
    const response = await fetch(url);

    let content = null;
    try {
      content = await response.text();
    } catch {}

    /** @type {LH.Crdp.Network.Headers|null} */
    let headers = null;
    if (response.headers) {
      headers = {};
      for (const header of options.responseHeaders) {
        const value = response.headers.get(header);
        if (value !== null) headers[header] = value;
      }
    }

    return {
      content,
      status: response.status,
      headers,
    };
  }

  /**
   * @param {string} handle
   * @param {{timeout: number}=} options,
   * @return {Promise<string>}
   */
  async _readIOStream(handle, options = {timeout: 2_000}) {
    const startTime = Date.now();

    let ioResponse;
    let data = '';
    while (!ioResponse || !ioResponse.eof) {
      const elapsedTime = Date.now() - startTime;
      if (elapsedTime > options.timeout) {
        throw new Error('Waiting for the end of the IO stream exceeded the allotted time.');
      }
      ioResponse = await this.session.sendCommand('IO.read', {handle});
      const responseData = ioResponse.base64Encoded ?
        Buffer.from(ioResponse.data, 'base64').toString('utf-8') :
        ioResponse.data;
      data = data.concat(responseData);
    }

    return data;
  }

  /**
   * @param {string} url
   * @return {Promise<{stream: LH.Crdp.IO.StreamHandle|null, status: number|null, headers: LH.Crdp.Network.Headers|null}>}
   */
  async _loadNetworkResource(url) {
    const frameTreeResponse = await this.session.sendCommand('Page.getFrameTree');
    const networkResponse = await this.session.sendCommand('Network.loadNetworkResource', {
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
      headers: networkResponse.resource.headers || null,
    };
  }

  /**
   * @param {string} url
   * @param {{timeout: number, responseHeaders: string[]}} options timeout is in ms
   * @return {Promise<FetchResponse>}
   */
  async _fetchResourceOverProtocol(url, options) {
    const startTime = Date.now();
    const response = await this._wrapWithTimeout(this._loadNetworkResource(url), options.timeout);

    /** @type {LH.Crdp.Network.Headers|null} */
    let headers = null;
    if (response.headers) {
      headers = {};
      for (const header of options.responseHeaders) {
        if (response.headers[header] !== undefined) {
          headers[header] = response.headers[header];
        }
      }
    }

    const isOk = response.status && response.status >= 200 && response.status <= 299;
    if (!response.stream || !isOk) return {status: response.status, content: null, headers};

    const timeout = options.timeout - (Date.now() - startTime);
    const content = await this._readIOStream(response.stream, {timeout});
    return {
      status: response.status,
      content,
      headers,
    };
  }

  /**
   * @template T
   * @param {Promise<T>} promise
   * @param {number} ms
   */
  async _wrapWithTimeout(promise, ms) {
    /** @type {NodeJS.Timeout} */
    let timeoutHandle;
    const timeoutPromise = new Promise((_, reject) => {
      timeoutHandle = setTimeout(reject, ms, new Error('Timed out fetching resource'));
    });

    /** @type {Promise<T>} */
    const wrappedPromise = await Promise.race([promise, timeoutPromise])
      .finally(() => clearTimeout(timeoutHandle));
    return wrappedPromise;
  }
}

export {Fetcher};
