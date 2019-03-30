/**
 * @license Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/**
 * @param {LH.Gatherer.Simulation.Result['nodeTimings']} nodeTimings
 * @return {LH.Trace}
 */
function convertNodeTimingsToTrace(nodeTimings) {
  /** @type {LH.TraceEvent[]} */
  const traceEvents = [];
  const baseTs = 1e9;
  const baseEvent = {pid: 1, tid: 1, cat: 'devtools.timeline'};
  const frame = 'A00001';
  /** @param {number} ms */
  const toMicroseconds = ms => baseTs + ms * 1000;

  traceEvents.push(createFakeTracingStartedInPageEvent());
  traceEvents.push(createFakeTracingStartedInBrowserEvent());

  // Create a fake requestId counter
  let requestId = 1;
  let lastEventEndTime = 0;
  for (const [node, timing] of nodeTimings.entries()) {
    lastEventEndTime = Math.max(lastEventEndTime, timing.endTime);
    if (node.type === 'cpu') {
      // Represent all CPU work that was bundled in a task as an EvaluateScript event
      const cpuNode = /** @type {LH.Gatherer.Simulation.GraphCPUNode} */ (node);
      traceEvents.push(...createFakeTaskEvents(cpuNode, timing));
    } else {
      const networkNode = /** @type {LH.Gatherer.Simulation.GraphNetworkNode} */ (node);
      // Ignore data URIs as they don't really add much value
      if (/^data/.test(networkNode.record.url)) continue;
      traceEvents.push(...createFakeNetworkEvents(networkNode.record, timing));
    }
  }

  // Create a fake task event ~1s after the trace ends for a sane default bounds in DT
  traceEvents.push(
    ...createFakeTaskEvents(
      // @ts-ignore
      {childEvents: [], event: {}},
      {
        startTime: lastEventEndTime + 1000,
        endTime: lastEventEndTime + 1001,
      }
    )
  );

  return {traceEvents};

  /**
   * TODO(cjamcl) - TODO(cjamcl) #7790 This type has not been generated yet.
   * LH.TraceEvent.TracingStartedInPage
   * @return {LH.TraceEvent}
   */
  function createFakeTracingStartedInPageEvent() {
    const argsData = {
      frameTreeNodeId: 1,
      sessionId: '1.1',
      persistentIds: true,
      page: frame,
    };

    return {
      ...baseEvent,
      ts: baseTs - 1e5,
      ph: 'I',
      s: 't',
      cat: 'disabled-by-default-devtools.timeline',
      // @ts-ignore - TODO(cjamcl) #7790
      name: 'TracingStartedInPage',
      args: {data: argsData},
      dur: 0,
    };
  }

  /**
   * @return {LH.TraceEvent.TracingStartedInBrowser.I}
   */
  function createFakeTracingStartedInBrowserEvent() {
    const argsData = {
      frameTreeNodeId: 1,
      sessionId: '1.1',
      persistentIds: true,
      frames: [{frame, url: 'about:blank', name: '', processId: 1}],
    };

    return {
      ...baseEvent,
      ts: baseTs - 1e5,
      tts: baseTs - 1e5,
      ph: 'I',
      s: 't',
      cat: 'disabled-by-default-devtools.timeline',
      name: 'TracingStartedInBrowser',
      args: {data: argsData},
    };
  }

  /**
   * @param {LH.Gatherer.Simulation.GraphCPUNode} cpuNode
   * @param {{startTime: number, endTime: number}} timing
   * @return {LH.TraceEvent[]}
   */
  function createFakeTaskEvents(cpuNode, timing) {
    const argsData = {
      url: '',
      frame,
      lineNumber: 0,
      columnNumber: 0,
    };

    const eventTs = toMicroseconds(timing.startTime);

    /** @type {LH.TraceEvent[]} */
    const events = [
      {
        ...baseEvent,
        ph: 'X',
        // @ts-ignore - TODO(cjamcl) #7790 This type has not been generated yet.
        name: 'Task',
        ts: eventTs,
        dur: (timing.endTime - timing.startTime) * 1000,
        args: {data: argsData},
      },
    ];

    const nestedBaseTs = cpuNode.event.ts || 0;
    // @ts-ignore - TODO(cjamcl) #7790
    const multiplier = (timing.endTime - timing.startTime) * 1000 / cpuNode.event.dur;
    // https://github.com/ChromeDevTools/devtools-frontend/blob/5429ac8a61ad4fa/front_end/timeline_model/TimelineModel.js#L1129-L1130
    const netReqEvents = new Set(['ResourceSendRequest', 'ResourceFinish',
      'ResourceReceiveResponse', 'ResourceReceivedData']);
    for (const event of cpuNode.childEvents) {
      if (netReqEvents.has(event.name)) continue;
      const ts = eventTs + (event.ts - nestedBaseTs) * multiplier;
      const newEvent = {...event, ...{pid: baseEvent.pid, tid: baseEvent.tid}, ts};
      // @ts-ignore - TODO(cjamcl) #7790
      if (event.dur) newEvent.dur = event.dur * multiplier;
      events.push(newEvent);
    }

    return events;
  }

  /**
   * @param {LH.Artifacts.NetworkRequest} record
   * @param {LH.Gatherer.Simulation.NodeTiming} timing
   * @return {LH.TraceEvent[]}
   */
  function createFakeNetworkEvents(record, timing) {
    requestId++;

    // 0ms requests get super-messed up rendering
    // Use 0.3ms instead so they're still hoverable, https://github.com/GoogleChrome/lighthouse/pull/5350#discussion_r194563201
    let {startTime, endTime} = timing; // eslint-disable-line prefer-const
    if (startTime === endTime) endTime += 0.3;

    const requestData = {requestId: requestId.toString(), frame};
    const baseRequestEvent = {...baseEvent, ph: 'I', s: 't', dur: 0};

    const sendRequestData = {
      ...requestData,
      requestMethod: record.requestMethod,
      url: record.url,
      priority: record.priority,
    };

    const receiveResponseData = {
      ...requestData,
      statusCode: record.statusCode,
      mimeType: record.mimeType,
      encodedDataLength: record.transferSize,
      fromCache: record.fromDiskCache,
      fromServiceWorker: record.fetchedViaServiceWorker,
    };

    const resourceFinishData = {
      ...requestData,
      decodedBodyLength: record.resourceSize,
      didFail: !!record.failed,
      finishTime: endTime,
      encodedDataLength: record.transferSize,
    };

    /** @type {LH.TraceEvent[]} */
    const events = [
      {
        ...baseRequestEvent,
        name: 'ResourceSendRequest',
        ph: 'I',
        tts: 0,
        ts: toMicroseconds(startTime),
        args: {data: sendRequestData},
      },
      {
        ...baseRequestEvent,
        name: 'ResourceFinish',
        ph: 'I',
        tts: 0,
        ts: toMicroseconds(endTime),
        args: {data: resourceFinishData},
      },
    ];

    if (!record.failed) {
      events.push({
        ...baseRequestEvent,
        name: 'ResourceReceiveResponse',
        ph: 'I',
        tts: 0,
        ts: toMicroseconds((startTime + endTime) / 2),
        args: {data: receiveResponseData},
      });
    }

    return events;
  }
}

module.exports = {
  simulationNamesToIgnore: [
    'unlabeled',
    // These node timings should be nearly identical to the ones produced for Interactive
    'optimisticFirstCPUIdle',
    'optimisticFlexFirstCPUIdle',
    'pessimisticFirstCPUIdle',
    'optimisticSpeedIndex',
    'optimisticFlexSpeedIndex',
    'pessimisticSpeedIndex',
    'optimisticEstimatedInputLatency',
    'optimisticFlexEstimatedInputLatency',
    'pessimisticEstimatedInputLatency',
  ],
  convertNodeTimingsToTrace,
};
