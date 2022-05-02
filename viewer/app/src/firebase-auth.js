/**
 * @license Copyright 2016 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

import {initializeApp} from 'firebase/app';
import {getAuth, signInWithPopup, GithubAuthProvider} from 'firebase/auth';
import idbKeyval from 'idb-keyval';

/**
 * Wrapper for Firebase authentication.
 */
export class FirebaseAuth {
  constructor() {
    /** @type {?string} */
    this._accessToken = null;
    this._firebaseApp = initializeApp({
      apiKey: 'AIzaSyBQEZMlX6A9B0jJ6PFGcBADbXZG9ogyCmQ',
      authDomain: 'lighthouse-chrom-1560304954232.firebaseapp.com',
      projectId: 'lighthouse-chrom-1560304954232',
      storageBucket: 'lighthouse-chrom-1560304954232.appspot.com',
      messagingSenderId: '89319782509',
      appId: '1:89319782509:web:9ea5d8e149048c7836e764',
      measurementId: 'G-7FMYHPW5YC',
    });
    this._auth = getAuth();
    this._provider = new GithubAuthProvider();
    this._provider.addScope('gist');

    /**
     * Promise which resolves after the first check of an existing access token.
     * @type {Promise<void>}
     */
    this._ready = Promise.resolve(
      idbKeyval.get('accessToken').then((token) => {
        if (token) {
          this._accessToken = token;
        }
      })
    );
  }

  /**
   * Returns the GitHub access token if already logged in. If not logged in,
   * returns null (and will not trigger sign in).
   * @return {Promise<?string>}
   */
  async getAccessTokenIfLoggedIn() {
    await this._ready;
    return this._accessToken;
  }

  /**
   * Returns the GitHub access token, triggering sign in if needed.
   * @return {Promise<string>}
   */
  async getAccessToken() {
    await this._ready;
    if (this._accessToken) return this._accessToken;
    return this.signIn();
  }

  /**
   * Signs in the user to GitHub using the Firebase API.
   * @return {Promise<string>} accessToken
   */
  async signIn() {
    const result = await signInWithPopup(this._auth, this._provider);
    const credential = GithubAuthProvider.credentialFromResult(result);
    if (!credential || !credential.accessToken) throw new Error('unexpected credential');

    const accessToken = credential.accessToken;
    this._accessToken = accessToken;
    // A limitation of firebase auth is that it doesn't return an oauth token
    // after a page refresh: `onAuthStateChanged` returns a firebase user, which has no knowledge
    // of GitHub's oauth token. Since GitHub's tokens never expire, stash the access token in IDB.
    await idbKeyval.set('accessToken', accessToken);
    return accessToken;
  }
}
