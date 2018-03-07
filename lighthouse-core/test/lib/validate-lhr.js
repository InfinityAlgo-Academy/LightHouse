/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const tsJson = require('typescript-json-typesafe');

/* eslint-disable no-console */

class LHRValidator {
  static validate(result) {
    const artifacts = result.artifacts;
    delete result.artifacts;
    LHRValidator.checkAuditDetailsTypes(result);
    LHRValidator.checkOverAllTypes(result);
    result.artifacts = artifacts;
  }

  static checkOverAllTypes(result) {
    console.log('testing overall object against', 'LH.Results');
    tsJson.isTypeSafe(result, 'LH.Results');
  }

  static checkAuditDetailsTypes(result) {
    const typesAndAudits = {
      'LH.ByteEfficiencyAuditDetails': [
        'unminified-css',
        'unminified-javascript',
        'uses-webp-images',
        'uses-optimized-images',
        'uses-request-compression',
        'uses-responsive-images',
      ],
      'LH.TotalMsAuditDetails': [
        'time-to-first-byte',
        'redirects',
        'link-blocking-first-paint',
        'script-blocking-first-paint',
      ],
      'LH.CachingAuditDetails': [
        'uses-long-cache-ttl',
      ],
    };

    for (const typeName of Object.keys(typesAndAudits)) {
      const audits = typesAndAudits[typeName];
      audits.forEach(auditname => {
        console.log('testing details of ', auditname);
        tsJson.isTypeSafe(result.audits[auditname].details, typeName);
      });
    }
  }
}


function runFromCLI() {
  [
    // 'tinyhouse',
    'cnn',
  ].forEach(slug => {
    const results = require(__dirname + `/../../../${slug}.json`);
    console.log('\n\nstarting...', results.initialUrl);

    try {
      LHRValidator.validate(results);
      console.log('PASS', new Date());
    } catch (e) {
      reportError(e);
      console.log('FAIL', new Date());
    }
  });
}


function reportError(e) {
  // slightly more attractive rendering of the TS diagnostics errors
  const prefix = e.message.split(':').slice(0, 2).join(':');
  const rest = e.message.split(':').slice(2).join(':');
  console.log(prefix);
  console.log(rest.split('\n').join('\n\n'));
}

if (require.main === module) {
  runFromCLI();
} else {
  module.exports = LHRValidator.validate;
}
