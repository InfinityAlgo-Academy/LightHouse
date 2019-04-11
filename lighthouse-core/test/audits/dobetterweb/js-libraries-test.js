/**
 * @license Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const JsLibrariesAudit = require('../../../audits/dobetterweb/js-libraries.js');
const assert = require('assert');

/* eslint-env jest */
describe('Returns detected front-end JavaScript libraries', () => {
  it('always passes', () => {
    // no libraries
    const auditResult1 = JsLibrariesAudit.audit({
      Stacks: [],
    });
    assert.equal(auditResult1.rawValue, true);

    // duplicates. TODO: consider failing in this case
    const auditResult2 = JsLibrariesAudit.audit({
      Stacks: [
        {detector: 'js', name: 'lib1', version: '3.10.1', npm: 'lib1'},
        {detector: 'js', name: 'lib2', version: null, npm: 'lib2'},
      ],
    });
    assert.equal(auditResult2.rawValue, true);

    // LOTS of frontend libs
    const auditResult3 = JsLibrariesAudit.audit({
      Stacks: [
        {detector: 'js', name: 'React', version: null, npm: 'react'},
        {detector: 'js', name: 'Polymer', version: null, npm: 'polymer-core'},
        {detector: 'js', name: 'Preact', version: null, npm: 'preact'},
        {detector: 'js', name: 'Angular', version: null, npm: 'angular'},
        {detector: 'js', name: 'jQuery', version: null, npm: 'jquery'},
      ],
    });
    assert.equal(auditResult3.rawValue, true);
  });

  it('generates expected details', () => {
    const auditResult = JsLibrariesAudit.audit({
      Stacks: [
        {detector: 'js', name: 'lib1', version: '3.10.1', npm: 'lib1'},
        {detector: 'js', name: 'lib2', version: null, npm: 'lib2'},
      ],
    });
    const expected = [
      {
        name: 'lib1',
        npm: 'lib1',
        version: '3.10.1',
      },
      {
        name: 'lib2',
        npm: 'lib2',
        version: undefined,
      },
    ];
    assert.equal(auditResult.rawValue, true);
    assert.deepStrictEqual(auditResult.details.items, expected);
  });
});
