/**
 * @license Copyright 2022 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

import {ModernFakeTimers} from '@jest/fake-timers';

/**
 * @param {string} id
 */
function timerIdToRef(id) {
  return {
    id,
    ref() {
      return this;
    },
    unref() {
      return this;
    },
  };
}

/**
 * @param {{id: string}} timer
 */
const timerRefToId = timer => (timer && timer.id) || undefined;

const timers = new ModernFakeTimers({
  global,
  config: {
    // @ts-expect-error
    idToRef: timerIdToRef,
    refToId: timerRefToId,
  },
});

export {timers};
