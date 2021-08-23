/**
 * @license Copyright 2021 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const fs = require('fs');
const open = require('open');
const {execFileSync} = require('child_process');

execFileSync(`yarn`, ['build-report', '--standalone']);
const reportGenerator = require('../../report/generator/report-generator.js');

const flow = JSON.parse(fs.readFileSync(
      `${__dirname}/../test/fixtures/fraggle-rock/reports/sample-lhrs.json`,
      'utf-8')
);

const htmlReport = reportGenerator.generateFlowReportHtml(flow);

fs.writeFileSync(`${__dirname}/../../flow.report.html`, htmlReport);
open(`${__dirname}/../../flow.report.html`);
