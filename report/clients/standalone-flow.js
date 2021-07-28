/**
 * @license Copyright 2021 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/**
  * @fileoverview The entry point for rendering the Lighthouse report for the HTML
  * file created by ReportGenerator.
  * The renderer code is bundled and injected into the report HTML along with the JSON report.
  */

import {render} from 'preact';
import {html} from 'htm/preact';

/* global window document */

// Used by standalone-flow.html
function __initLighthouseFlowReport__() {
  const App = props => html`
    <pre>${JSON.stringify(props.lhrs, null, 2)}</pre>
  `;

  render(html`<${App} lhrs=${window.__LIGHTHOUSE_JSON__} />`, document.body.querySelector('main'));
}

window.__initLighthouseFlowReport__ = __initLighthouseFlowReport__;
