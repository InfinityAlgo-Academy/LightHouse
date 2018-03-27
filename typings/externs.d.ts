/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

import _Crdp from '../node_modules/vscode-chrome-debug-core/lib/crdp/crdp';

declare global {
  module LH {
    export import Crdp = _Crdp;

    interface SharedFlagsSettings {
      maxWaitForLoad?: number;
      blockedUrlPatterns?: string[];
      additionalTraceCategories?: string[];
      auditMode?: boolean | string;
      gatherMode?: boolean | string;
      disableStorageReset?: boolean;
      disableDeviceEmulation?: boolean;
      disableCpuThrottling?: boolean;
      disableNetworkThrottling?: boolean;
      onlyAudits?: string[];
      onlyCategories?: string[];
      skipAudits?: string[];
    }

    export interface Flags extends SharedFlagsSettings {
      _: string[];
      port: number;
      chromeFlags: string;
      output: any;
      outputPath: string;
      saveAssets: boolean;
      view: boolean;
      logLevel: string;
      hostname: string;
      enableErrorReporting: boolean;
      listAllAudits: boolean;
      listTraceCategories: boolean;
      configPath?: string;
      perf: boolean;
      mixedContent: boolean;
      verbose: boolean;
      quiet: boolean;

      extraHeaders?: string;
    }

    // TODO: type checking for Config
    export interface Config {
      passes: ConfigPass[];
      settings: ConfigSettings;
    }

    export interface ConfigSettings extends SharedFlagsSettings {
      extraHeaders?: Crdp.Network.Headers;
    }

    export interface ConfigPass {
      pauseAfterLoadMs?: number;
      networkQuietThresholdMs?: number;
      cpuQuietThresholdMs?: number;
      useThrottling?: boolean;
    }

    export interface Results {
      url: string;
      audits: Audit.Results;
      lighthouseVersion: string;
      artifacts?: Object;
      initialUrl: string;
      fetchedAt: string;
    }

    export interface LaunchedChrome {
      pid: number;
      port: number;
      kill: () => Promise<{}>;
    }

    export interface LighthouseError extends Error {
      code?: string;
      friendlyMessage?: string;
    }

    export interface TraceEvent {
      name: string;
      args: any;
      tid: number;
      ts: number;
      dur: number;
    }

    export interface NetworkRequest {
      requestId: string;
      connectionId: string;
      connectionReused: boolean;

      url: string;
      protocol: string;
      origin: string | null;
      parsedURL: DevToolsParsedURL;

      startTime: number;
      endTime: number;

      transferSize: number;

      _initiator: NetworkRequestInitiator;
      _timing: NetworkRequestTiming;
      _resourceType: any;
      priority(): 'VeryHigh' | 'High' | 'Medium' | 'Low';
    }

    export interface NetworkRequestInitiator {
      type: 'script' | 'parser';
    }

    export interface NetworkRequestTiming {
      connectStart: number;
      connectEnd: number;
      sslStart: number;
      sslEnd: number;
      sendStart: number;
      sendEnd: number;
      receiveHeadersEnd: number;
    }

    export interface DevToolsParsedURL {
      scheme: string;
      host: string;
    }

    export interface DevToolsJsonTarget {
      description: string;
      devtoolsFrontendUrl: string;
      id: string;
      title: string;
      type: string;
      url: string;
      webSocketDebuggerUrl: string;
    }
  }
}
