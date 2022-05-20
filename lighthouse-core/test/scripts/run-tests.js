/**
 * @license Copyright 2022 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

/**
 * @fileoverview
 * CLI tool for running mocha tests. Run with `yarn mocha`
 */

import {execFileSync} from 'child_process';
import path from 'path';

import yargs from 'yargs';
import * as yargsHelpers from 'yargs/helpers';
import glob from 'glob';

import {LH_ROOT} from '../../../root.js';

// Some tests have an intractable bug related to unwanted module replacement cross-contamination.
// It's unclear why this isn't a problem for other tests. For now, we isolate these in different processes.
// TODO: consider adding all tests that use mockResponse()?
const testsToIsolate = new Set([
  // For example, this test uses `mockResponse` and errors because the TargetManager mock is seemingly not really replacing
  // `lighthouse-core/gather/driver/target-manager.js`, meaning `navigation.js` loads a NetworkMonitor using a real TargetManager
  // which results in unexpected protocol commands (throwing an error in mock-commands.js `mockFnImpl`).
  // Repro command:
  //    yarn mocha --no-isolation lighthouse-core/test/gather/driver/navigation-test.js lighthouse-core/test/gather/gather-runner-test.js lighthouse-core/test/audits
  //        (audits tests are to force jobs >> workers. gather-runner-test because it also does mocky things)
  // Probably related, this also fails:
  //    yarn mocha --no-isolation --parallel=false lighthouse-core/test/gather/driver/navigation-test.js lighthouse-core/test/gather/gather-runner-test.js
  'lighthouse-core/test/gather/driver/navigation-test.js',
  // I didn't explore why these had problems–I just kept adding to this list until tests stopped failing.
  'lighthouse-core/test/config/config-test.js',
  'lighthouse-core/test/fraggle-rock/gather/navigation-runner-test.js',
  'lighthouse-core/test/fraggle-rock/gather/snapshot-runner-test.js',
  'lighthouse-core/test/fraggle-rock/gather/timespan-runner-test.js',
  'lighthouse-core/test/fraggle-rock/scenarios/api-test-pptr.js',
  'lighthouse-core/test/fraggle-rock/scenarios/cross-origin-test-pptr.js',
  'lighthouse-core/test/fraggle-rock/scenarios/disconnect-test-pptr.js',
  'lighthouse-core/test/fraggle-rock/user-flow-test.js',
  'lighthouse-core/test/gather/driver/network-monitor-test.js',
  'lighthouse-core/test/gather/driver/prepare-test.js',
  'lighthouse-core/test/gather/gather-runner-test.js',
  'lighthouse-core/test/gather/gatherers/full-page-screenshot-test.js',
  'lighthouse-core/test/gather/gatherers/service-worker-test.js',
  'lighthouse-core/test/index-test.js',
  'lighthouse-core/test/lib/emulation-test.js',
  'lighthouse-core/test/runner-test.js',
]);

const y = yargs(yargsHelpers.hideBin(process.argv));
// TODO: -t => --fgrep
const rawArgv = y
  .help('help')
  .usage('node $0 [<options>] <paths>')
  .parserConfiguration({'unknown-options-as-args': true})
  .option('_', {
    array: true,
    type: 'string',
  })
  .options({
    'testMatch': {
      type: 'string',
      describe: 'Glob pattern for collecting test files',
    },
    'update': {
      alias: 'u',
      type: 'boolean',
      default: false,
      describe: 'Update snapshots',
    },
    'isolation': {
      type: 'boolean',
      default: true,
    },
    'parallel': {
      type: 'boolean',
      // Although much faster, mocha's parallel test runner defers printing errors until
      // all tests have finished. This is may be undesired for local development, so enable
      // parallel mode by default only in CI.
      // default: Boolean(process.env.CI),
      // TODO: for some reason serial mode fails with many errors. ex:
      //      yarn mocha lighthouse-core/test/gather/gatherers/ --parallel=false
      //
      //      1) a11y audits + aXe
      //          "before all" hook for "only runs the axe rules we have audits defined for":
      //      ...
      //
      // Increasing the timeout does not help.
      default: true,
    },
  })
  .wrap(y.terminalWidth())
  .argv;
const argv =
  /** @type {Awaited<typeof rawArgv> & CamelCasify<Awaited<typeof rawArgv>>} */ (rawArgv);

const defaultTestMatches = [
  'lighthouse-core/**/*-test.js',
  'lighthouse-cli/**/*-test.js',
  'report/**/*-test.js',
  'lighthouse-core/test/fraggle-rock/**/*-test-pptr.js',
  'treemap/**/*-test.js',
  'viewer/**/*-test.js',
  'third-party/**/*-test.js',
  'clients/test/**/*-test.js',
  'shared/**/*-test.js',
  'build/**/*-test.js',
];

const mochaPassThruArgs = argv._.filter(arg => typeof arg !== 'string' || arg.startsWith('--'));
const filterFilePatterns = argv._.filter(arg => !(typeof arg !== 'string' || arg.startsWith('--')));

// Collect all the possible test files, based off the provided testMatch glob pattern
// or the default patterns defined above.
const testsGlob = argv.testMatch || `{${defaultTestMatches.join(',')}}`;
const allTestFiles = glob.sync(testsGlob, {cwd: LH_ROOT, absolute: true});

// TODO: uhhh... why absolute path?
// If provided, filter the test files using a basic string includes on the absolute path of
// each test file. Map back to a relative path because it's nice to keep the printed commands shorter.
const filteredTests = (
  filterFilePatterns.length ?
    allTestFiles.filter((file) => filterFilePatterns.some(pattern => file.includes(pattern))) :
    allTestFiles
).map(testPath => path.relative(process.cwd(), testPath));

if (filterFilePatterns.length) {
  console.log(`applied test filters: ${JSON.stringify(filterFilePatterns, null, 2)}`);
}
console.log(`running ${filteredTests.length} test files`);

const testsToRunTogether = [];
const testsToRunIsolated = [];
for (const test of filteredTests) {
  if (argv.isolation && testsToIsolate.has(test)) {
    testsToRunIsolated.push(test);
  } else {
    testsToRunTogether.push(test);
  }
}

const baseArgs = [
  '--loader=testdouble',
  '--require=lighthouse-core/test/mocha-setup.cjs',
  '--timeout=20000',
  '--fail-zero',
  ...mochaPassThruArgs,
];
if (argv.parallel) baseArgs.push('--parallel');
if (process.env.CI) baseArgs.push('--forbid-only');

/**
 * @param {string[]} tests
 */
function runMochaCLI(tests) {
  const file = 'node_modules/.bin/mocha';
  const args = [
    ...baseArgs,
    ...tests,
  ];
  console.log(
    `Running command: ${argv.update ? 'SNAPSHOT_UPDATE=1 ' : ''}${file} ${args.join(' ')}`);
  try {
    execFileSync(file, args, {
      cwd: LH_ROOT,
      env: {
        ...process.env,
        SNAPSHOT_UPDATE: argv.update ? '1' : undefined,
      },
      stdio: 'inherit',
    });
  } catch {
    process.exit(1);
  }
}

if (testsToRunTogether.length) runMochaCLI(testsToRunTogether);
for (const test of testsToRunIsolated) {
  console.log(`Running test in isolation: ${test}`);
  runMochaCLI([test]);
}
