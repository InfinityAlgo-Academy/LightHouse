/**
 * @license Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

declare global {
  module LH.WebInspector {
    // TODO(phulce): migrate to use network-request.js
    // externs for old chrome-devtools-frontend/front_end/sdk/NetworkRequest.js
    export interface NetworkRequest {
      requestId: string;
      _requestId: string;
      connectionId: string;
      connectionReused: boolean;

      url: string;
      _url: string;
      protocol: string;
      parsedURL: ParsedURL;
      isSecure: boolean;
      documentURL: string;

      startTime: number;
      endTime: number;
      _responseReceivedTime: number;

      transferSize: number;
      /** Should use a default of 0 if not defined */
      _resourceSize?: number;
      _fromDiskCache?: boolean;
      _fromMemoryCache?: boolean;

      finished: boolean;
      requestMethod: string;
      statusCode: number;
      redirectSource?: {url: string;};
      redirectDestination?: {url: string;};
      redirects?: NetworkRequest[];
      failed?: boolean;
      localizedFailDescription?: string;

      _initiator: Crdp.Network.Initiator;
      _timing?: Crdp.Network.ResourceTiming;
      _resourceType?: Crdp.Page.ResourceType;
      _mimeType: string;
      priority(): Crdp.Network.ResourcePriority;
      initiatorRequest(): NetworkRequest | undefined;
      _responseHeaders?: HeaderValue[];

      _fetchedViaServiceWorker?: boolean;
      _frameId?: Crdp.Page.FrameId;
      _isLinkPreload?: boolean;
    }

    export interface HeaderValue {
      name: string;
      value: string;
    }

    export interface ParsedURL {
      scheme: string;
      host: string;
      securityOrigin(): string;
    }
  }
}

// empty export to keep file a module
export {}
