/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/** @typedef {LH.Artifacts['EventListeners'][0]} ListenerArtifact */
/** @typedef {ListenerArtifact & {pre: string}} ListenerArtifactExt */
/** @typedef {{line: number, col: number, url: string, type: string, pre: string}} SlimListener */

/**
 * Adds line/col information to an event listener object along with a formatted
 * code snippet of violation.
 *
 * @param {ListenerArtifact} listener A modified EventListener object as returned
 *     by the driver in the all events gatherer.
 * @return {ListenerArtifactExt} A copy of the original listener object with the added
 *     properties.
 */
function addFormattedCodeSnippet(listener) {
  const handler = listener.handler ? listener.handler.description : '...';
  const objectName = listener.objectName.toLowerCase().replace('#document', 'document');
  return Object.assign({
    pre: `${objectName}.addEventListener('${listener.type}', ${handler})`,
  }, listener);
}

/**
 * Groups event listeners under url/line/col "violation buckets".
 *
 * The listener gatherer returns a list of (url/line/col) src locations where
 * event handlers were attached to DOM nodes. This location is where
 * addEventListener was invoked, but it's not guaranteed to be where
 * the user's event handler was defined. An example is libraries, where the
 * user provides a callback and the library calls addEventListener (another
 * part of the codebase). Instead we map url/line/col/type to array of event
 * handlers so the user doesn't see a redundant list of url/line/col from the
 * same location.
 *
 * @param {Array<ListenerArtifactExt>} listeners Results from the event listener gatherer.
 * @return {Array<SlimListener>} A list of slimmed down listener objects.
 */
function groupCodeSnippetsByLocation(listeners) {
  /** @type {Map<string, SlimListener>} */
  const locToListenerMap = new Map();

  // Listeners share all returned properties but pre. Dedupe them and accumulate pre.
  listeners.forEach(loc => {
    const accPre = loc.pre.trim() + '\n\n';
    const simplifiedLoc = {line: loc.line, col: loc.col, url: loc.url, type: loc.type, pre: ''};

    const key = JSON.stringify(simplifiedLoc);
    const accListener = locToListenerMap.get(key) || simplifiedLoc;
    accListener.pre += accPre;
    locToListenerMap.set(key, accListener);
  });

  return [...locToListenerMap.values()];
}

module.exports = {
  addFormattedCodeSnippet,
  groupCodeSnippetsByLocation,
};
