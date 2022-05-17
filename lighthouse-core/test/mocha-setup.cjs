/**
 * @license Copyright 2021 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

/**
 * @fileoverview
 * 1) sets global.expect
 * 2) configures the mocha test runner to use jest-snapshot
 */

/* eslint-disable import/order */

const path = require('path');

const expect = require('expect');
const {SnapshotState, toMatchSnapshot, toMatchInlineSnapshot} = require('jest-snapshot');

require('./jest-setup/setup.js');

/** @type {Map<string, SnapshotState['prototype']>} */
const snapshotStatesByTestFile = new Map();
let snapshotTestFailed = false;

/**
 * @param {string} testFile
 */
function getSnapshotState(testFile) {
  // For every test file, persist the same snapshot state object so there is
  // not a read/write per snapshot access/change, but one per file.
  let snapshotState = snapshotStatesByTestFile.get(testFile);
  if (snapshotState) return snapshotState;

  const snapshotDir = path.join(path.dirname(testFile), '__snapshots__');
  const snapshotFile = path.join(snapshotDir, path.basename(testFile) + '.snap');
  snapshotState = new SnapshotState(snapshotFile, {
    updateSnapshot: process.env.SNAPSHOT_UPDATE ? 'all' : 'new',
    prettierPath: '',
    snapshotFormat: {},
  });
  snapshotStatesByTestFile.set(testFile, snapshotState);
  return snapshotState;
}

/**
 * @param {Mocha.Test} test
 * @return {string}
 */
function makeTestTitle(test) {
  /** @type {Mocha.Test | Mocha.Suite} */
  let next = test;
  const title = [];

  for (;;) {
    if (!next.parent) {
      break;
    }

    title.push(next.title);
    next = next.parent;
  }

  return title.reverse().join(' ');
}

expect.extend({
  /**
   * @param {any} actual
   */
  toMatchSnapshot(actual) {
    const test = mochaCurrentTest;
    if (!test.file) throw new Error('unexpected value');

    const title = makeTestTitle(test);
    const snapshotState = getSnapshotState(test.file);
    /** @type {import('jest-snapshot/build/types').Context} */
    // @ts-expect-error - this is enough for snapshots to work.
    const context = {snapshotState, currentTestName: title};
    const matcher = toMatchSnapshot.bind(context);
    const result = matcher(actual);
    if (!result.pass) snapshotTestFailed = true;
    return result;
  },
  /**
   * @param {any} actual
   * @param {any} expected
   */
  toMatchInlineSnapshot(actual, expected) {
    const test = mochaCurrentTest;
    if (!test.file) throw new Error('unexpected value');

    const title = makeTestTitle(test);
    const snapshotState = getSnapshotState(test.file);
    /** @type {import('jest-snapshot/build/types').Context} */
    // @ts-expect-error - this is enough for snapshots to work.
    const context = {snapshotState, currentTestName: title};
    const matcher = toMatchInlineSnapshot.bind(context);
    const result = matcher(actual, expected);
    if (!result.pass) snapshotTestFailed = true;
    return result;
  },
});

// @ts-expect-error
global.expect = expect;

/**
 * @param {Mocha.HookFunction} mochaFn
 * @return {jest.Lifecycle}
 */
const makeFn = (mochaFn) => (fn, timeout) => {
  mochaFn(function() {
    // eslint-disable-next-line no-invalid-this
    if (timeout !== undefined) this.timeout(timeout);

    /** @type {jest.DoneCallback} */
    const cb = () => {};
    cb.fail = (error) => {
      throw new Error(typeof error === 'string' ? error : error?.message);
    };
    return fn(cb);
  });
};

const {before, after} = require('mocha');
global.beforeAll = makeFn(before);
global.afterAll = makeFn(after);

/** @type {Mocha.Test} */
let mochaCurrentTest;
module.exports = {
  mochaHooks: {
    /** @this {Mocha.Context} */
    beforeEach() {
      if (!this.currentTest) throw new Error('unexpected value');

      // Needed so `expect` extension method can access information about the current test.
      mochaCurrentTest = this.currentTest;
    },
    afterAll() {
      for (const snapshotState of snapshotStatesByTestFile.values()) {
        // Jest adds `file://` to inline snapshot paths, and uses its own fs module to read things,
        // falling back to fs.readFileSync if not defined. node `fs` does not support
        // protocols in the path specifier, so we remove it here.
        // @ts-expect-error - private property.
        for (const snapshot of snapshotState._inlineSnapshots) {
          snapshot.frame.file = snapshot.frame.file.replace('file://', '');
        }

        snapshotState.save();
      }

      if (!process.env.SNAPSHOT_UPDATE && snapshotTestFailed) {
        process.on('exit', () => {
          console.log('To update snapshots, run again with `yarn mocha -u`');
        });
      }
    },
  },
};
