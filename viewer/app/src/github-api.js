/**
 * @license Copyright 2016 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

/* global logger */

/** @typedef {{etag: ?string, content: LH.Result}} CachableGist */

import idbKeyval from 'idb-keyval';

import {FirebaseAuth} from './firebase-auth.js';
// eslint-disable-next-line max-len
import {getLhrFilenamePrefix, getFlowResultFilenamePrefix} from '../../../report/generator/file-namer.js';

/**
 * Wrapper around the GitHub API for reading/writing gists.
 */
export class GithubApi {
  constructor() {
    this._auth = new FirebaseAuth();
    this._saving = false;
  }

  static get LH_JSON_EXT() {
    return '.lighthouse.report.json';
  }

  getFirebaseAuth() {
    return this._auth;
  }

  /**
   * Creates a gist under the users account.
   * @param {LH.Result|LH.FlowResult} jsonFile The gist file body.
   * @return {Promise<string>} id of the created gist.
   */
  async createGist(jsonFile) {
    if (this._saving) {
      throw new Error('Save already in progress');
    }

    logger.log('Saving report to GitHub...', false);
    this._saving = true;

    try {
      const accessToken = await this._auth.getAccessToken();
      let filename;
      if ('steps' in jsonFile) {
        filename = getFlowResultFilenamePrefix(jsonFile);
      } else {
        filename = getLhrFilenamePrefix({
          finalUrl: jsonFile.finalUrl,
          fetchTime: jsonFile.fetchTime,
        });
      }
      const body = {
        description: 'Lighthouse json report',
        public: false,
        files: {
          [`${filename}${GithubApi.LH_JSON_EXT}`]: {
            content: JSON.stringify(jsonFile),
          },
        },
      };
      const request = new Request('https://api.github.com/gists', {
        method: 'POST',
        headers: new Headers({Authorization: `token ${accessToken}`}),
        // Stringify twice so quotes are escaped for POST request to succeed.
        body: JSON.stringify(body),
      });
      const response = await fetch(request);
      const json = await response.json();
      if (json.id) {
        logger.log('Saved!');
        return json.id;
      } else {
        throw new Error('Error: ' + JSON.stringify(json));
      }
    } finally {
      this._saving = false;
    }
  }

  /**
   * Fetches a Lighthouse report from a gist.
   * @param {string} id The id of a gist.
   * @return {Promise<LH.Result>}
   */
  async getGistFileContentAsJson(id) {
    logger.log('Fetching report from GitHub...', false);

    const response = await this._auth.getAccessTokenIfLoggedIn().then(async accessToken => {
      const headers = new Headers();

      // If there's an authenticated token, include an Authorization header to
      // have higher rate limits with the GitHub API. Otherwise, rely on ETags.
      if (accessToken) {
        headers.set('Authorization', `token ${accessToken}`);
      }

      const cachedGist = await idbKeyval.get(id);
      if (cachedGist?.etag) {
        headers.set('If-None-Match', cachedGist.etag);
      }

      const resp = await fetch(`https://api.github.com/gists/${id}`, {headers});
      const remaining = Number(resp.headers.get('X-RateLimit-Remaining'));
      const limit = Number(resp.headers.get('X-RateLimit-Limit'));
      if (remaining < 10) {
        logger.warn('Approaching GitHub\'s rate limit. ' +
                    `${limit - remaining}/${limit} requests used. Consider signing ` +
                    'in to increase this limit.');
      }

      if (!resp.ok) {
        // Should only be 304 if cachedGist exists and etag was sent, but double check.
        if (resp.status === 304 && cachedGist) {
          return cachedGist;
        } else if (resp.status === 404) {
          // Delete the entry from IDB if it no longer exists on the server.
          idbKeyval.delete(id); // Note: async.
        }
        throw new Error(`${resp.status} fetching gist`);
      }

      const etag = resp.headers.get('ETag');
      const json = await resp.json();
      const gistFiles = Object.keys(json.files);
      // Attempt to use first file in gist with report extension.
      let filename = gistFiles.find(filename => filename.endsWith(GithubApi.LH_JSON_EXT));
      // Otherwise, fall back to first json file in gist
      if (!filename) {
        filename = gistFiles.find(filename => filename.endsWith('.json'));
      }
      if (!filename) {
        throw new Error(
          `Failed to find a Lighthouse report (*${GithubApi.LH_JSON_EXT}) in gist ${id}`
        );
      }
      const f = json.files[filename];
      if (f.truncated) {
        const resp0 = await fetch(f.raw_url);
        const content = await resp0.json();
        return {
          etag,
          content,
        };
      }
      const lhr = /** @type {LH.Result} */ (JSON.parse(f.content));
      return {etag, content: lhr};
    });

    await idbKeyval.set(id, response);
    logger.hide();

    return response.content;
  }
}
