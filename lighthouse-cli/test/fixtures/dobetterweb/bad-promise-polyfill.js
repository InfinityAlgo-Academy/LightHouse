
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
 *
 * This promise polyfill isn't as aggressive as zone as it doesn't patch every interface
 * that returns a promise (https://github.com/angular/zone.js/blob/v0.7.3/dist/zone.js#L1589-L1611)
 * But we think that's ok.
 */

(function(){

  // Terribly unruly promise polyfill. All methods throw. Oof.
  class BadPromise {
    constructor() {
      // The dbw smoketest also redefines window.Error. We'd like to report this with a real error
      const errorConstructor = (typeof __nativeError === 'function') ? __nativeError : Error;

      // NOTE: If you're here because you were pwned by BadPromise, you should
      // probably use a `new __nativePromise()` in the evaluateAsync rather than a `new Promise()`
      this.err = new errorConstructor('pwned by BadPromise');

      throw this.err;
    }
    then() { throw this.err; }
    all() { throw this.err; }
    race() { throw this.err; }
    resolve() { throw this.err; }
    reject() { throw this.err; }
    finally() { throw this.err; }
  };

  globalThis.Promise = BadPromise;

})();
