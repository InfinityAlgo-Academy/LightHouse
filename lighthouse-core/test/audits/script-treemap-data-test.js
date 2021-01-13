/**
 * @license Copyright 2020 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* eslint-env jest */

const ScriptTreemapData_ = require('../../audits/script-treemap-data.js');
const networkRecordsToDevtoolsLog = require('../network-records-to-devtools-log.js');
const {loadSourceMapAndUsageFixture, loadSourceMapFixture, makeParamsOptional} =
  require('../test-utils.js');

const ScriptTreemapData = {
  audit: makeParamsOptional(ScriptTreemapData_.audit),
  prepareTreemapNodes: makeParamsOptional(ScriptTreemapData_.prepareTreemapNodes),
};

/**
 * @param {string} url
 * @param {number} resourceSize
 * @param {LH.Crdp.Network.ResourceType} resourceType
 */
function generateRecord(url, resourceSize, resourceType) {
  return {url, resourceSize, resourceType};
}

describe('ScriptTreemapData audit', () => {
  describe('squoosh fixture', () => {
    /** @type {import('../../audits/script-treemap-data.js').TreemapData} */
    let treemapData;
    beforeAll(async () => {
      const context = {computedCache: new Map()};
      const {map, content, usage} = loadSourceMapAndUsageFixture('squoosh');
      expect(map.sourceRoot).not.toBeTruthy();
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
      const results = await ScriptTreemapData.audit(artifacts, context);

      // @ts-expect-error: Debug data.
      treemapData = results.details.treemapData;
    });

    it('has root nodes', () => {
      expect(treemapData.find(s => s.name === 'https://sqoosh.app/no-map-or-usage.js'))
        .toMatchInlineSnapshot(`
        Object {
          "name": "https://sqoosh.app/no-map-or-usage.js",
          "node": Object {
            "name": "https://sqoosh.app/no-map-or-usage.js",
            "resourceBytes": 37,
          },
        }
      `);

      expect(JSON.stringify(treemapData).length).toMatchInlineSnapshot(`6621`);
      expect(treemapData).toMatchSnapshot();
    });
  });

  describe('coursehero fixture', () => {
    /** @type {import('../../audits/script-treemap-data.js').TreemapData} */
    let treemapData;
    beforeAll(async () => {
      const context = {computedCache: new Map()};
      const {map, content} = loadSourceMapFixture('coursehero-bundle-1');
      expect(map.sourceRoot).toBeTruthy();
      const mainUrl = 'https://courshero.com';
      const scriptUrl1 = 'https://courshero.com/script1.js';
      const scriptUrl2 = 'https://courshero.com/script2.js';
      const networkRecords = [
        generateRecord(scriptUrl1, content.length, 'Script'),
        generateRecord(scriptUrl2, content.length, 'Script'),
      ];

      const artifacts = {
        URL: {requestedUrl: mainUrl, finalUrl: mainUrl},
        // Audit should still work even without usage data.
        JsUsage: {},
        devtoolsLogs: {defaultPass: networkRecordsToDevtoolsLog(networkRecords)},
        SourceMaps: [{scriptUrl: scriptUrl1, map}, {scriptUrl: scriptUrl2, map}],
        ScriptElements: [{src: scriptUrl1, content}, {src: scriptUrl2, content}],
      };
      const results = await ScriptTreemapData.audit(artifacts, context);

      // @ts-expect-error: Debug data.
      treemapData = results.details.treemapData;
    });

    it('has root nodes', () => {
      expect(JSON.stringify(treemapData).length).toMatchInlineSnapshot(`86635`);
      expect(treemapData).toMatchSnapshot();
    });

    it('finds duplicates', () => {
      expect(JSON.stringify(treemapData).length).toMatchInlineSnapshot(`86635`);
      // @ts-ignore all these children exist.
      const leafNode = treemapData[0].node.
        children[0].
        children[0].
        children[0].
        children[0].duplicatedNormalizedModuleName;
      expect(leafNode).toBe('Control/assets/js/vendor/jquery.typeahead.js');
    });
  });

  describe('.prepareTreemapNodes', () => {
    it('uses node data when available', () => {
      const rootNode = ScriptTreemapData.prepareTreemapNodes('', {
        'a.js': {resourceBytes: 100},
        'b.js': {resourceBytes: 100, duplicatedNormalizedModuleName: 'blah'},
        'c.js': {resourceBytes: 100, unusedBytes: 50},
      });
      expect(rootNode).toMatchObject(
         {
           children: [
             {
               name: 'a.js',
               resourceBytes: 100,
             },
             {
               duplicatedNormalizedModuleName: 'blah',
               name: 'b.js',
               resourceBytes: 100,
             },
             {
               name: 'c.js',
               resourceBytes: 100,
               unusedBytes: 50,
             },
           ],
           name: '',
           resourceBytes: 300,
           unusedBytes: 50,
         }
      );
    });

    it('creates directory node when multiple leaf nodes', () => {
      const rootNode = ScriptTreemapData.prepareTreemapNodes('', {
        'folder/a.js': {resourceBytes: 100},
        'folder/b.js': {resourceBytes: 100},
      });
      expect(rootNode).toMatchObject(
       {
         children: [
           {
             name: 'a.js',
             resourceBytes: 100,
           },
           {
             name: 'b.js',
             resourceBytes: 100,
           },
         ],
         name: '/folder',
         resourceBytes: 200,
       }
      );
    });

    it('flattens directory node when single leaf nodes', () => {
      const rootNode = ScriptTreemapData.prepareTreemapNodes('', {
        'root/folder1/a.js': {resourceBytes: 100},
        'root/folder2/b.js': {resourceBytes: 100},
      });
      expect(rootNode).toMatchObject(
         {
           children: [
             {
               children: undefined,
               name: 'folder1/a.js',
               resourceBytes: 100,
             },
             {
               children: undefined,
               name: 'folder2/b.js',
               resourceBytes: 100,
             },
           ],
           name: '/root',
           resourceBytes: 200,
         }
      );
    });

    it('source root replaces matching prefixes', () => {
      const sourcesData = {
        'some/prefix/main.js': {resourceBytes: 100, unusedBytes: 50},
        'not/some/prefix/a.js': {resourceBytes: 101, unusedBytes: 51},
      };
      const rootNode = ScriptTreemapData.prepareTreemapNodes('some/prefix', sourcesData);
      expect(rootNode).toMatchObject(
         {
           children: [
             {
               children: undefined,
               name: '/main.js',
               resourceBytes: 100,
               unusedBytes: 50,
             },
             {
               children: undefined,
               name: 'not/a.js',
               resourceBytes: 101,
               unusedBytes: 51,
             },
           ],
           name: 'some/prefix',
           resourceBytes: 201,
           unusedBytes: 101,
         }
      );

      expect(rootNode.name).toBe('some/prefix');
      expect(rootNode.resourceBytes).toBe(201);
      expect(rootNode.unusedBytes).toBe(101);

      const children = rootNode.children || [];
      expect(children[0].name).toBe('/main.js');
      expect(children[1].name).toBe('not/a.js');
    });

    it('nodes have unusedBytes data', () => {
      const sourcesData = {
        'lib/folder/a.js': {resourceBytes: 100, unusedBytes: 50},
        'lib/folder/b.js': {resourceBytes: 101},
        'lib/c.js': {resourceBytes: 100, unusedBytes: 25},
      };
      const rootNode = ScriptTreemapData.prepareTreemapNodes('', sourcesData);
      expect(rootNode).toMatchObject(
         {
           children: [
             {
               children: [
                 {
                   name: 'a.js',
                   resourceBytes: 100,
                   unusedBytes: 50,
                 },
                 {
                   name: 'b.js',
                   resourceBytes: 101,
                 },
               ],
               name: 'folder',
               resourceBytes: 201,
               unusedBytes: 50,
             },
             {
               name: 'c.js',
               resourceBytes: 100,
               unusedBytes: 25,
             },
           ],
           name: '/lib',
           resourceBytes: 301,
           unusedBytes: 75,
         }
      );
    });

    it('nodes have duplicates data', () => {
      const sourcesData = {
        /* eslint-disable max-len */
        'lib/folder/a.js': {resourceBytes: 100, unusedBytes: 50},
        'lib/node_modules/dep/a.js': {resourceBytes: 101, duplicatedNormalizedModuleName: 'dep/a.js'},
        'node_modules/dep/a.js': {resourceBytes: 100, unusedBytes: 25, duplicatedNormalizedModuleName: 'dep/a.js'},
        'lib/node_modules/dep/b.js': {resourceBytes: 101, duplicatedNormalizedModuleName: 'dep/b.js'},
        'node_modules/dep/b.js': {resourceBytes: 100, unusedBytes: 25, duplicatedNormalizedModuleName: 'dep/b.js'},
        /* eslint-enable max-len */
      };
      const rootNode = ScriptTreemapData.prepareTreemapNodes('', sourcesData);
      expect(rootNode).toMatchObject(
         {
           children: [
             {
               children: [
                 {
                   children: undefined,
                   name: 'folder/a.js',
                   resourceBytes: 100,
                   unusedBytes: 50,
                 },
                 {
                   children: [
                     {
                       duplicatedNormalizedModuleName: 'dep/a.js',
                       name: 'a.js',
                       resourceBytes: 101,
                     },
                     {
                       duplicatedNormalizedModuleName: 'dep/b.js',
                       name: 'b.js',
                       resourceBytes: 101,
                     },
                   ],
                   name: 'node_modules/dep',
                   resourceBytes: 202,
                 },
               ],
               name: 'lib',
               resourceBytes: 302,
               unusedBytes: 50,
             },
             {
               children: [
                 {
                   duplicatedNormalizedModuleName: 'dep/a.js',
                   name: 'a.js',
                   resourceBytes: 100,
                   unusedBytes: 25,
                 },
                 {
                   duplicatedNormalizedModuleName: 'dep/b.js',
                   name: 'b.js',
                   resourceBytes: 100,
                   unusedBytes: 25,
                 },
               ],
               name: 'node_modules/dep',
               resourceBytes: 200,
               unusedBytes: 50,
             },
           ],
           name: '',
           resourceBytes: 502,
           unusedBytes: 100,
         }
      );
    });
  });
});
