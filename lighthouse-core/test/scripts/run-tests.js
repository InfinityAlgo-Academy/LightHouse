/**
 * @license Copyright 2022 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */


/**
 * @fileoverview
 * CLI tool for running mocha tests.
 * Run with `yarn mocha`.
 */

import {execFileSync} from 'child_process';

import yargs from 'yargs';
import * as yargsHelpers from 'yargs/helpers';
import glob from 'glob';

import {LH_ROOT} from '../../../root.js';

const y = yargs(yargsHelpers.hideBin(process.argv));
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

const mochaPassThruArgs = argv._.filter(arg => arg.startsWith('--'));
const filterFilePatterns = argv._.filter(arg => !arg.startsWith('--'));

const testsGlob = argv.testMatch || `{${defaultTestMatches.join(',')}}`;
const allTestFiles = glob.sync(testsGlob, {cwd: LH_ROOT});
const filteredTests = filterFilePatterns.length ?
  allTestFiles.filter((file) => filterFilePatterns.some(pattern => file.includes(pattern))) :
  allTestFiles;

if (filterFilePatterns.length) {
  console.log(`applied test filters: ${JSON.stringify(filterFilePatterns, null, 2)}`);
}
console.log(`running ${filteredTests.length} test files`);

const args = [
  '--loader=testdouble',
  '--require=lighthouse-core/test/mocha-setup.cjs',
  ...mochaPassThruArgs,
  ...filteredTests,
];
console.log(`Running command: ${argv.update ? 'SNAPSHOT_UPDATE=1 ' : ''}node ${args.join(' ')}`);

try {
  execFileSync('node_modules/mocha/bin/mocha', args, {
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
