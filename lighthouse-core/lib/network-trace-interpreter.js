/**
 * @license Copyright 2022 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

'use strict';

const NetworkRecorder = require('./network-recorder.js');
const NetworkRequest = require('./network-request.js');

/** @typedef {'willSendRequest' | 'sendRequest' | 'receiveResponse' | 'receivedData' | 'resourceFinish' } traceEventKey */

const networkTraceEventNamesToAliases = {
  ResourceWillSendRequest: 'willSendRequest',
  ResourceSendRequest: 'sendRequest',
  ResourceReceiveResponse: 'receiveResponse',
  ResourceReceivedData: 'receivedData',
  ResourceFinish: 'resourceFinish',
};

const networkTraceEventNames = Object.keys(networkTraceEventNamesToAliases);

class NetworkTraceInterpreter {
  constructor() {
    this.networkRecorder = new NetworkRecorder();
  }

  /**
   *
   * @param {LH.TraceEvent} event
   * @returns
   */
  handleEvent(event) {
    if (!networkTraceEventNames.includes(event.name)) {
      return;
    }

    switch (event.name) {
      // case 'ResourceWillSendRequest': return this.onSendRequest(event); // CDP doesnt have the equiv, thus the left whisker.
      case 'ResourceSendRequest': return this.onSendRequest(event);
      case 'ResourceReceiveResponse': return this.onResponseReceived(event);
      case 'ResourceReceivedData': return this.onResponseReceived(event);
      case 'ResourceFinish': return this.onDataReceived(event);
      default: return;
    }
  }

  /**
   *
   * @param {LH.Trace.ResourceSendRequestEvent} event
   */
  onSendRequest(event) {
    const requestId = event.args.data.requestId;
    // const request = this.getRequest(requestId);

    // Handle request
    /** @type {LH.Crdp.Network.RequestWillBeSentEvent} */
    const requestWillBeSentEventData = {
      // documentURL:     // brendan: Required, get from frame info?
      frameId: event.args.data?.frame,
      // initiator:    // not available AFAICT
      request: {
        initialPriority: event.args.data?.priority,
        method: event.args.data?.requestMethod,
        url: event.args.data?.url,
        headers: {}, // not available, required, tho
        referrerPolicy: 'unsafe-url', // not populated, but required…
        // .isLinkPreload: // not there
      },
      initiator: {type: 'other'}, // No preload signals in trace…
      requestId,
    };
    this.networkRecorder.onRequestWillBeSent({params: requestWillBeSentEventData});
  }


  /**
   * @param {LH.Trace.ResourceReceiveResponseEvent} event
   */
  onResponseReceived(event) {
    const requestId = event.args.data.requestId;
    // const request = this.getRequest(requestId);
    const request = this.networkRecorder._findRealRequestAndSetSession(requestId, undefined);
    if (!request) {
      throw new Error(`mismatched event: ${JSON.stringify(event)}`);
    }
    // this.networkRecorder.onRequestStarted(request);

    // Handle response
    /** @type {LH.Crdp.Network.ResponseReceivedEvent} */
    const responseReceivedEventData = {
      timestamp: event.args.data?.responseTime,
      response: {
        status: event.args.data?.statusCode,
        timing: event.args.data?.timing, // data: URI requests have no timing obj in the trace
        headers: {}, // not available, required, tho
        mimeType: event.args.data?.mimeType,
        fromServiceWorker: event.args.data?.fromServiceWorker,
        encodedDataLength: 0, // zero only because the full total is set in DataReceived
        url: request.url,
      },
      frameId: event.args.data?.frame,
      requestId,
    };
    this.networkRecorder.onResponseReceived({params: responseReceivedEventData});

    // TODO: not entirely sure this is memorycache, but perhaps.
    // also LOL that even blink has to guess about this. https://source.chromium.org/chromium/chromium/src/+/main:third_party/blink/renderer/platform/loader/fetch/url_loader/web_url_loader.cc;l=796-798;drc=62b6100d21dde58ad66fb6f42383bfa975f6d4ba
    if (request) {
      request.fromMemoryCache = !!event.args.data?.fromCache;
    }
  }

  /**
   * @param {LH.Trace.ResourceReceivedDataEvent} event
   */
  onDataReceived(event) {
    const requestId = event.args.data.requestId;
    // const request = this.getRequest(requestId);

    // Set resourceSize & transferSize
    /** @type {LH.Crdp.Network.DataReceivedEvent} */
    const dataReceivedEventData = {
      encodedDataLength: event.args.data?.encodedDataLength,
      dataLength: event.args.data?.encodedDataLength,
      requestId,
    };
    this.networkRecorder.onDataReceived({params: dataReceivedEventData});
  }

  /**
   * @param {LH.Trace.ResourceFinishEvent} event
   */
  onLoadingFinished(event) {
    const requestId = event.args.data.requestId;
    // const request = this.getRequest(requestId);

    // Finish (or fail)
    /** @type {LH.Crdp.Network.LoadingFinishedEvent} */
    const loadingFinishedEventData = {
      requestId,
      encodedDataLength: event.args.data?.encodedDataLength,
      timestamp: event.args.data?.finishTime,
    };
    if (event.args.data?.didFail) {
      this.networkRecorder.onLoadingFailed({params: loadingFinishedEventData});
    } else {
      this.networkRecorder.onLoadingFinished({params: loadingFinishedEventData});
    }
  }

  /**
   * @param {LH.Trace} trace
   * @return {Array<LH.Artifacts.NetworkRequest>}
   */
  static recordsFromTrace(trace) {
    const interpreter = new NetworkTraceInterpreter();

    for (const event of trace.traceEvents) {
      interpreter.handleEvent(event);
    }
    // const requests = interpreter.synthesizeRequests();

    return NetworkRecorder.finalizeConstructedRecords(interpreter.networkRecorder.getRawRecords());
  }
}

module.exports = NetworkTraceInterpreter;
