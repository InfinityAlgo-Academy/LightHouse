/**
 * @license Copyright 2019 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const {collateResults, report} = require('../lighthouse-cli/test/smokehouse/smokehouse-report');

/** @type {LH.Result & {errorCode?: string}} */
const actual = JSON.parse(process.argv[2]);

/** @type {LH.Result & {errorCode?: string}} */
const expected = JSON.parse(process.argv[3]);

// When an error occurs that prevents LH from completing, the 'actual' LHR will only have a
// a runtimeError property. The smoke tests define an 'errorCode' instead.

if (actual.runtimeError) {
  actual.errorCode = actual.runtimeError.code;
}

// Further, if these error codes are expected, the actual LHR should not have a finalUrl property.
// The smokehouse test harness fakes this property, but here we delete it from the expectations
// instead.

if (expected.errorCode && ['PAGE_HUNG', 'INSECURE_DOCUMENT_REQUEST'].includes(expected.errorCode)) {
  delete expected.finalUrl;
}

const results = collateResults(actual, expected);
const counts = report(results);
if (counts.failed) {
  process.exit(1);
}
