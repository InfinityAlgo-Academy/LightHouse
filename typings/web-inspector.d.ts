/**
 * @license Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

declare global {
  module LH.WebInspector {
    // externs for chrome-devtools-frontend/front_end/sdk/NetworkRequest.js
    export interface NetworkRequest {
      requestId: string;
      connectionId: string;
      connectionReused: boolean;

      url: string;
      _url: string;
      protocol: string;
      origin: string | null;
      parsedURL: ParsedURL;

      startTime: number;
      endTime: number;

      transferSize: number;

      finished: boolean;
      statusCode: number;
      redirectSource?: {
        url: string;
      }
      failed?: boolean;
      localizedFailDescription?: string;

      _initiator: NetworkRequestInitiator;
      _timing: NetworkRequestTiming;
      // TODO(bckenny): type from ResourceType.js
      _resourceType: any;
      priority(): 'VeryHigh' | 'High' | 'Medium' | 'Low';

      _fetchedViaServiceWorker?: boolean;
    }

    export interface ParsedURL {
      scheme: string;
      host: string;
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
  }
}

// empty export to keep file a module
export {}
