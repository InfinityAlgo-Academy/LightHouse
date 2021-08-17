/**
 * @license Copyright 2018 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

import _ReportGenerator = require('../../report/report-generator.js');
import {DOM as _DOM} from '../../report/renderer/dom.js';
import {ReportRenderer as _ReportRenderer} from '../../report/renderer/report-renderer.js';
import {ReportUIFeatures as _ReportUIFeatures} from '../../report/renderer/report-ui-features.js';
import {Logger as _Logger} from '../../report/renderer/logger.js';
import {TextEncoding as _TextEncoding} from '../../report/renderer/text-encoding.js';
import {getFilenamePrefix as _getFilenamePrefix} from '../../report/renderer/file-namer.js';
import {LighthouseReportViewer as _LighthouseReportViewer} from '../app/src/lighthouse-report-viewer.js';
import 'google.analytics';
import {FirebaseNamespace} from '@firebase/app-types';
import '@firebase/auth-types';


declare global {
  var ReportGenerator: typeof _ReportGenerator;
  var logger: _Logger;
  var idbKeyval: typeof import('idb-keyval');
  var firebase: Required<FirebaseNamespace>;

  interface Window {
    viewer: _LighthouseReportViewer;
    ga: UniversalAnalytics.ga;

    // Inserted by viewer build.
    LH_CURRENT_VERSION: string;
  }
}

// empty export to keep file a module
export {}
