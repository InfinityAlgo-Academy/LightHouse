/**
 * @license Copyright 2021 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const path = require('path');
const expect = require('expect');
const {SnapshotState, toMatchSnapshot, toMatchInlineSnapshot} = require('jest-snapshot');

module.exports = {
  mochaHooks: {
    beforeEach() {
      global.mochaCurrentTest = this.currentTest;
    },
  },
};

/**
 * @param {*} actual
 * @param {string} testFile
 * @param {string} testTitle
 */
function toMatchSnapshotWrapper(actual, testFile, testTitle) {
  const snapshotDir = path.join(path.dirname(testFile), '__snapshots__');
  const snapshotFile = path.join(snapshotDir, path.basename(testFile) + '.snap');

  // Intilize the SnapshotState, it's responsible for actually matching
  // actual snapshot with expected one and storing results to `__snapshots__` folder
  const snapshotState = new SnapshotState(snapshotFile, {
    updateSnapshot: process.env.SNAPSHOT_UPDATE ? 'all' : 'new',
    prettierPath: '',
    snapshotFormat: {},
  });

  // Bind the `toMatchSnapshot` to the object with snapshotState and
  // currentTest name, as `toMatchSnapshot` expects it as it's `this`
  // object members
  const matcher = toMatchSnapshot.bind({
    snapshotState,
    currentTestName: testTitle,
  });

  // Execute the matcher
  const result = matcher(actual);

  // Store the state of snapshot, depending on updateSnapshot value
  snapshotState.save();

  // Return results outside
  return result;
}

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
    const result = toMatchSnapshotWrapper(actual, test.file, title);
    return result;
  },
  toMatchInlineSnapshot(actual, expected) {
    const test = global.mochaCurrentTest;
    const title = makeTestTitle(test);
    const snapshotState = new SnapshotState('', {
      updateSnapshot: process.env.SNAPSHOT_UPDATE ? 'all' : 'new',
      prettierPath: '',
      snapshotFormat: {},
    });
    const matcher = toMatchInlineSnapshot.bind({snapshotState, title});
    const result = matcher(actual, expected);

    for (const snapshot of snapshotState._inlineSnapshots) {
      // Jest adds `file://` to paths, and uses its own fs module to read things,
      // falling be to fs.readFileSync if not defined. node `fs` does not support
      // protocols in the path specifier, so we remove it here.
      snapshot.frame.file = snapshot.frame.file.replace('file://', '');
    }
    snapshotState.save();

    return result;
  },
});

// @ts-expect-error
global.expect = expect;
