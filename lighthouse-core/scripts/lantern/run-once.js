#!/usr/bin/env node
/**
 * @license Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const path = require('path');
const LH_ROOT_DIR = path.join(__dirname, '../../../');

if (process.argv.length !== 4) throw new Error('Usage $0 <trace file> <devtools file>');

async function run() {
  const PredictivePerf = require(path.join(LH_ROOT_DIR, 'lighthouse-core/audits/predictive-perf'));
  const Runner = require(path.join(LH_ROOT_DIR, 'lighthouse-core/runner'));

  const traces = {defaultPass: require(process.argv[2])};
  const devtoolsLogs = {defaultPass: require(process.argv[3])};
  const artifacts = {traces, devtoolsLogs, ...Runner.instantiateComputedArtifacts()};

  const result = await PredictivePerf.audit(artifacts);
  process.stdout.write(JSON.stringify(result.details.items[0], null, 2));
}

run().catch(err => {
  process.stderr.write(err.stack);
  process.exit(1);
});
