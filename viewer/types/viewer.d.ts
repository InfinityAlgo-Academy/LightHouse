/**
 * @license Copyright 2018 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

import _ReportGenerator = require('../../report/generator/report-generator.js');
import {Logger as _Logger} from '../../report/renderer/logger.js';
import {LighthouseReportViewer as _LighthouseReportViewer} from '../app/src/lighthouse-report-viewer.js';
import 'google.analytics';

// Import for needed DOM type augmentation.
import '../../report/types/augment-dom';

// Import for LH globals needed for report files.
import '../../report/types/html-renderer';

import '../../flow-report/types/flow-report';

declare global {
  var ReportGenerator: typeof _ReportGenerator;
  var logger: _Logger;
  var idbKeyval: typeof import('idb-keyval');

  interface Window {
    viewer: _LighthouseReportViewer;
    ga: UniversalAnalytics.ga;

    // Inserted by viewer build.
    LH_CURRENT_VERSION: string;
  }
}
