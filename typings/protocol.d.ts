/**
 * @license Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

declare global {
  module LH.Protocol {
    /**
     * Union of raw (over the wire) message format of all possible Crdp events,
     * of the form `{method: 'Domain.event', params: eventPayload}`.
     * TODO(bckenny): currently any `void` payloads are defined as having value
     * `undefined`, even though CrdpEventEmitter will treat those payloads as
     * not existing. This is due to how we have to expose these emitters to JS.
     * See https://github.com/bterlson/strict-event-emitter-types/issues/1 for
     * search for the fix here. Complication should be entirely isolated to
     * connection.js.
     */
    export type RawEventMessage = RawEventMessageRecord[keyof RawEventMessageRecord];

    /**
     * Raw (over the wire) message format of all possible Crdp command responses.
     */
    export type RawCommandMessage = {
      id: number;
      result: CrdpCommands[keyof CrdpCommands]['returnType'];
      error: {
        code: number,
        message: string
      };
    }

    /**
     * Raw (over the wire) message format of all possible Crdp events and command
     * responses.
     */
    export type RawMessage = RawCommandMessage | RawEventMessage;

    /**
     * Strict overloaded typing for calling protocol methods with and without
     * params object.
     */
    export type SendCommand = {
      <C extends VoidParamsKeys>(method: C, params?: void, cmdOpts?: {silent?: boolean}): Promise<CrdpCommands[C]['returnType']>;
      <C extends NonVoidParamsKeys>(method: C, params: CrdpCommands[C]['paramsType']): Promise<CrdpCommands[C]['returnType']>
    }
  }
}

/**
 * An intermediate type, used to create a record of all possible Crdp raw event
 * messages, keyed on method. e.g. {
 *   'Domain.method1Name': {method: 'Domain.method1Name', params: EventPayload1},
 *   'Domain.method2Name': {method: 'Domain.method2Name', params: EventPayload2},
 * }
 */
type RawEventMessageRecord = {
  [K in keyof LH.CrdpEvents]: {
    method: K,
    // Drop void for `undefined` (so a JS value is valid). See above TODO
    params: LH.CrdpEvents[K] extends void ? undefined: LH.CrdpEvents[K]
  };
}

/**
 * An intermediate type that's the union of all command names where a `params`
 * object is not required (represented by `void` when no params object or a
 * union with `void` if all properties on params object are optional).
 */
type VoidParamsKeys = {
  [P in keyof LH.CrdpCommands]: void extends LH.CrdpCommands[P]['paramsType'] ? P : never;
}[keyof LH.CrdpCommands];

/**
 * An intermediate type that's the union of all command names that require a
 * `params` object (no void in union). Note that `VoidParamsKeys` and
 * `NonVoidParamsKeys` are not disjoint.
 */
type NonVoidParamsKeys = {
  [P in keyof LH.CrdpCommands]: LH.CrdpCommands[P]['paramsType'] extends void ? never : P;
}[keyof LH.CrdpCommands];

// empty export to keep file a module
export {}
