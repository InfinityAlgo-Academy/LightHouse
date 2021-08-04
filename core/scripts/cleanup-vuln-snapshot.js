#!/usr/bin/env node

/**
 * @license Copyright 2018 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/** @fileoverview Read in the snyk snapshot, remove whatever we don't need, write it back */

const {readFileSync, writeFileSync} = require('fs');
const prettyJSONStringify = require('pretty-json-stringify');
const libDetectorSource = readFileSync(require.resolve('js-library-detector/library/libraries.js'),
  'utf8'
);

const filename = process.argv[2];
if (!filename) throw new Error('No filename provided.');

const data = readFileSync(filename, 'utf8');
const output = cleanAndFormat(data);
JSON.parse(output); // make sure it's parseable
writeFileSync(filename, output, 'utf8');

/** @typedef {import('../audits/dobetterweb/no-vulnerable-libraries.js').SnykDB} SnykDB */

/**
 * @param {string} vulnString
 * @return {string}
 */
function cleanAndFormat(vulnString) {
  const snapshot = /** @type {!SnykDB} */ (JSON.parse(vulnString));
  // Hack to deal with non-node-friendly code.
  const librariesDefinition = eval(`
    (() => {
      ${libDetectorSource}
      return d41d8cd98f00b204e9800998ecf8427e_LibraryDetectorTests;
    })()
  `);

  // Identify all npm package names that can be detected.
  const detectableLibs = Object.values(librariesDefinition)
    .map(lib => lib.npm)
    .filter(Boolean);

  // Remove any entries that aren't detectable.
  for (const npmPkgName of Object.keys(snapshot.npm)) {
    if (!detectableLibs.includes(npmPkgName)) {
      delete snapshot.npm[npmPkgName];
    }
  }

  for (const [packageName, libEntries] of Object.entries(snapshot.npm)) {
    libEntries.forEach((entry, i) => {
      // snyk uses a convention for <0.0.0 to represent a mistaken vulnerability in their database.
      // https://github.com/GoogleChrome/lighthouse/pull/11144#discussion_r465713835
      // From Lighthouse's perspective we don't need to care about these.
      const vulnerableVersions = entry.semver.vulnerable.filter(vuln => vuln !== '<0.0.0');

      const pruned = {
        id: entry.id,
        severity: entry.severity,
        semver: {vulnerable: vulnerableVersions},
      };

      libEntries[i] = pruned;
    });

    const filteredEntries = libEntries.filter(entry => entry.semver.vulnerable.length);
    snapshot.npm[packageName] = filteredEntries;
    if (!filteredEntries.length) delete snapshot.npm[packageName];
  }

  // Normal pretty JSON-stringify has too many newlines. This strikes the right signal:noise ratio
  return prettyJSONStringify(snapshot, {
    tab: '  ',
    spaceBeforeColon: '',
    spaceAfterColon: '',
    spaceAfterComma: '',
    spaceInsideObject: '',
    shouldExpand: (_, level) => level < 3,
  });
}
