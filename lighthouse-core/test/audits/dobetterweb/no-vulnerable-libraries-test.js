/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const NoVulnerableLibrariesAudit =
  require('../../../audits/dobetterweb/no-vulnerable-libraries.js');
const assert = require('assert');

/* eslint-env mocha */
describe('Avoids front-end JavaScript libraries with known vulnerabilities', () => {
  it('fails when JS libraries with known vulnerabilities are detected', () => {
    const auditResult = NoVulnerableLibrariesAudit.audit({
      JSLibraries: [
        {name: 'lib1', version: '1.0.0', npmPkgName: 'lib1'},
        {name: 'angular', version: '1.1.4', npmPkgName: 'angular'},
        {name: 'lib3', version: null, npmPkgName: 'lib3'},
      ],
    });
    assert.equal(auditResult.rawValue, false);
    assert.equal(auditResult.details.items.length, 1);
    assert.equal(auditResult.extendedInfo.jsLibs.length, 3);
    assert.equal(auditResult.details.items[0][2].text, 'High');
    assert.equal(auditResult.details.items[0][0].text, 'angular@1.1.4');
    assert.equal(auditResult.details.items[0][0].url, 'https://snyk.io/vuln/npm:angular#lh@1.1.4');
  });

  it('passes when no JS libraries with known vulnerabilities are detected', () => {
    const auditResult = NoVulnerableLibrariesAudit.audit({
      JSLibraries: [
        {name: 'lib1', version: '3.10.1', npmPkgName: 'lib1'},
        {name: 'lib2', version: null, npmPkgName: 'lib2'},
      ],
    });
    assert.equal(auditResult.rawValue, true);
    assert.equal(auditResult.details.items.length, 0);
    assert.equal(auditResult.extendedInfo.jsLibs.length, 2);
  });

  it('passes when no JS libraries are detected', () => {
    const auditResult = NoVulnerableLibrariesAudit.audit({
      JSLibraries: [],
    });
    assert.equal(auditResult.rawValue, true);
  });
});
