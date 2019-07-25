/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

class Fetcher {
  /**
   * @param {import('./driver.js')} driver
   */
  constructor(driver) {
    this.driver = driver;
    /** @type {Map<string, (event: LH.Crdp.Fetch.RequestPausedEvent) => void>} */
    this._onRequestPausedHandlers = new Map();
    this._onRequestPaused = this._onRequestPaused.bind(this);
  }

  /**
   * The Fetch domain accepts patterns for controlling what requests are intercepted, but we
   * enable the domain for all patterns and filter events at a lower level to support multiple
   * concurrent usages. Reasons for this:
   *
   * 1) only one set of patterns may be applied for the entire domain.
   * 2) every request that matches the patterns are paused and only resumes when certain Fetch
   *    commands are sent. So a listener of the `Fetch.requestPaused` event must either handle
   *    the requests it cares about, or explicitly allow them to continue.
   * 3) if multiple commands to continue the same request are sent, protocol errors occur.
   *
   * So instead we have one global `Fetch.enable` / `Fetch.requestPaused` pair, and allow specific
   * urls to be intercepted via `driver.setOnRequestPausedHandler`.
   */
  async enableRequestInterception() {
    await this.driver.sendCommand('Fetch.enable', {
      patterns: [{requestStage: 'Request'}, {requestStage: 'Response'}],
    });
    await this.driver.on('Fetch.requestPaused', this._onRequestPaused);
  }

  /**
   * @param {string} url
   * @param {(event: LH.Crdp.Fetch.RequestPausedEvent) => void} handler
   */
  async setOnRequestPausedHandler(url, handler) {
    this._onRequestPausedHandlers.set(url, handler);
  }

  /**
   * @param {LH.Crdp.Fetch.RequestPausedEvent} event
   */
  async _onRequestPaused(event) {
    const handler = this._onRequestPausedHandlers.get(event.request.url);
    if (handler) {
      await handler(event);
    } else {
      // Nothing cares about this URL, so continue.
      await this.driver.sendCommand('Fetch.continueRequest', {requestId: event.requestId});
    }
  }

  async disableRequestInterception() {
    await this.driver.sendCommand('Fetch.disable');
    await this.driver.off('Fetch.requestPaused', this._onRequestPaused);
    this._onRequestPausedHandlers.clear();
  }

  /**
   * Requires that `driver.enableRequestInterception` has been called.
   *
   * Fetches any resource in a way that circumvents CORS.
   *
   * @param {string} url
   * @param {number} timeoutInMs
   * @return {Promise<string>}
   */
  async fetchResource(url, timeoutInMs = 500) {
    if (!this.driver.isDomainEnabled('Fetch')) {
      throw new Error('Must call `enableRequestInterception` before using fetchResource');
    }

    /** @type {Promise<string>} */
    const requestInterceptionPromise = new Promise((resolve, reject) => {
      this.setOnRequestPausedHandler(url, async (event) => {
        const {requestId, responseStatusCode} = event;

        // The first requestPaused event is for the request stage. Continue it.
        if (!responseStatusCode) {
          // Remove same-site cookies so we aren't buying stuff on Amazon.
          const headers = [];
          if (event.request.headers['Cookie']) {
            const sameSiteCookies = await this.driver.sendCommand('Network.getCookies', {urls: [url]});
            const sameSiteCookiesKeyValueSet = new Set();
            for (const cookie of sameSiteCookies.cookies) {
              sameSiteCookiesKeyValueSet.add(cookie.name + '=' + cookie.value);
            }
            const strippedCookies = event.request.headers['Cookie']
              .split(';')
              .filter(cookieKeyValue => {
                return !sameSiteCookiesKeyValueSet.has(cookieKeyValue.trim());
              })
              .join('; ');
            headers.push({name: 'Cookie', value: strippedCookies});
          }

          this.driver.sendCommand('Fetch.continueRequest', {
            requestId,
            headers,
          });
          return;
        }

        // Now in the response stage, but the request failed.
        if (!(responseStatusCode >= 200 && responseStatusCode < 300)) {
          reject(new Error(`Invalid response status code: ${responseStatusCode}`));
          return;
        }

        const responseBody = await this.driver.sendCommand('Fetch.getResponseBody', {requestId});
        if (responseBody.base64Encoded) {
          resolve(Buffer.from(responseBody.body, 'base64').toString());
        } else {
          resolve(responseBody.body);
        }

        // Fail the request (from the page's perspective) so that the iframe never loads.
        this.driver.sendCommand('Fetch.failRequest', {requestId, errorReason: 'Aborted'});
      });
    });

    /**
     * @param {string} src
     */
    /* istanbul ignore next */
    function injectIframe(src) {
      /** @type {HTMLIFrameElement} */
      const iframe = document.createElement('iframe');
      // Try really hard not to affect the page.
      iframe.style.display = 'none';
      iframe.style.position = 'absolute';
      iframe.style.left = '10000px';
      iframe.style.visibility = 'hidden';
      iframe.src = src;
      iframe.onload = iframe.onerror = () => {
        iframe.remove();
        delete iframe.onload;
        delete iframe.onerror;
      };
      document.body.appendChild(iframe);
    }

    await this.driver.evaluateAsync(`${injectIframe}(${JSON.stringify(url)})`);

    /** @type {NodeJS.Timeout} */
    let timeoutHandle;
    /** @type {Promise<never>} */
    const timeoutPromise = new Promise((_, reject) => {
      const errorMessage = 'Timed out fetching resource.';
      timeoutHandle = setTimeout(() => reject(new Error(errorMessage)), timeoutInMs);
    });

    return Promise.race([
      timeoutPromise,
      requestInterceptionPromise,
    ]).finally(() => clearTimeout(timeoutHandle));
  }
}

module.exports = Fetcher;
