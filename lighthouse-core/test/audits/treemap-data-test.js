/**
 * @license Copyright 2020 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const TreemapData_ = require('../../audits/treemap-data.js');
const networkRecordsToDevtoolsLog = require('../network-records-to-devtools-log.js');
const {loadSourceMapAndUsageFixture, makeParamsOptional} = require('../test-utils.js');

/* eslint-env jest */

const TreemapData = {
  audit: makeParamsOptional(TreemapData_.audit),
  prepareTreemapNodes: makeParamsOptional(TreemapData_.prepareTreemapNodes),
};

/**
 * @param {string} url
 * @param {number} resourceSize
 * @param {LH.Crdp.Network.ResourceType} resourceType
 */
function generateRecord(url, resourceSize, resourceType) {
  return {url, resourceSize, resourceType};
}

describe('TreemapData audit', () => {
  describe('squoosh fixture', () => {
    /** @type {import('../../audits/treemap-data.js').TreemapData} */
    let treemapData;
    beforeAll(async () => {
      const context = {computedCache: new Map()};
      const {map, content, usage} = loadSourceMapAndUsageFixture('squoosh');
      const mainUrl = 'https://squoosh.app';
      const scriptUrl = 'https://squoosh.app/main-app.js';
      const networkRecords = [generateRecord(scriptUrl, content.length, 'Script')];

      // Add a script with no source map or usage.
      const noSourceMapScript = {src: 'https://sqoosh.app/no-map-or-usage.js', content: '// hi'};
      networkRecords.push(
        generateRecord(noSourceMapScript.src, noSourceMapScript.content.length, 'Script')
      );

      const artifacts = {
        URL: {requestedUrl: mainUrl, finalUrl: mainUrl},
        JsUsage: {[usage.url]: [usage]},
        devtoolsLogs: {defaultPass: networkRecordsToDevtoolsLog(networkRecords)},
        SourceMaps: [{scriptUrl: scriptUrl, map}],
        ScriptElements: [{src: scriptUrl, content}, noSourceMapScript],
      };
      const results = await TreemapData.audit(artifacts, context);

      // @ts-expect-error: Debug data.
      treemapData = results.details.treemapData;
    });

    it('basics', () => {
      expect(Object.keys(treemapData)).toEqual(['scripts', 'resources']);
    });

    it('scripts', () => {
      expect(treemapData.scripts.find(s => s.name === 'https://sqoosh.app/no-map-or-usage.js'))
        .toMatchInlineSnapshot(`
        Object {
          "name": "https://sqoosh.app/no-map-or-usage.js",
          "node": Object {
            "name": "https://sqoosh.app/no-map-or-usage.js",
            "resourceBytes": 37,
          },
        }
      `);

      expect(treemapData.scripts).toMatchSnapshot();
    });

    it('resources', () => {
      const scriptsNode = (treemapData.resources[0].node.children || [])[0];
      expect(scriptsNode.children || []).toHaveLength(2);

      expect(treemapData.resources).toMatchInlineSnapshot(`
        Array [
          Object {
            "name": "Resource Summary",
            "node": Object {
              "children": Array [
                Object {
                  "children": Array [
                    Object {
                      "name": "https://squoosh.app/main-app.js",
                      "resourceBytes": 83748,
                    },
                    Object {
                      "name": "https://sqoosh.app/no-map-or-usage.js",
                      "resourceBytes": 5,
                    },
                  ],
                  "name": "script",
                  "resourceBytes": 83753,
                },
              ],
              "name": "2 requests",
              "resourceBytes": 83753,
            },
          },
        ]
      `);
    });
  });

  describe('.prepareTreemapNodes', () => {
    it('uses node data when available', () => {
      const rootNode = TreemapData.prepareTreemapNodes('', {
        'a.js': {resourceBytes: 100},
        'b.js': {resourceBytes: 100, duplicate: 'blah'},
        'c.js': {resourceBytes: 100, unusedBytes: 50},
      });
      expect(rootNode).toMatchInlineSnapshot(`
        Object {
          "children": Array [
            Object {
              "name": "a.js",
              "resourceBytes": 100,
            },
            Object {
              "duplicate": "blah",
              "name": "b.js",
              "resourceBytes": 100,
            },
            Object {
              "name": "c.js",
              "resourceBytes": 100,
              "unusedBytes": 50,
            },
          ],
          "name": "",
          "resourceBytes": 300,
          "unusedBytes": 50,
        }
      `);
    });

    it('creates directory node when multiple leaf nodes', () => {
      const rootNode = TreemapData.prepareTreemapNodes('', {
        'folder/a.js': {resourceBytes: 100},
        'folder/b.js': {resourceBytes: 100},
      });
      expect(rootNode).toMatchInlineSnapshot(`
        Object {
          "children": Array [
            Object {
              "name": "a.js",
              "resourceBytes": 100,
            },
            Object {
              "name": "b.js",
              "resourceBytes": 100,
            },
          ],
          "name": "/folder",
          "resourceBytes": 200,
        }
      `);
    });

    it('flattens directory node when single leaf nodes', () => {
      const rootNode = TreemapData.prepareTreemapNodes('', {
        'root/folder1/a.js': {resourceBytes: 100},
        'root/folder2/b.js': {resourceBytes: 100},
      });
      expect(rootNode).toMatchInlineSnapshot(`
        Object {
          "children": Array [
            Object {
              "children": undefined,
              "name": "folder1/a.js",
              "resourceBytes": 100,
            },
            Object {
              "children": undefined,
              "name": "folder2/b.js",
              "resourceBytes": 100,
            },
          ],
          "name": "/root",
          "resourceBytes": 200,
        }
      `);
    });

    it('source root replaces matching prefixes', () => {
      const sourcesData = {
        'some/prefix/main.js': {resourceBytes: 100, unusedBytes: 50},
        'not/some/prefix/a.js': {resourceBytes: 101, unusedBytes: 51},
      };
      const rootNode = TreemapData.prepareTreemapNodes('some/prefix', sourcesData);
      expect(rootNode).toMatchInlineSnapshot(`
        Object {
          "children": Array [
            Object {
              "children": undefined,
              "name": "/main.js",
              "resourceBytes": 100,
              "unusedBytes": 50,
            },
            Object {
              "children": undefined,
              "name": "not/a.js",
              "resourceBytes": 101,
              "unusedBytes": 51,
            },
          ],
          "name": "some/prefix",
          "resourceBytes": 201,
          "unusedBytes": 101,
        }
      `);

      expect(rootNode.name).toBe('some/prefix');
      expect(rootNode.resourceBytes).toBe(201);
      expect(rootNode.unusedBytes).toBe(101);

      const children = rootNode.children || [];
      expect(children[0].name).toBe('/main.js');
      expect(children[1].name).toBe('not/a.js');
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
