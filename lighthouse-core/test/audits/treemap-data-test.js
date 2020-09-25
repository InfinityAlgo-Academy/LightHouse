/**
 * @license Copyright 2020 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const TreemapData_ = require('../../audits/treemap-data.js');
const networkRecordsToDevtoolsLog = require('../network-records-to-devtools-log.js');
const {loadSourceMapFixture, makeParamsOptional} = require('../test-utils.js');

/* eslint-env jest */

const TreemapData = {
  audit: makeParamsOptional(TreemapData_.audit),
  prepareTreemapNodes: makeParamsOptional(TreemapData_.prepareTreemapNodes),
};

/**
 * @param {string} name
 */
function load(name) {
  const data = loadSourceMapFixture(name);
  if (!data.usage) throw new Error('expected usage');
  return {...data, usage: data.usage};
}

/**
 * @param {string} url
 * @param {number} transferSize
 * @param {LH.Crdp.Network.ResourceType} resourceType
 */
function generateRecord(url, transferSize, resourceType) {
  return {url, transferSize, resourceType};
}

describe('TreemapData audit', () => {
  describe('squoosh fixture', () => {
    /** @type {import('../../audits/treemap-data.js').TreemapData} */
    let treemapData;
    beforeAll(async () => {
      const context = {computedCache: new Map()};
      const {map, content, usage} = load('squoosh');
      const mainUrl = 'https://squoosh.app';
      const scriptUrl = 'https://squoosh.app/main-app.js';
      const networkRecords = [generateRecord(scriptUrl, content.length, 'Script')];

      const artifacts = {
        URL: {requestedUrl: mainUrl, finalUrl: mainUrl},
        JsUsage: {[usage.url]: [usage]},
        devtoolsLogs: {defaultPass: networkRecordsToDevtoolsLog(networkRecords)},
        SourceMaps: [{scriptUrl: scriptUrl, map}],
        ScriptElements: [{src: scriptUrl, content}],
      };
      const results = await TreemapData.audit(artifacts, context);

      // @ts-expect-error: Debug data.
      treemapData = results.details.treemapData;
    });

    it('basics', () => {
      expect(Object.keys(treemapData)).toEqual(['scripts', 'resources']);
    });

    it('js', () => {
      expect(treemapData.scripts).toMatchSnapshot();
    });

    it('resource summary', () => {
      expect(treemapData.resources).toMatchInlineSnapshot(`
        Array [
          Object {
            "name": "Resource Summary",
            "node": Object {
              "children": Array [
                Object {
                  "children": Array [
                    Object {
                      "name": "//main-app.js",
                      "resourceBytes": 0,
                    },
                  ],
                  "name": "script",
                  "resourceBytes": 0,
                },
              ],
              "name": "1 requests",
              "resourceBytes": 0,
            },
          },
        ]
      `);
    });
  });

  describe('.prepareTreemapNodes', () => {
    it('basics 1', () => {
      const rootNode = TreemapData.prepareTreemapNodes('', {'main.js': {resourceBytes: 100}});
      expect(rootNode).toMatchInlineSnapshot(`
        Object {
          "children": undefined,
          "name": "/main.js",
          "resourceBytes": 100,
        }
      `);
    });

    it('basics 2', () => {
      const sourcesData = {
        'some/prefix/main.js': {resourceBytes: 100},
        'a.js': {resourceBytes: 101},
      };
      const rootNode = TreemapData.prepareTreemapNodes('some/prefix', sourcesData);
      expect(rootNode).toMatchInlineSnapshot(`
        Object {
          "children": Array [
            Object {
              "children": undefined,
              "name": "/main.js",
              "resourceBytes": 100,
            },
            Object {
              "name": "a.js",
              "resourceBytes": 101,
            },
          ],
          "name": "some/prefix",
          "resourceBytes": 201,
        }
      `);
    });

    it('basics 3', () => {
      const sourcesData = {
        'lib/a.js': {resourceBytes: 100},
        'main.js': {resourceBytes: 101},
      };
      const rootNode = TreemapData.prepareTreemapNodes('', sourcesData);
      expect(rootNode).toMatchInlineSnapshot(`
        Object {
          "children": Array [
            Object {
              "children": undefined,
              "name": "lib/a.js",
              "resourceBytes": 100,
            },
            Object {
              "name": "main.js",
              "resourceBytes": 101,
            },
          ],
          "name": "",
          "resourceBytes": 201,
        }
      `);
    });

    it('basics 4', () => {
      const sourcesData = {
        'lib/folder/a.js': {resourceBytes: 100},
        'lib/folder/b.js': {resourceBytes: 101},
      };
      const rootNode = TreemapData.prepareTreemapNodes('', sourcesData);
      expect(rootNode).toMatchInlineSnapshot(`
        Object {
          "children": Array [
            Object {
              "name": "a.js",
              "resourceBytes": 100,
            },
            Object {
              "name": "b.js",
              "resourceBytes": 101,
            },
          ],
          "name": "/lib/folder",
          "resourceBytes": 201,
        }
      `);
    });

    it('unusedBytes', () => {
      const sourcesData = {
        'lib/folder/a.js': {resourceBytes: 100, unusedBytes: 50},
        'lib/folder/b.js': {resourceBytes: 101},
        'lib/c.js': {resourceBytes: 100, unusedBytes: 25},
      };
      const rootNode = TreemapData.prepareTreemapNodes('', sourcesData);
      expect(rootNode).toMatchInlineSnapshot(`
        Object {
          "children": Array [
            Object {
              "children": Array [
                Object {
                  "name": "a.js",
                  "resourceBytes": 100,
                  "unusedBytes": 50,
                },
                Object {
                  "name": "b.js",
                  "resourceBytes": 101,
                },
              ],
              "name": "folder",
              "resourceBytes": 201,
              "unusedBytes": 50,
            },
            Object {
              "name": "c.js",
              "resourceBytes": 100,
              "unusedBytes": 25,
            },
          ],
          "name": "/lib",
          "resourceBytes": 301,
          "unusedBytes": 75,
        }
      `);
    });

    it('duplicates', () => {
      const sourcesData = {
        'lib/folder/a.js': {resourceBytes: 100, unusedBytes: 50},
        'lib/node_modules/dep/a.js': {resourceBytes: 101, duplicate: 'dep/a.js'},
        'node_modules/dep/a.js': {resourceBytes: 100, unusedBytes: 25, duplicate: 'dep/a.js'},
        'lib/node_modules/dep/b.js': {resourceBytes: 101, duplicate: 'dep/b.js'},
        'node_modules/dep/b.js': {resourceBytes: 100, unusedBytes: 25, duplicate: 'dep/b.js'},
      };
      const rootNode = TreemapData.prepareTreemapNodes('', sourcesData);
      expect(rootNode).toMatchInlineSnapshot(`
        Object {
          "children": Array [
            Object {
              "children": Array [
                Object {
                  "children": undefined,
                  "name": "folder/a.js",
                  "resourceBytes": 100,
                  "unusedBytes": 50,
                },
                Object {
                  "children": Array [
                    Object {
                      "duplicate": "dep/a.js",
                      "name": "a.js",
                      "resourceBytes": 101,
                    },
                    Object {
                      "duplicate": "dep/b.js",
                      "name": "b.js",
                      "resourceBytes": 101,
                    },
                  ],
                  "name": "node_modules/dep",
                  "resourceBytes": 202,
                },
              ],
              "name": "lib",
              "resourceBytes": 302,
              "unusedBytes": 50,
            },
            Object {
              "children": Array [
                Object {
                  "duplicate": "dep/a.js",
                  "name": "a.js",
                  "resourceBytes": 100,
                  "unusedBytes": 25,
                },
                Object {
                  "duplicate": "dep/b.js",
                  "name": "b.js",
                  "resourceBytes": 100,
                  "unusedBytes": 25,
                },
              ],
              "name": "node_modules/dep",
              "resourceBytes": 200,
              "unusedBytes": 50,
            },
          ],
          "name": "",
          "resourceBytes": 502,
          "unusedBytes": 100,
        }
      `);
    });
  });
});
