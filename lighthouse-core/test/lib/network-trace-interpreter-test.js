/**
 * @license Copyright 2021 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */


import {readJson} from '../../../root.js';
import NetworkTraceInterpreter from '../../lib/network-trace-interpreter.js';
import NetworkRecorder from '../../lib/network-recorder.js';

const devtoolsLog = readJson('./latest-run/defaultPass.devtoolslog.json');
const trace = readJson('./latest-run/defaultPass.trace.json');


const EXEMPLAR_REQUEST_ID = '17107.2';
/* eslint-env jest */
describe('recordsFromTrace', () => {
  const netReqsDTL = NetworkRecorder.recordsFromLogs(devtoolsLog);
  const netReqsTrace = NetworkTraceInterpreter.recordsFromTrace(trace);

  /** @param {LH.Artifacts.NetworkRequest[]} arr */
  const idsAndUrls = arr => arr.map((req) => `${req.requestId} -- ${req.url}`).sort();

  it('Generates the same request IDs', async () => {
    const allReqIdsDTL = idsAndUrls(netReqsDTL);
    const allReqIdsTrace = idsAndUrls(netReqsTrace);

    expect(allReqIdsTrace).toMatchObject(allReqIdsDTL);
    expect(allReqIdsDTL).toMatchObject(allReqIdsTrace);

    expect(allReqIdsTrace.length).toBe(allReqIdsDTL.length);
  });

  it('Generates the same request data', async () => {
    // TODO this is currently testing just 1 request. ideally this "test" tries ALL requests that DTlog finds.
    const pred = /** @type {LH.Artifacts.NetworkRequest} */ (nr) =>
      nr.requestId === EXEMPLAR_REQUEST_ID;

    const dtlNR = netReqsDTL.find(pred);
    const myTraceNR = netReqsTrace.find(pred);
    if (!dtlNR || !myTraceNR) {
      console.error(`no matching request found. try one of these:`, idsAndUrls(netReqsDTL));
      throw new Error('request not found');
    }

    // TODO: handle these…
    // dtlNR.initiatorRequest = undefined;
    // dtlNR.redirectDestination = undefined;
    dtlNR.responseHeaders = [];
    dtlNR.responseHeadersText = '';

    expect(myTraceNR).toMatchObject(dtlNR);
    expect(dtlNR).toMatchObject(myTraceNR);
  });
});
