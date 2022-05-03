/**
 * @license Copyright 2018 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const pid = 1111;
const tid = 222;
const browserPid = 13725;
const rootFrame = '3EFC2700D7BC3F4734CAF2F726EFB78C';
const defaultUrl = 'https://example.com/';

/** @typedef {{ts: number, duration: number, children?: Array<ChildTaskDef>}} TopLevelTaskDef */
/** @typedef {{ts: number, duration: number, url: string | undefined}} ChildTaskDef */
/** @typedef {{frame: string}} ChildFrame */
/**
 * @typedef TraceOptions
 * @property {string} [frameUrl]
 * @property {number} [timeOrigin]
 * @property {number} [largestContentfulPaint]
 * @property {number} [traceEnd]
 * @property {Array<TopLevelTaskDef>} [topLevelTasks]
 * @property {Array<ChildFrame>} [childFrames] Add a child frame with a known `frame` id for easy insertion of child frame events.
 */

/**
 * @param {TopLevelTaskDef} options
 */
function getTopLevelTask({ts, duration}) {
  return {
    name: 'RunTask',
    ts: ts * 1000,
    dur: duration * 1000,
    pid,
    tid,
    ph: 'X',
    cat: 'disabled-by-default-devtools.timeline',
    args: {},
  };
}

/**
 * @param {ChildTaskDef} options
 */
function getChildTask({ts, duration, url}) {
  return {
    name: 'FunctionCall',
    ts: ts * 1000,
    dur: duration * 1000,
    pid,
    tid,
    ph: 'X',
    cat: 'devtools.timeline',
    args: {
      data: {
        url,
        functionName: 'fakeFunction',
      },
    },
  };
}

/**
 * Creates a simple trace that fits the desired options. Useful for basic trace
 * generation, e.g a trace that will result in particular long-task quiet
 * periods. Input times should be in milliseconds.
 * @param {TraceOptions} options
 */
function createTestTrace(options) {
  const frameUrl = options.frameUrl ?? defaultUrl;
  const timeOrigin = (options.timeOrigin || 0) * 1000;

  const traceEvents = [{
    name: 'TracingStartedInBrowser',
    ts: timeOrigin,
    pid: browserPid,
    tid,
    ph: 'I',
    cat: 'disabled-by-default-devtools.timeline',
    args: {
      data: {
        frameTreeNodeId: 6,
        persistentIds: true,
        frames: [{frame: rootFrame, url: 'about:blank', name: '', processId: pid}],
      },
    },
    s: 't',
  }, {
    name: 'navigationStart',
    ts: timeOrigin,
    pid,
    tid,
    ph: 'R',
    cat: 'blink.user_timing',
    args: {
      frame: rootFrame,
      data: {
        documentLoaderURL: frameUrl,
        isLoadingMainFrame: true,
      },
    },
  }, {
    // Needed to identify main thread for TracingStartedInBrowser.
    name: 'thread_name',
    ts: timeOrigin,
    pid,
    tid,
    ph: 'M',
    cat: '__metadata',
    args: {name: 'CrRendererMain'},
  }, {
    // Used for identifying frame tree.
    name: 'FrameCommittedInBrowser',
    ts: timeOrigin,
    pid: browserPid,
    tid,
    ph: 'I',
    cat: 'disabled-by-default-devtools.timeline',
    args: {
      data: {frame: rootFrame, url: frameUrl, name: '', processId: pid},
    },
  }, {
    name: 'domContentLoadedEventEnd',
    ts: timeOrigin + 10,
    pid,
    tid,
    ph: 'R',
    cat: 'blink.user_timing,rail',
    args: {frame: rootFrame},
  }, {
    name: 'firstContentfulPaint',
    ts: timeOrigin + 10,
    pid,
    tid,
    ph: 'R',
    cat: 'loading,rail,devtools.timeline',
    args: {frame: rootFrame},
  }, {
    name: 'firstMeaningfulPaint',
    ts: timeOrigin + 15,
    pid,
    tid,
    ph: 'R',
    cat: 'loading,rail,devtools.timeline',
    args: {frame: rootFrame},
  }];

  if (options.childFrames) {
    for (const childFrame of options.childFrames) {
      traceEvents.push({
        name: 'FrameCommittedInBrowser',
        ts: timeOrigin + 20,
        pid: browserPid,
        tid,
        ph: 'I',
        cat: 'disabled-by-default-devtools.timeline',
        args: {
          data: {
            frame: childFrame.frame,
            parent: rootFrame,
            url: `${frameUrl}${childFrame.frame}`,
            name: '',
            processId: pid,
          },
        },
      });
    }
  }

  if (options.largestContentfulPaint) {
    traceEvents.push({
      name: 'largestContentfulPaint::Candidate',
      ts: options.largestContentfulPaint * 1000,
      pid,
      tid,
      ph: 'R',
      cat: 'loading,rail,devtools.timeline',
      args: {frame: rootFrame, isMainFrame: true, data: {size: 50}},
    });
  }

  if (options.topLevelTasks) {
    for (const task of options.topLevelTasks) {
      traceEvents.push(getTopLevelTask(task));
      if (task.children?.length) {
        for (const child of task.children) {
          traceEvents.push(getChildTask(child));
        }
      }
    }
  }

  if (options.traceEnd) {
    // Insert a top level short task to extend trace to requested end.
    traceEvents.push(getTopLevelTask({ts: options.traceEnd - 1, duration: 1}));
  }

  return {traceEvents};
}

export default createTestTrace;
