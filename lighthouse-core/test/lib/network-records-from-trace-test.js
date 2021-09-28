/**
 * @license Copyright 2021 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

'use strict';

// READING FROM LATEST RUNNNNNNNNNNNNNNN
const devtoolsLog = require('../../../latest-run/defaultPass.devtoolslog.json');
const trace = require('../../../latest-run/defaultPass.trace.json');

const NetworkRecords = require('../../computed/network-records.js');
const constructRecordsFromTrace = require('../../lib/network-records-from-trace.js');

const NetworkRecorder = require('../../lib/network-recorder.js');


/* eslint-env jest */
describe('NetworkRecordsFromTrace', () => {
  it('works', async () => {
    const netReqsDTL = NetworkRecorder.recordsFromLogs(devtoolsLog);
    const netReqsTrace = constructRecordsFromTrace(trace);

    const allReqIds = netReqsDTL.map((req) => req.requestId);

    console.log('Try replacing with another req Id!', allReqIds);

    // TODO this is currently testing just 1 request. ideally this "test" tries ALL requests that DTlog finds.
    const pred = (nr) => nr.requestId === '37148.3';

    const dtlNR = netReqsDTL.find(pred);
    const myTraceNR = netReqsTrace.find(pred);

    // TODO: handle these…
    dtlNR.initiatorRequest = undefined;
    dtlNR.redirectDestination = undefined;
    dtlNR.responseHeaders = [];
    dtlNR.responseHeadersText = '';

    expect(myTraceNR).toMatchObject(dtlNR);
    expect(dtlNR).toMatchObject(myTraceNR);
  });
});
