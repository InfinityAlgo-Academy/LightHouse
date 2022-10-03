/**
 * @license Copyright 2022 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

import NodeStackTracesAudit from '../../audits/node-stack-traces.js';

describe('Node Stack Traces', () => {
  it('handles missing artifact', async () => {
    const result = await NodeStackTracesAudit.audit({});
    expect(result.notApplicable).toBe(true);
  });

  it('handles empty artifact', async () => {
    const artifacts = {
      NodeStackTraces: {},
    };
    const result = await NodeStackTracesAudit.audit(artifacts);
    expect(result.details.stacks).toHaveLength(0);
  });

  it('compresses stack traces', async () => {
    const artifacts = {
      NodeStackTraces: {
        'node-id-1': {
          creation: {
            callFrames: [
              {
                functionName: 'fn2',
                url: 'http://www.example.com/script.js',
                lineNumber: 246,
                columnNumber: 35,
              },
              {
                functionName: 'fn1',
                url: 'http://www.example.com',
                lineNumber: 364,
                columnNumber: 2,
              },
              {
                functionName: '',
                url: 'http://www.example.com',
                lineNumber: 407,
                columnNumber: 2,
              },
            ],
          },
        },
        'node-id-2': {
          creation: {
            callFrames: [
              {
                functionName: 'fn3',
                url: 'http://www.example.com/script.js',
                lineNumber: 346,
                columnNumber: 35,
              },
              {
                functionName: 'fn1',
                url: 'http://www.example.com',
                lineNumber: 364,
                columnNumber: 2,
              },
              {
                functionName: '',
                url: 'http://www.example.com',
                lineNumber: 407,
                columnNumber: 2,
              },
            ],
          },
        },
      },
    };
    artifacts.NodeStackTraces['node-id-3'] = artifacts.NodeStackTraces['node-id-1'];

    const result = await NodeStackTracesAudit.audit(artifacts);
    expect(result.details.stacks).toEqual([[0, 1, 2], [3, 1, 2]]);
    expect(result.details.frames).toEqual([
      {column: 35, line: 246, url: 0},
      {column: 2, line: 364, url: 1},
      {column: 2, line: 407, url: 1},
      {column: 35, line: 346, url: 0},
    ]);
    expect(result.details.urls).toEqual([
      'http://www.example.com/script.js',
      'http://www.example.com',
    ]);
    expect(result.details.nodes).toEqual({
      'node-id-1': {creation: 0},
      'node-id-2': {creation: 1},
      'node-id-3': {creation: 0},
    });
  });
});
