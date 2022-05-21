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

// Some tests replace real modules with mocks in the global scope of the test file
// (outside beforeAll / a test unit). Before doing any lifecycle stuff, Mocha will load
// all test files (everything if --no-parallel, else each worker will load a subset of the files
// all at once). This results in unexpected mocks contaminating other test files.
//
// Tests do other undesired things in the global scope too, such as enabling fake timers.
//
// For now, we isolate a number of tests until they can be refactored.
//
// Note: the above is a best guess as to how the following test files are polluting the global scope.
//       Another method may be the reason for some, and some may not be troublesome themselves and
//       were added simply because it failed when another test file did the polluting.
//       I didn't explore each file individually–I just kept adding to this list until
//       `yarn mocha --no-parallel lighthouse-core/test` stopped failing.
//
// To run tests without isolation, and all in one process:
//    yarn mocha --no-isolation --no-parallel lighthouse-core/test
//
// Because mocha workers can divide up test files that mess with global scope in a way that
// _just happens_ to not cause anything to fail, use this command works to verify that
// all necessary tests are isolated:
//    yarn mocha --no-parallel lighthouse-core/test
const testsToIsolate = new Set([
  // grep -lRE '^timers\.useFakeTimers' lighthouse-core/test
  'lighthouse-core/test/fraggle-rock/gather/session-test.js',
  'lighthouse-core/test/gather/driver-test.js',
  'lighthouse-core/test/gather/driver/execution-context-test.js',
  'lighthouse-core/test/gather/driver/navigation-test.js',
  'lighthouse-core/test/gather/driver/network-monitor-test.js',
  'lighthouse-core/test/gather/driver/target-manager-test.js',
  'lighthouse-core/test/gather/driver/wait-for-condition-test.js',
  'lighthouse-core/test/gather/gatherers/css-usage-test.js',
  'lighthouse-core/test/gather/gatherers/image-elements-test.js',
  'lighthouse-core/test/gather/gatherers/inspector-issues-test.js',
  'lighthouse-core/test/gather/gatherers/js-usage-test.js',
  'lighthouse-core/test/gather/gatherers/source-maps-test.js',
  'lighthouse-core/test/gather/gatherers/trace-elements-test.js',
  'lighthouse-core/test/gather/gatherers/trace-test.js',

  // grep -lRE '^td\.replace' lighthouse-core/test
  'lighthouse-core/test/fraggle-rock/gather/navigation-runner-test.js',
  'lighthouse-core/test/fraggle-rock/gather/snapshot-runner-test.js',
  'lighthouse-core/test/fraggle-rock/gather/timespan-runner-test.js',
  'lighthouse-core/test/fraggle-rock/user-flow-test.js',
  'lighthouse-core/test/gather/driver/prepare-test.js',
  'lighthouse-core/test/gather/gatherers/link-elements-test.js',
  'lighthouse-core/test/gather/gatherers/service-worker-test.js',
  'lighthouse-core/test/lib/sentry-test.js',
  'lighthouse-core/test/runner-test.js',

  // grep -lRE 'mockDriverSubmodules|mockRunnerModule|mockDriverModule|mockDriverSubmodules|makeMocksForGatherRunner' lighthouse-core/test
  'lighthouse-core/test/fraggle-rock/gather/navigation-runner-test.js',
  'lighthouse-core/test/fraggle-rock/gather/snapshot-runner-test.js',
  'lighthouse-core/test/fraggle-rock/gather/timespan-runner-test.js',
  'lighthouse-core/test/fraggle-rock/user-flow-test.js',
  'lighthouse-core/test/gather/driver/network-monitor-test.js',
  'lighthouse-core/test/gather/gather-runner-test.js',
  'lighthouse-core/test/gather/gatherers/dobetterweb/response-compression-test.js',
  'lighthouse-core/test/gather/gatherers/full-page-screenshot-test.js',
  'lighthouse-core/test/gather/gatherers/script-elements-test.js',
  'lighthouse-core/test/runner-test.js',

  // ?
  'lighthouse-core/test/config/config-test.js',
  'lighthouse-core/test/fraggle-rock/config/config-test.js',
  'lighthouse-core/test/lib/emulation-test.js',
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
      //      yarn mocha lighthouse-core/test/gather/gatherers/ --no-parallel
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
  // runMochaCLI([test]);
}
