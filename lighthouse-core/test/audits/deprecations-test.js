/**
 * @license Copyright 2017 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */


import {strict as assert} from 'assert';

import DeprecationsAudit from '../../audits/deprecations.js';

/* eslint-env jest */

describe('Deprecations audit', () => {
  it('passes when no deprecations were found', async () => {
    const context = {computedCache: new Map()};
    const auditResult = await DeprecationsAudit.audit({
      InspectorIssues: {deprecationIssue: []},
      SourceMaps: [],
      Scripts: [],
    }, context);
    assert.equal(auditResult.score, 1);
    assert.equal(auditResult.details.items.length, 0);
  });

  it('fails when deprecation messages are found', async () => {
    const URL = 'http://example.com';

    const context = {computedCache: new Map()};
    const auditResult = await DeprecationsAudit.audit({
      InspectorIssues: {
        deprecationIssue: [
          {
            message: 'Deprecation message 123',
            sourceCodeLocation: {
              url: URL,
              lineNumber: 123,
              columnNumber: 100,
            },
          },
          {
            message: 'Deprecation message 456',
            sourceCodeLocation: {
              url: 'http://example2.com',
              lineNumber: 456,
              columnNumber: 100,
            },
          },
        ],
      },
      SourceMaps: [],
      Scripts: [],
    }, context);

    assert.equal(auditResult.score, 0);
    expect(auditResult.displayValue).toBeDisplayString('2 warnings found');
    assert.equal(auditResult.details.items.length, 2);
    assert.equal(auditResult.details.items[0].value, 'Deprecation message 123');
    assert.equal(auditResult.details.items[0].source.url, URL);
    assert.equal(auditResult.details.items[0].source.line, 123);
    assert.equal(auditResult.details.items[0].source.column, 99);
  });
});
