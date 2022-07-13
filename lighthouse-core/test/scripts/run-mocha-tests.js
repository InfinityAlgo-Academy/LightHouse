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
import fs from 'fs';
import path from 'path';

import yargs from 'yargs';
import * as yargsHelpers from 'yargs/helpers';
import glob from 'glob';

import {LH_ROOT} from '../../../root.js';

/** @param {string} text */
function escapeRegex(text) {
  return text.replace(/[-\\^$*+?.()|[\]{}]/g, '\\$&');
}

const failedTestsDir = `${LH_ROOT}/.tmp/failing-tests`;

function getFailedTests() {
  const allFailedTests = [];
  for (const file of glob.sync('*.json', {cwd: failedTestsDir, absolute: true})) {
    allFailedTests.push(...JSON.parse(fs.readFileSync(file, 'utf-8')));
  }
  return allFailedTests;
}

// Some tests replace real modules with mocks in the global scope of the test file
// (outside 'before' lifecycle / a test unit). Before doing any lifecycle stuff, Mocha will load
// all test files (everything if --no-parallel, else each worker will load a subset of the files
// all at once). This results in unexpected mocks contaminating other test files.
//
// Tests do other undesired things in the global scope too, such as enabling fake timers.
//
// For now, we isolate a number of tests until they can be refactored.
//
// To run tests without isolation, and all in one process:
//    yarn mocha --no-isolation --no-parallel lighthouse-core/test
//
// Because mocha workers can divide up test files that mess with global scope in a way that
// _just happens_ to not cause anything to fail, use this command to verify that
// all necessary tests are isolated:
//    yarn mocha --no-parallel
// (also, just comment out the `testsToRunIsolated` below, as they won't impact this verification)
const testsToIsolate = new Set([
  // grep -lRE '^timers\.useFakeTimers' --include='*-test.*' --exclude-dir=node_modules
  'flow-report/test/common-test.tsx',
  'lighthouse-core/test/fraggle-rock/gather/session-test.js',
  'lighthouse-core/test/gather/driver-test.js',
  'lighthouse-core/test/gather/driver/execution-context-test.js',
  'lighthouse-core/test/gather/driver/navigation-test.js',
  'lighthouse-core/test/gather/driver/wait-for-condition-test.js',
  'lighthouse-core/test/gather/gatherers/css-usage-test.js',
  'lighthouse-core/test/gather/gatherers/image-elements-test.js',
  'lighthouse-core/test/gather/gatherers/inspector-issues-test.js',
  'lighthouse-core/test/gather/gatherers/js-usage-test.js',
  'lighthouse-core/test/gather/gatherers/source-maps-test.js',
  'lighthouse-core/test/gather/gatherers/trace-elements-test.js',
  'lighthouse-core/test/gather/gatherers/trace-test.js',

  // grep -lRE '^td\.replace' --include='*-test.*' --exclude-dir=node_modules
  'lighthouse-core/test/fraggle-rock/gather/snapshot-runner-test.js',
  'lighthouse-core/test/fraggle-rock/gather/timespan-runner-test.js',
  'lighthouse-core/test/fraggle-rock/user-flow-test.js',
  'lighthouse-core/test/gather/driver/prepare-test.js',
  'lighthouse-core/test/gather/gatherers/link-elements-test.js',
  'lighthouse-core/test/gather/gatherers/service-worker-test.js',
  'lighthouse-core/test/runner-test.js',

  // grep -lRE --include='-test.js' 'mockDriverSubmodules|mockRunnerModule|mockDriverModule|mockDriverSubmodules|makeMocksForGatherRunner' --include='*-test.*' --exclude-dir=node_modules
  'lighthouse-core/test/fraggle-rock/gather/navigation-runner-test.js',
  'lighthouse-core/test/fraggle-rock/gather/snapshot-runner-test.js',
  'lighthouse-core/test/fraggle-rock/gather/timespan-runner-test.js',
  'lighthouse-core/test/fraggle-rock/user-flow-test.js',
  'lighthouse-core/test/gather/gather-runner-test.js',
  'lighthouse-core/test/gather/gatherers/dobetterweb/response-compression-test.js',
  'lighthouse-core/test/gather/gatherers/script-elements-test.js',
  'lighthouse-core/test/runner-test.js',

  // These tend to timeout in puppeteer when run in parallel with other tests.
  'lighthouse-core/test/fraggle-rock/scenarios/api-test-pptr.js',
  'lighthouse-core/test/fraggle-rock/scenarios/cross-origin-test-pptr.js',
  'lighthouse-core/test/fraggle-rock/scenarios/disconnect-test-pptr.js',

  // ?
  'clients/test/lightrider/lightrider-entry-test.js', // Runner overrides.
  'flow-report/test/flow-report-pptr-test.ts',
  'lighthouse-cli/test/cli/bin-test.js',
  'lighthouse-cli/test/cli/run-test.js',
  'lighthouse-core/test/config/config-test.js',
  'lighthouse-core/test/fraggle-rock/config/config-test.js',
  'lighthouse-core/test/lib/emulation-test.js',
  'report/test/clients/bundle-test.js',
  'report/test/clients/bundle-test.js',
  'shared/test/localization/format-test.js',
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
      // all tests have finished. This may be undesired for local development, so enable
      // parallel mode by default only in CI.
      // Also, good to default to false locally because that avoids missing cross-file
      // test contamination by chance of mocha splitting up the work in a way that hides it.
      default: Boolean(process.env.CI),
    },
    'bail': {
      alias: 'b',
      type: 'boolean',
      default: false,
    },
    't': {
      type: 'string',
      describe: 'an alias for --grep, to run only tests with matching titles',
    },
    'onlyFailures': {
      type: 'boolean',
    },
  })
  .wrap(y.terminalWidth())
  .argv;
const argv =
  /** @type {Awaited<typeof rawArgv> & CamelCasify<Awaited<typeof rawArgv>>} */ (rawArgv);

// This captures all of our mocha tests except for:
// * flow-report, because it needs to provide additional mocha flags
// * various *-test-pptr.js integration tests, which are long so are handled explicitly in
//   specific package.json scripts
const defaultTestMatches = [
  'build/**/*-test.js',
  'clients/test/**/*-test.js',
  'lighthouse-cli/**/*-test.js',
  'lighthouse-core/**/*-test.js',
  'lighthouse-core/test/fraggle-rock/**/*-test-pptr.js',
  'report/**/*-test.js',
  'shared/**/*-test.js',
  'third-party/**/*-test.js',
  'treemap/**/*-test.js',
  'viewer/**/*-test.js',
];

const mochaPassThruArgs = argv._.filter(arg => typeof arg !== 'string' || arg.startsWith('--'));
const filterFilePatterns = argv._.filter(arg => !(typeof arg !== 'string' || arg.startsWith('--')));

function getTestFiles() {
  // Collect all the possible test files, based off the provided testMatch glob pattern
  // or the default patterns defined above.
  const testsGlob = argv.testMatch || `{${defaultTestMatches.join(',')}}`;
  const allTestFiles = glob.sync(testsGlob, {cwd: LH_ROOT, absolute: true});

  // If provided, filter the test files using a basic string includes on the absolute path of
  // each test file. Map back to a relative path because it's nice to keep the printed commands shorter.
  // Why pass `absolute: true` to glob above? So that this works:
  //     yarn mocha /Users/cjamcl/src/lighthouse/lighthouse-core/test/runner-test.js
  let filteredTests = (
    filterFilePatterns.length ?
      allTestFiles.filter((file) => filterFilePatterns.some(pattern => file.includes(pattern))) :
      allTestFiles
  ).map(testPath => path.relative(process.cwd(), testPath));

  if (argv.onlyFailures) {
    const failedTests = getFailedTests();
    if (failedTests.length === 0) throw new Error('no tests failed');

    const titles = getFailedTests().map(failed => failed.title);
    baseArgs.push(`--grep="${titles.map(escapeRegex).join('|')}"`);

    filteredTests = filteredTests.filter(file => failedTests.some(failed => failed.file === file));
  }

  if (filterFilePatterns.length) {
    console.log(`applied test filters: ${JSON.stringify(filterFilePatterns, null, 2)}`);
  }
  console.log(`running ${filteredTests.length} test files`);

  return filteredTests;
}

const baseArgs = [
  '--require=lighthouse-core/test/test-env/mocha-setup.js',
  '--timeout=20000',
  // TODO(esmodules): this is only utilized for CLI tests, since only CLI is ESM + mocks.
  '--loader=testdouble',
];
if (argv.t) baseArgs.push(`--grep='${argv.t}'`);
if (!argv.t || process.env.CI) baseArgs.push('--fail-zero');
if (argv.bail) baseArgs.push('--bail');
if (argv.parallel) baseArgs.push('--parallel');
baseArgs.push(...mochaPassThruArgs);

const testsToRun = getTestFiles();
const testsToRunTogether = [];
const testsToRunIsolated = [];
for (const test of testsToRun) {
  if (argv.isolation && testsToIsolate.has(test)) {
    testsToRunIsolated.push(test);
  } else {
    testsToRunTogether.push(test);
  }
}

fs.rmSync(failedTestsDir, {recursive: true, force: true});
fs.mkdirSync(failedTestsDir, {recursive: true});

/**
 * @param {number} code
 */
function exit(code) {
  if (code === 0) {
    console.log('Tests passed');
    process.exit(0);
  }

  if (numberMochaInvocations === 1) {
    console.log('Tests failed');
    process.exit(code);
  }

  // If running many instances of mocha, failed results can get lost in the output.
  // So keep track of failures and re-print them at the very end.
  // See mocha-setup.js afterAll.

  const allFailedTests = getFailedTests();
  const groupedByFile = new Map();
  for (const failedTest of allFailedTests) {
    const failedTests = groupedByFile.get(failedTest.file) || [];
    failedTests.push(failedTest);
    groupedByFile.set(failedTest.file, failedTests);
  }

  console.log(`${allFailedTests.length} tests failed`);
  console.log('Printing failing tests:\n===========\n');

  for (const [file, failedTests] of groupedByFile) {
    console.log(`${file}\n`);
    for (const failedTest of failedTests) {
      console.log(`= ${failedTest.title}\n`);
      console.log(`${failedTest.error}\n`);
    }
  }

  process.exit(code);
}

let numberMochaInvocations = 0;
let didFail = false;

/**
 * @param {string[]} tests
 */
function runMochaCLI(tests) {
  const file = 'npx';
  const args = [
    'mocha',
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
        TS_NODE_TRANSPILE_ONLY: '1',
        LH_FAILED_TESTS_FILE: `${failedTestsDir}/output-${numberMochaInvocations}.json`,
      },
      stdio: 'inherit',
    });
  } catch {
    if (argv.bail) {
      exit(1);
    } else {
      didFail = true;
    }
  } finally {
    numberMochaInvocations += 1;
  }
}

if (testsToRunTogether.length) runMochaCLI(testsToRunTogether);
for (const test of testsToRunIsolated) {
  console.log(`Running test in isolation: ${test}`);
  runMochaCLI([test]);
}

exit(didFail ? 1 : 0);
