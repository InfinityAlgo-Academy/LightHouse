/**
 * @license Copyright 2020 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* eslint-disable max-len */
const LargeJavaScriptLibrariesAudit = require('../../../audits/large-javascript-libraries.js');
const assert = require('assert').strict;
const libStats = require('../../../lib/large-javascript-libraries/bundlephobia-database.json');
const librarySuggestions = require('../../../lib/large-javascript-libraries/library-suggestions.js').suggestions;
/* eslint-enable max-len */

/**
 * @param {string} detector
 * @param {string} id
 * @param {string} name
 * @param {string} version
 * @param {string} npm
 * @return {object}
 */
function makeStack(detector, id, name, version, npm) {
  return {
    detector,
    id,
    name,
    version,
    npm,
  };
}

/* eslint-env jest */

describe('Large JavaScript libraries audit', () => {
  it('passes when no libraries were detected', () => {
    const auditResult = LargeJavaScriptLibrariesAudit.audit({
      Stacks: [],
    });
    assert.equal(auditResult.score, 1);
    assert.equal(auditResult.details.items.length, 0);
  });

  it('passes when none of the detected libraries exist in the database', () => {
    const auditResult = LargeJavaScriptLibrariesAudit.audit({
      Stacks: [
        makeStack('js', 'fakeLibrary1', 'FakeLibrary1', '1.0.0', 'FakeLibrary1'),
        makeStack('css', 'fakeLibrary2', 'FakeLibrary2', '2.0.0', 'FakeLibrary2'),
      ],
    });

    assert.equal(auditResult.score, 1);
    assert.equal(auditResult.details.items.length, 0);
  });

  it('fails when a detected library is found in the database and gives suggestions', () => {
    const auditResult = LargeJavaScriptLibrariesAudit.audit({
      Stacks: [
        makeStack('js', 'fakeLibrary1', 'FakeLibrary1', '1.0.0', 'FakeLibrary1'),
        makeStack('js', 'momentjs', 'Moment.js', '2.27.0', 'moment'),
      ],
    });

    assert.equal(auditResult.score, 0);
    assert.equal(auditResult.details.items.length, 1);
    assert.equal(auditResult.details.items[0].subItems.items.length, 3);
  });

  it('falls back to the latest version of a library if its version is unknown', () => {
    const auditResult = LargeJavaScriptLibrariesAudit.audit({
      Stacks: [
        makeStack('js', 'momentjs', 'Moment.js', '0', 'moment'),
      ],
    });

    assert.equal(auditResult.details.items[0].transferSize,
      libStats['moment'].versions['latest'].gzip);
  });

  it('does not provide duplicate suggestions when a library appears twice', () => {
    const auditResult = LargeJavaScriptLibrariesAudit.audit({
      Stacks: [
        makeStack('js', 'momentjs', 'Moment.js', '2.27.0', 'moment'),
        makeStack('js', 'momentjs', 'Moment.js', '1.0.0', 'moment'),
      ],
    });

    assert.equal(auditResult.score, 0);
    assert.equal(auditResult.details.items.length, 1);
    assert.equal(auditResult.details.items[0].subItems.items.length, 3);
  });

  it('gives suggestions in order of ascending KiB size', () => {
    const auditResult = LargeJavaScriptLibrariesAudit.audit({
      Stacks: [
        makeStack('js', 'momentjs', 'Moment.js', '2.27.0', 'moment'),
      ],
    });

    const subItems = auditResult.details.items[0].subItems.items;

    for (let i = 0; i < subItems.length - 1; i++) {
      if (subItems[i].transferSize > subItems[i + 1].transferSize) {
        assert.fail('Suggestions are not in ascending order');
      }
    }
  });

  it('uses a BundlePhobiaStats database that contains all necessary libraries', () => {
    const libraries = [].
      concat(...Object.values(librarySuggestions)).
      concat(Object.keys(librarySuggestions));

    for (const library of libraries) {
      if (!libStats[library] || !libStats[library].versions['latest']) {
        assert.fail('The library "' + library + '" does not have any stats. ' +
          'Please re-run the generate-bundlephobia-database script ' +
          'to keep the database up-to-date.');
      }
    }
  });

  it('uses a BundlePhobiaStats database that does not contain errors', () => {
    const libraries = [].
    concat(...Object.values(librarySuggestions)).
    concat(Object.keys(librarySuggestions));

    for (const library of libraries) {
      if (libStats[library].lastScraped === 'Error') {
        assert.fail('The library "' + library + '" encountered an error when scraping recently. ' +
          'Please re-run the generate-bundlephobia-database script to fix this, or check if ' +
          'the library no longer exists on npm (in which case remove it from our list).');
      }
    }
  });
});
