/**
 * @license Copyright 2021 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

// node lighthouse-core/scripts/build-test-flow-report.js

import fs from 'fs';

import open from 'open';

import reportGenerator from '../../report/generator/report-generator.js';
import {LH_ROOT, readJson} from '../../root.js';

const flow = readJson('lighthouse-core/test/fixtures/fraggle-rock/reports/sample-flow-result.json');
const htmlReport = reportGenerator.generateFlowReportHtml(flow);
fs.writeFileSync(`${LH_ROOT}/flow.report.html`, htmlReport);
open(`${LH_ROOT}/flow.report.html`);
