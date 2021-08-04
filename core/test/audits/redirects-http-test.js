/**
 * @license Copyright 2016 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Audit = require('../../audits/redirects-http.js');
const assert = require('assert').strict;

/* eslint-env jest */

describe('Security: HTTP->HTTPS audit', () => {
  it('fails when no redirect detected', () => {
    return assert.equal(Audit.audit({
      HTTPRedirect: {
        value: false,
      },
      URL: {
        finalUrl: 'https://paulirish.com/',
      },
    }).score, 0);
  });

  it('passes when redirect detected', () => {
    return assert.equal(Audit.audit({
      HTTPRedirect: {
        value: true,
      },
      URL: {
        finalUrl: 'https://paulirish.com/',
      },
    }).score, 1);
  });

  it('not applicable on localhost when no redirect detected', () => {
    const product = Audit.audit({
      HTTPRedirect: {
        value: false,
      },
      URL: {
        finalUrl: 'http://localhost:8080/page.html',
      },
    });

    assert.equal(product.score, 1);
    assert.equal(product.notApplicable, true);
  });
});
