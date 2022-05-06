/**
 * @license Copyright 2021 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */


/* eslint-env jest */

const {default: {toBeCloseTo}} = require('expect/build/matchers.js');

const format = require('../../../shared/localization/format.js');

expect.extend({
  toBeDisplayString(received, expected) {
    if (!format.isIcuMessage(received)) {
      const message = () =>
      [
        `${this.utils.matcherHint('.toBeDisplayString')}\n`,
        `Expected object to be an ${this.utils.printExpected('LH.IcuMessage')}`,
        `Received ${typeof received}`,
        `  ${this.utils.printReceived(received)}`,
      ].join('\n');

      return {message, pass: false};
    }

    const actual = format.getFormatted(received, 'en-US');
    const pass = expected instanceof RegExp ?
      expected.test(actual) :
      actual === expected;

    const message = () =>
      [
        `${this.utils.matcherHint('.toBeDisplayString')}\n`,
        `Expected object to be a display string matching:`,
        `  ${this.utils.printExpected(expected)}`,
        `Received:`,
        `  ${this.utils.printReceived(actual)}`,
      ].join('\n');

    return {message, pass};
  },

  // Expose toBeCloseTo() so it can be used as an asymmetric matcher.
  toBeApproximately(...args) {
    // If called asymmetrically, a fake matcher `this` object needs to be passed
    // in (see https://github.com/facebook/jest/issues/8295). There's no effect
    // because it's only used for the printing of full failures, which isn't
    // done for asymmetric matchers anyways.
    const thisObj = (this && this.utils) ? this :
        {isNot: false, promise: ''};
    // @ts-expect-error
    return toBeCloseTo.call(thisObj, ...args);
  },
  /**
    * Asserts that an inspectable promise created by makePromiseInspectable is currently resolved or rejected.
    * This is useful for situations where we want to test that we are actually waiting for a particular event.
    *
    * @param {ReturnType<import('../test-utils.js')['makePromiseInspectable']>} received
    * @param {string} failureMessage
    */
  toBeDone(received, failureMessage) {
    const pass = received.isDone();

    const message = () =>
      [
        `${this.utils.matcherHint('.toBeDone')}\n`,
        `Expected promise to be resolved: ${this.utils.printExpected(failureMessage)}`,
        `  ${this.utils.printReceived(received.getDebugValues())}`,
      ].join('\n');

    return {message, pass};
  },
});
