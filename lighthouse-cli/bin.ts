/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

import * as path from 'path';

import * as Commands from './commands/commands';
import * as Printer from './printer';
import {getFlags} from './cli-flags';
import {runLighthouse} from './run';

const log = require('lighthouse-logger');
const perfOnlyConfig = require('../lighthouse-core/config/perf.json');
const pkg = require('../package.json');

// accept noop modules for these, so the real dependency is optional.
import {updateNotifier} from './shim-modules';


// Tell user if there's a newer version of LH.
updateNotifier({pkg}).notify();

const cliFlags = getFlags();

// Process terminating command
if (cliFlags.listAllAudits) {
  Commands.ListAudits();
}

// Process terminating command
if (cliFlags.listTraceCategories) {
  Commands.ListTraceCategories();
}

const url = cliFlags._[0];

let config: Object|null = null;
if (cliFlags.configPath) {
  // Resolve the config file path relative to where cli was called.
  cliFlags.configPath = path.resolve(process.cwd(), cliFlags.configPath);
  config = require(cliFlags.configPath);
} else if (cliFlags.perf) {
  config = perfOnlyConfig;
}

// set logging preferences
cliFlags.logLevel = 'info';
if (cliFlags.verbose) {
  cliFlags.logLevel = 'verbose';
} else if (cliFlags.quiet) {
  cliFlags.logLevel = 'silent';
}
log.setLevel(cliFlags.logLevel);

if (cliFlags.output === Printer.OutputMode[Printer.OutputMode.json] && !cliFlags.outputPath) {
  cliFlags.outputPath = 'stdout';
}

export function run() {
  return runLighthouse(url, cliFlags, config);
}
