/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

import {existsSync} from 'fs';
import * as path from 'path';

import * as Commands from './commands/commands';
import * as Printer from './printer';
import {getFlags} from './cli-flags';
import {runLighthouse} from './run';

const log = require('lighthouse-logger');
const perfOnlyConfig = require('../lighthouse-core/config/perf.json');
const pkg = require('../package.json');
const Sentry = require('../lighthouse-core/lib/sentry');

// accept noop modules for these, so the real dependency is optional.
import {updateNotifier} from './shim-modules';
import {askPermission} from './sentry-prompt';

function isDev() {
  return existsSync(path.join(__dirname, '../.git'));
}

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

export async function run() {
  if (typeof cliFlags.enableErrorReporting === 'undefined') {
    cliFlags.enableErrorReporting = await askPermission();
  }

  Sentry.init({
    url,
    flags: cliFlags,
    environmentData: {
      name: 'redacted', // prevent sentry from using hostname
      environment: isDev() ? 'development' : 'production',
      release: pkg.version,
      tags: {
        channel: 'cli',
      },
    },
  });

  return runLighthouse(url, cliFlags, config);
}
