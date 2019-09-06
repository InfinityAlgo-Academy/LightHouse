/**
 * @license Copyright 2019 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Gatherer = require('./gatherer.js');

/* global window */

/* istanbul ignore next */
function captureInitialVisibility() {
  // @ts-ignore
  window.___LH_VISIBILITY.push({
    state: document.visibilityState,
    ts: performance.now(),
  });
}

/* istanbul ignore next */
function listenForVisibilityChangeEvents() {
  window.addEventListener('visibilitychange', () => {
    // @ts-ignore
    window.___LH_VISIBILITY.push({
      state: document.visibilityState,
      ts: performance.now(),
    });
  });
}

class ViewportDimensions extends Gatherer {
  /**
   * @param {LH.Gatherer.PassContext} passContext
   */
  async beforePass(passContext) {
    const driver = passContext.driver;

    // await driver.evaluateAsync('window.___LH_VISIBILITY = []');
    // await driver.evaluateAsync(`(${captureInitialVisibility})()`);
    // await driver.evaluateAsync(`(${listenForVisibilityChangeEvents})()`);
    await driver.evaluateAsync([
      'window.___LH_VISIBILITY = []',
      `(${captureInitialVisibility})()`,
      `(${listenForVisibilityChangeEvents})()`,
    ].join(';'));
  }

  /**
   * @param {LH.Gatherer.PassContext} passContext
   * @return {Promise<LH.BaseArtifacts['Visibility']>}
   */
  async afterPass(passContext) {
    const driver = passContext.driver;
    return await driver.evaluateAsync('window.___LH_VISIBILITY');
  }
}

module.exports = ViewportDimensions;
