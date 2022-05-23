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
      case 'ResourceWillSendRequest': return this.onSendRequest(event);
      case 'ResourceSendRequest': return this.onSendRequest(event);
      case 'ResourceReceiveResponse': return this.onResponseReceived(event);
      case 'ResourceReceivedData': return this.onResponseReceived(event);
      case 'ResourceFinish': return this.onDataReceived(event);
      default: return;
    }
  }

  //   const requestId = event.args.data?.requestId;
  //   if (!requestId) {
  //     throw new Error('network trace events expected to have a requestId');
  //   }

  //   const evtBag = this.requestIdToEventsMap.get(requestId) || {};
  //   if (evtBag[networkTraceEventNamesToAliases[event.name]]) {
  //     console.log('we got an overwrite', event);
  //   }
  //   evtBag[networkTraceEventNamesToAliases[event.name]] = event;
  //   this.requestIdToEventsMap.set(requestId, evtBag);
  // }

  synthesizeRequests() {
    for (const [requestId, evtBag] of this.requestIdToEventsMap.entries()) {
      let request = this.networkRecorder._findRealRequestAndSetSession(requestId, undefined); // TODO: undefined sessionId is fine?

      // This is a simple new request, create the NetworkRequest object
      if (!request) {
        request = new NetworkRequest();
      } else {
        // We have a redirect
        console.log('redirect!', request.url);
      }

      // If we have an incomplete set of events here, we choose to drop the network
      // request rather than attempt to synthesize the missing data.
      if (!evtBag || !evtBag.sendRequest || !evtBag.receiveResponse || !evtBag.resourceFinish) {
        console.error('missing something!');
        continue;
      }
    }

    // TODO: something about redirects.
    //   i see stuff in onRequestWillBeSent i'm skipping…
    //   and a bunch of stuff in recordsFromLogs
    // } // eo loop

    return this.networkRecorder.getRawRecords();
  }
  /**
   *
   * @param {LH.Trace.ResourceSendRequestEvent} event
   */
  onSendRequest(event) {
    // Handle request
    /** @type {LH.Crdp.Network.RequestWillBeSentEvent} */
    const requestWillBeSentEventData = {
      // documentURL:     // brendan: Required, get from frame info?
      frameId: evtBag.sendRequest.args.data?.frame,
      // initiator:    // not available AFAICT
      request: {
        initialPriority: evtBag.sendRequest.args.data?.priority,
        method: evtBag.sendRequest.args.data?.requestMethod,
        url: evtBag.sendRequest.args.data?.url,
        headers: {}, // not available, required, tho
        referrerPolicy: 'unsafe-url', // not populated, but required…
        // .isLinkPreload: // not there
      },
      initiator: {type: 'other'}, // No preload signals in trace…
      requestId,
      timestamp: evtBag.receiveResponse.args.data?.timing?.requestTime ??
            evtBag.receiveResponse.ts / 1_000_000,
      type: evtBag.receiveResponse.args.data?.mimeType === 'text/html' ? 'Document' : undefined, // This is imperfect.
    };
    request.onRequestWillBeSent(requestWillBeSentEventData);
  }

  onResponseReceived(event) {
    // TODO: not entirely sure this is memorycache, but perhaps.
    // also LOL that even blink has to guess about this. https://source.chromium.org/chromium/chromium/src/+/main:third_party/blink/renderer/platform/loader/fetch/url_loader/web_url_loader.cc;l=796-798;drc=62b6100d21dde58ad66fb6f42383bfa975f6d4ba
    request.fromMemoryCache = evtBag.receiveResponse.args.data?.fromCache;

    this.networkRecorder.onRequestStarted(request);

    // Handle response
    /** @type {LH.Crdp.Network.ResponseReceivedEvent} */
    const responseReceivedEventData = {
      timestamp: evtBag.receiveResponse.args.data?.responseTime,
      response: {
        status: evtBag.receiveResponse.args.data?.statusCode,
        timing: evtBag.receiveResponse.args.data?.timing, // data: URI requests have no timing obj in the trace
        headers: {}, // not available, required, tho
        mimeType: evtBag.receiveResponse.args.data?.mimeType,
        fromServiceWorker: evtBag.receiveResponse.args.data?.fromServiceWorker,
        encodedDataLength: 0, // zero only because the full total is set in DataReceived
        url: evtBag.sendRequest.args.data?.url,
      },
      frameId: evtBag.receiveResponse.args.data?.frame,
    };
    request.onResponseReceived(responseReceivedEventData);
  }

  onDataReceived(event) {
    // Set resourceSize & transferSize
    /** @type {LH.Crdp.Network.DataReceivedEvent} */
    const dataReceivedEventData = {
      encodedDataLength: evtBag.resourceFinish.args.data?.encodedDataLength,
      dataLength: evtBag.resourceFinish.args.data?.decodedBodyLength,
    };
    request.onDataReceived(dataReceivedEventData);
  }
  onLoadingFinished(event) {
    // Finish (or fail)
    /** @type {LH.Crdp.Network.LoadingFinishedEvent} */
    const loadingFinishedEventData = {
      requestId,
      encodedDataLength: evtBag.resourceFinish.args.data?.encodedDataLength,
      timestamp: evtBag.resourceFinish.args.data?.finishTime,
    };
    if (evtBag.resourceFinish.args.data?.didFail) {
      request.onLoadingFailed(loadingFinishedEventData);
    } else {
      request.onLoadingFinished(loadingFinishedEventData);
    }
    this.networkRecorder.onRequestFinished(request);
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
    const requests = interpreter.synthesizeRequests();
    return NetworkRecorder.finalizeConstructedRecords(requests);
  }
}

module.exports = NetworkTraceInterpreter;
