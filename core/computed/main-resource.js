/**
 * @license Copyright 2017 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

import {makeComputedArtifact} from './computed-artifact.js';
import {NetworkRecords} from './network-records.js';
import UrlUtils from '../lib/url-utils.js';

/**
 * @fileoverview This artifact identifies the main resource on the page. Current solution assumes
 * that the main resource is the first non-redirected one.
 */
class MainResource {
  /**
   * @param {{URL: LH.Artifacts['URL'], devtoolsLog: LH.DevtoolsLog}} data
   * @param {LH.Artifacts.ComputedContext} context
   * @return {Promise<LH.Artifacts.NetworkRequest>}
   */
  static async compute_(data, context) {
    const {mainDocumentUrl} = data.URL;
    if (!mainDocumentUrl) throw new Error('mainDocumentUrl must exist to get the main resource');
    const requests = await NetworkRecords.request(data.devtoolsLog, context);

    const mainResourceRequests = requests.filter(request =>
      request.resourceType === 'Document' &&
      UrlUtils.equalWithExcludedFragments(request.url, mainDocumentUrl)
    );
    // We could have more than one record matching the main doucment url,
    // if the page did `location.reload()`. Since `mainDocumentUrl` refers to the _last_
    // document request, we should return the last candidate here. Besides, the browser
    // would have evicted the first request by the time `MainDocumentRequest` (a consumer
    // of this computed artifact) attempts to fetch the contents, resulting in a protocol error.
    const mainResource = mainResourceRequests[mainResourceRequests.length - 1];
    if (!mainResource) {
      throw new Error('Unable to identify the main resource');
    }

    return mainResource;
  }
}

const MainResourceComputed = makeComputedArtifact(MainResource, ['URL', 'devtoolsLog']);
export {MainResourceComputed as MainResource};
