/**
 * @license Copyright 2019 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

 // Keep interfaces sorted.

export namespace _TraceEvent {
  export type TraceEvent =
    EvaluateScript |
    FunctionCall |
    InvalidateLayout |
    NavigationStart |
    ParseAuthorStyleSheet |
    ResourceSendRequest |
    ScheduleStyleRecalculation |
    Screenshot |
    TimerFire |
    TimerInstall |
    TracingStartedInBrowser |
    TracingStartedInPage |
    V8.Compile |
    V8.CompileModule |
    XHRReadyStateChange |
    Other;

  /**
   * @see https://docs.google.com/document/d/1CvAClvFfyA5R-PhYUmn5OOQtYMH4h6I0nSsKchNAySU/preview
   */
  export interface TraceEventImpl {
    cat: string;
    pid: number;
    tid: number;
    ts: number;
    dur: number;
    ph: 'B'|'b'|'D'|'E'|'e'|'F'|'I'|'M'|'N'|'n'|'O'|'R'|'S'|'T'|'X';
    s?: 't';
    id?: string;
  }

  interface EvaluateScript extends TraceEventImpl {
    name: 'EvaluateScript';
    args: {
      data?: {
        url: string;
        stackTrace?: {
          url: string
        }[];
      };
    };
  }

  interface FunctionCall extends TraceEventImpl {
    name: 'FunctionCall';
    args: {
      data: {
        url: string;
      };
    };
  }

  interface InvalidateLayout extends TraceEventImpl {
    name: 'InvalidateLayout';
    args: {
      data: {
        stackTrace: {
          url: string
        }[];
      };
    };
  }

  interface NavigationStart extends TraceEventImpl {
    name: 'navigationStart';
    args: {
      data: {
        documentLoaderURL: string;
      };
    };
  }

  interface ParseAuthorStyleSheet extends TraceEventImpl {
    name: 'ParseAuthorStyleSheet';
    args: {
      data: {
        styleSheetUrl: string;
      };
    };
  }

  interface ResourceSendRequest extends TraceEventImpl {
    name: 'ResourceSendRequest';
    args: {
      data: {
        requestId: string;
        stackTrace?: {
          url: string
        }[];
      };
    }
  }

  interface ScheduleStyleRecalculation extends TraceEventImpl {
    name: 'ScheduleStyleRecalculation';
    args: {
      data: {
        stackTrace: {
          url: string
        }[];
      };
    }
  }

  interface Screenshot extends TraceEventImpl {
    name: 'Screenshot';
    args: {
      snapshot: string;
      data: never;
    };
  }

  interface TimerFire extends TraceEventImpl {
    name: 'TimerFire';
    args: {
      data: {
        timerId: string;
      };
    };
  }

  interface TimerInstall extends TraceEventImpl {
    name: 'TimerInstall';
    args: {
      data: {
        timerId: string;
        stackTrace: {
          url: string;
        }[];
      };
    };
  }

  interface TracingStartedInBrowser extends TraceEventImpl {
    name: 'TracingStartedInBrowser';
    args: {
      data: {
        frames: {
          frame: string;
          parent?: string;
          processId?: number;
        }[];
      };
    };
  }
  interface TracingStartedInPage extends TraceEventImpl {
    name: 'TracingStartedInPage';
    args: {
      data: {
        page: string;
      };
    }
  }

  module V8 {
    interface Compile extends TraceEventImpl {
      name: 'v8.compile';
      args: {
        data?: {
          url: string;
          stackTrace: {
            url: string;
          }[];
        };
      }
    }

    interface CompileModule extends TraceEventImpl {
      name: 'v8.compileModule';
      args: {
        fileName: string;
        data?: {
          stackTrace: {
            url: string;
          }[];
        };
      }
    }
  }

  interface XHRReadyStateChange extends TraceEventImpl {
    name: 'XHRReadyStateChange';
    args: {
      data: {
        readyState: number;
        url: string;
        stackTrace: {
          url: string;
        }[];
      };
    };
  }

  // Catch-all for everything else. If anything in "args" is used, extract to an interface.
  interface Other extends TraceEventImpl {
    name:
      'domContentLoadedEventEnd' |
      'firstContentfulPaint' |
      'firstMeaningfulPaint' |
      'firstMeaningfulPaintCandidate' |
      'firstPaint' |
      'Layout' |
      'loadEventEnd' |
      'paintNonDefaultBackgroundColor' |
      'process_labels' |
      'requestStart' |
      'ResourceFinish' |
      'ResourceReceiveResponse' |
      'RunTask' |
      'Task' |
      'TaskQueueManager::ProcessTaskFromWorkQueue' |
      'thread_name' |
      'ThreadControllerImpl::DoWork' |
      'ThreadControllerImpl::RunTask' |
      never;
    args: {
      data?: {};
      frame?: string;
      name?: string;
      labels?: string;
    };
  }
}

export default _TraceEvent;
