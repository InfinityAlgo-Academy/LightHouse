/**
 * @license Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
// @ts-nocheck
'use strict';

/**
 * Helper functions that are passed by `toString()` by Driver to be evaluated in target page.
 */

/**
 * Tracks function call usage. Used by captureJSCalls to inject code into the page.
 * @param {function(...*): *} funcRef The function call to track.
 * @param {!Set} set An empty set to populate with stack traces. Should be
 *     on the global object.
 * @return {function(...*): *} A wrapper around the original function.
 */
/* istanbul ignore next */
function captureJSCallUsage(funcRef, set) {
  /* global window */
  const __nativeError = window.__nativeError || Error;
  const originalFunc = funcRef;
  const originalPrepareStackTrace = __nativeError.prepareStackTrace;

  return function(...args) {
    // Note: this function runs in the context of the page that is being audited.

    // See v8's Stack Trace API https://github.com/v8/v8/wiki/Stack-Trace-API#customizing-stack-traces
    __nativeError.prepareStackTrace = function(error, structStackTrace) {
      // First frame is the function we injected (the one that just threw).
      // Second, is the actual callsite of the funcRef we're after.
      const callFrame = structStackTrace[1];
      let url = callFrame.getFileName() || callFrame.getEvalOrigin();
      const line = callFrame.getLineNumber();
      const col = callFrame.getColumnNumber();
      const isEval = callFrame.isEval();
      let isExtension = false;
      const stackTrace = structStackTrace.slice(1).map(callsite => callsite.toString());

      // If we don't have an URL, (e.g. eval'd code), use the 2nd entry in the
      // stack trace. First is eval context: eval(<context>):<line>:<col>.
      // Second is the callsite where eval was called.
      // See https://crbug.com/646849.
      if (isEval) {
        url = stackTrace[1];
      }

      // Chrome extension content scripts can produce an empty .url and
      // "<anonymous>:line:col" for the first entry in the stack trace.
      if (stackTrace[0].startsWith('<anonymous>')) {
        // Note: Although captureFunctionCallSites filters out crx usage,
        // filling url here provides context. We may want to keep those results
        // some day.
        url = stackTrace[0];
        isExtension = true;
      }

      // TODO: add back when we want stack traces.
      // Stack traces were removed from the return object in
      // https://github.com/GoogleChrome/lighthouse/issues/957 so callsites
      // would be unique.
      return {url, args, line, col, isEval, isExtension}; // return value is e.stack
    };
    const e = new __nativeError(`__called ${funcRef.name}__`);
    set.add(JSON.stringify(e.stack));

    // Restore prepareStackTrace so future errors use v8's formatter and not
    // our custom one.
    __nativeError.prepareStackTrace = originalPrepareStackTrace;

    // eslint-disable-next-line no-invalid-this
    return originalFunc.apply(this, args);
  };
}

/**
 * The `exceptionDetails` provided by the debugger protocol does not contain the useful
 * information such as name, message, and stack trace of the error when it's wrapped in a
 * promise. Instead, map to a successful object that contains this information.
 * @param {string|Error} err The error to convert
 */
/* istanbul ignore next */
function wrapRuntimeEvalErrorInBrowser(err) {
  err = err || new Error();
  const fallbackMessage = typeof err === 'string' ? err : 'unknown error';

  return {
    __failedInBrowser: true,
    name: err.name || 'Error',
    message: err.message || fallbackMessage,
    stack: err.stack || (new Error()).stack,
  };
}

/**
 * Used by _waitForCPUIdle and executed in the context of the page, updates the ____lastLongTask
 * property on window to the end time of the last long task.
 */
/* istanbul ignore next */
function registerPerformanceObserverInPage() {
  window.____lastLongTask = window.performance.now();
  const observer = new window.PerformanceObserver(entryList => {
    const entries = entryList.getEntries();
    for (const entry of entries) {
      if (entry.entryType === 'longtask') {
        const taskEnd = entry.startTime + entry.duration;
        window.____lastLongTask = Math.max(window.____lastLongTask, taskEnd);
      }
    }
  });

  observer.observe({entryTypes: ['longtask']});
  // HACK: A PerformanceObserver will be GC'd if there are no more references to it, so attach it to
  // window to ensure we still receive longtask notifications. See https://crbug.com/742530.
  // For an example test of this behavior see https://gist.github.com/patrickhulce/69d8bed1807e762218994b121d06fea6.
  //   FIXME COMPAT: This hack isn't neccessary as of Chrome 62.0.3176.0
  //   https://bugs.chromium.org/p/chromium/issues/detail?id=742530#c7
  window.____lhPerformanceObserver = observer;
}


/**
 * Used by _waitForCPUIdle and executed in the context of the page, returns time since last long task.
 */
/* istanbul ignore next */
function checkTimeSinceLastLongTask() {
  // Wait for a delta before returning so that we're sure the PerformanceObserver
  // has had time to register the last longtask
  return new Promise(resolve => {
    const timeoutRequested = window.performance.now() + 50;

    setTimeout(() => {
      // Double check that a long task hasn't happened since setTimeout
      const timeoutFired = window.performance.now();
      const timeSinceLongTask = timeoutFired - timeoutRequested < 50 ?
          timeoutFired - window.____lastLongTask : 0;
      resolve(timeSinceLongTask);
    }, 50);
  });
}

module.exports = {
  captureJSCallUsage,
  wrapRuntimeEvalErrorInBrowser,
  registerPerformanceObserverInPage,
  checkTimeSinceLastLongTask,
};
