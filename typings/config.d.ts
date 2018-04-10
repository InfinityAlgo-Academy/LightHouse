/**
 * @license Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

import * as Gatherer from '../lighthouse-core/gather/gatherers/gatherer.js';

declare global {
  module LH {
    /**
     * The full, normalized Lighthouse Config.
     */
    export interface Config {
      settings: Config.Settings;
      passes: Config.Pass[];
    }

    module Config {
      /**
       * The pre-normalization Lighthouse Config format.
       */
      export interface Json {
        settings?: SettingsJson;
        passes?: PassJson[];
      }
  
      export interface SettingsJson extends SharedFlagsSettings {
        extraHeaders?: Crdp.Network.Headers;
      }
  
      export interface PassJson {
        passName: string;
        recordTrace?: boolean;
        useThrottling?: boolean;
        pauseAfterLoadMs?: number;
        networkQuietThresholdMs?: number;
        cpuQuietThresholdMs?: number;
        blockedUrlPatterns?: string[];
        blankPage?: string;
        blankDuration?: number;
        gatherers: GathererJson[];
      }
  
      export type GathererJson = {
        path: string;
        options?: {};
      } | {
        implementation: typeof Gatherer;
        options?: {};
      } | {
        instance: InstanceType<typeof Gatherer>;
        options?: {};
      } | string;
  
      // TODO(bckenny): we likely don't want to require all these
      export type Settings = Required<SettingsJson>;
  
      export interface Pass extends Required<PassJson> {
        gatherers: GathererDefn[];
      }
  
      export interface GathererDefn {
        implementation: typeof Gatherer;
        instance: InstanceType<typeof Gatherer>;
        options: {};
      }
    }
  }
}

// empty export to keep file a module
export {}
