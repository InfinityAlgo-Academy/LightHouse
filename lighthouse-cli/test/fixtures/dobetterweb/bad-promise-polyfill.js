/**
 * @license Copyright 2021 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

/**
 * @fileoverview
 * Lighthouse backstory:
 * Zone aggressively polyfills promises including rewriting Promise.prototype.then which caused
 * problems for our evaluateAsync code where we rely on a `Promise` to work.
 * We serve this file in dbw_tester.html to make sure evaluateAsync, etc all works great
 * Serving this file via node_modules was a pain so we've replaced it with our own.
 * @see https://github.com/GoogleChrome/lighthouse/issues/1173
 * @see https://github.com/GoogleChrome/lighthouse/pull/1178
 * We were serving zone.js@0.7.3 from node_modules but that introduced complexity, so it was
 * vendored into a third_party folder.
 * @see https://github.com/GoogleChrome/lighthouse/pull/9672
 * Later we decided to stop using this fancy file altogether so we can just ignore drama from both
 * third_party placement and node_modules imports.
 * @see https://github.com/GoogleChrome/lighthouse/pull/11043
 *
 * This promise polyfill isn't as aggressive as zone as it doesn't patch every interface
 * that returns a promise (https://github.com/angular/zone.js/blob/v0.7.3/dist/zone.js#L1589-L1611)
 * But we think that's ok.
 */

'use strict';

/* global globalThis */

(function() {
  // Terribly unruly promise polyfill. All methods throw. Oof.
  class BadPromise {
    constructor() {
      this.err = new Error('pwned by BadPromise');

      throw this.err;
    }
    then() {
      throw this.err;
    }
    all() {
      throw this.err;
    }
    race() {
      throw this.err;
    }
    resolve() {
      throw this.err;
    }
    reject() {
      throw this.err;
    }
    finally() {
      throw this.err;
    }
  }

  globalThis.Promise = BadPromise;
})();
