
/**
 * Lighthouse backstory:
 * Zone aggressively polyfills promises including rewriting Promise.prototype.then which caused
 * problems for our evaluateAsync code where we rely on a window.__nativePromise to work.
 * We serve this file in dbw_tester.html to make sure evaluateAsync, etc all works great
 * Serving this file via node_modules was a pain so we've vendored it here.
 * @see https://github.com/GoogleChrome/lighthouse/issues/1173
 * @see https://github.com/GoogleChrome/lighthouse/pull/1178
 * We were serving zone.js@0.7.3 from node_modules but that introduced complexity, so it was
 * vendored into a third_party folder.
 * @see https://github.com/GoogleChrome/lighthouse/pull/9672
 * Later we decided to stop using this fancy file altogether so we can just ignore drama from both
 * third_party placement and node_modules imports.
 * @see https://github.com/GoogleChrome/lighthouse/pull/11043
 */

(function(){

  class BadPromise {
    then() { return null; }
    all() { return null; }
    race() { return null; }
    resolve() { return null; }
    reject() { return null; }
    finally() { return null; }
  };

  globalThis.Promise = BadPromise;

})();
