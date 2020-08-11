/**
 * @license Copyright 2020 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const ObscuredLCPAudit =
  require('../../../audits/dobetterweb/obscured-largest-contentful-paint.js');
const ObscuredLargestContentfulPaint = require('../../../audits/dobetterweb/obscured-largest-contentful-paint.js');

/* eslint-env jest */

describe('Obscured LCP element audit', () => {
  it('correctly displays overlapping elements', () => {
    const artifacts = {
      ElementsObscuringLCPElement: [{
        devtoolsNodePath: '1,HTML,1,BODY,0,DIV,1,IMG',
        selector: 'body > div > img',
        nodeLabel: 'img',
        snippet: '<img src="my-image.png">',
        boundingRect: {
          top: 0,
          bottom: 100,
          left: 0,
          right: 100,
          width: 100,
          height: 100,
        },
      }],
    };

    const results = ObscuredLCPAudit.audit(artifacts);
    expect(results.score).toBe(0);
    expect(results.details.items).toHaveLength(1);
    expect(results.details.items[0]).toMatchObject({
      node: {
        type: 'node',
        path: '1,HTML,1,BODY,0,DIV,1,IMG',
        selector: 'body > div > img',
        nodeLabel: 'img',
        snippet: '<img src="my-image.png">',
      },
    });
  });

  it('passes when there are no obscuring elements', () => {
    const artifacts = {
      ElementsObscuringLCPElement: [],
    };
    const results = ObscuredLCPAudit.audit(artifacts);
    expect(results.score).toBe(1);
  });
});
