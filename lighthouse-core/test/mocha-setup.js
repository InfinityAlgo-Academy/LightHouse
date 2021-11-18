/**
 * @license Copyright 2021 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const path = require('path');
const expect = require('expect');
const {SnapshotState, toMatchSnapshot, toMatchInlineSnapshot} = require('jest-snapshot');

/** @type {Map<string, SnapshotState['prototype']>} */
const snapshotStatesByTestFile = new Map();

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

module.exports = {
  mochaHooks: {
    beforeEach() {
      // Needed so `expect` extension method can access information about the current test.
      global.mochaCurrentTest = this.currentTest;
    },
    afterAll() {
      for (const snapshotState of snapshotStatesByTestFile.values()) {
        // Jest adds `file://` to inline snapshot paths, and uses its own fs module to read things,
        // falling back to fs.readFileSync if not defined. node `fs` does not support
        // protocols in the path specifier, so we remove it here.
        for (const snapshot of snapshotState._inlineSnapshots) {
          snapshot.frame.file = snapshot.frame.file.replace('file://', '');
        }

        snapshotState.save();
      }
    },
  },
};

function makeTestTitle(test) {
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
  toMatchSnapshot(actual) {
    const test = global.mochaCurrentTest;
    const title = makeTestTitle(test);
    const snapshotState = getSnapshotState(test.file);
    const matcher = toMatchSnapshot.bind({snapshotState, title});
    return matcher(actual);
  },
  toMatchInlineSnapshot(actual, expected) {
    const test = global.mochaCurrentTest;
    const title = makeTestTitle(test);
    const snapshotState = getSnapshotState(test.file);
    const matcher = toMatchInlineSnapshot.bind({snapshotState, title});
    return matcher(actual, expected);
  },
});

// @ts-expect-error
global.expect = expect;
