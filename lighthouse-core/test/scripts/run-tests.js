/**
 * @license Copyright 2022 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/**
 * @fileoverview
 * CLI tool for running mocha tests.
 * Run with `yarn mocha`.
 */

import yargs from 'yargs';
import * as yargsHelpers from 'yargs/helpers';
import glob from 'glob';
import {LH_ROOT} from '../../../root.js';
import {execFileSync} from 'child_process';

const y = yargs(yargsHelpers.hideBin(process.argv));
const rawArgv = y
  .help('help')
  .usage('node $0 [<options>] <paths>')
  // .example('node $0 -j=1 pwa seo', 'run pwa and seo tests serially')
  // .example('node $0 --invert-match byte', 'run all smoke tests but `byte`')
  .option('_', {
    array: true,
    type: 'string',
  })
  .options({
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

const allTestFiles = glob.sync('lighthouse-cli/test/cli/*.js', {cwd: LH_ROOT});
const filteredTests = argv._.length ?
  allTestFiles.filter((file) => argv._.some(pattern => file.includes(pattern))) :
  allTestFiles;

const args = [
  '--loader=testdouble',
  'node_modules/mocha/bin/mocha.js',
  '--require=lighthouse-core/test/mocha-setup.js',
  ...filteredTests,
];
console.log(`Running command: ${argv.update ? 'SNAPSHOT_UPDATE=1' : ''} node ${args.join(' ')}`);

try {
  execFileSync('node', args, {
    cwd: LH_ROOT,
    env: {...process.env, SNAPSHOT_UPDATE: argv.update ? '1' : undefined},
    stdio: 'inherit',
  });
} catch {
  process.exit(1);
}
