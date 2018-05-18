/**
 * @license Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

declare global {
  module LH.WebInspector {
    // TODO(bckenny): standardize on underscored internal API
    // externs for chrome-devtools-frontend/front_end/sdk/NetworkRequest.js
    export interface NetworkRequest {
      requestId: string;
      _requestId: string;
      connectionId: string;
      connectionReused: boolean;

      url: string;
      _url: string;
      protocol: string;
      parsedURL: ParsedURL;
      // Use parsedURL.securityOrigin() instead
      origin: never;

      startTime: number;
      endTime: number;
      _responseReceivedTime: number;

      transferSize: number;
      /** Should use a default of 0 if not defined */
      _transferSize?: number;
      /** Should use a default of 0 if not defined */
      _resourceSize?: number;
      _fromDiskCache?: boolean;

      finished: boolean;
      requestMethod: string;
      statusCode: number;
      redirectSource?: {
        url: string;
      }
      failed?: boolean;
      localizedFailDescription?: string;

      _initiator: Crdp.Network.Initiator;
      _timing: Crdp.Network.ResourceTiming;
      _resourceType: ResourceType;
      _mimeType: string;
      priority(): 'VeryHigh' | 'High' | 'Medium' | 'Low';
      _responseHeaders?: {name: string, value: string}[];

      _fetchedViaServiceWorker?: boolean;
      _frameId: Crdp.Page.FrameId;
      _isLinkPreload?: boolean;
      initiatorRequest(): NetworkRequest | null;
      redirects?: NetworkRequest[];
    }

    export interface ParsedURL {
      scheme: string;
      host: string;
      securityOrigin(): string;
    }

    export interface ResourceType {
      _category: ResourceCategory;
      name(): string;
      _name: string;
      title(): string;
      isTextType(): boolean;
    }

    export interface ResourceCategory {
      title: string;
    }
  }
}

// empty export to keep file a module
export {}
