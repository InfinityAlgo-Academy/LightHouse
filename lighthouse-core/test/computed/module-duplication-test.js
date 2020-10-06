/**
 * @license Copyright 2020 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* eslint-env jest */

const ModuleDuplication = require('../../computed/module-duplication.js');
const {loadSourceMapFixture} = require('../test-utils.js');

describe('ModuleDuplication computed artifact', () => {
  it('works (simple)', async () => {
    const context = {computedCache: new Map()};
    const {map, content} = loadSourceMapFixture('foo.min');
    const artifacts = {
      SourceMaps: [
        {scriptUrl: 'https://example.com/foo1.min.js', map},
        {scriptUrl: 'https://example.com/foo2.min.js', map},
      ],
      ScriptElements: [
        {src: 'https://example.com/foo1.min.js', content},
        {src: 'https://example.com/foo2.min.js', content},
      ],
    };
    const results = await ModuleDuplication.request(artifacts, context);
    expect(results).toMatchInlineSnapshot(`Map {}`);
  });

  it('works (complex)', async () => {
    const context = {computedCache: new Map()};
    const bundleData1 = loadSourceMapFixture('coursehero-bundle-1');
    const bundleData2 = loadSourceMapFixture('coursehero-bundle-2');
    const artifacts = {
      SourceMaps: [
        {scriptUrl: 'https://example.com/coursehero-bundle-1.js', map: bundleData1.map},
        {scriptUrl: 'https://example.com/coursehero-bundle-2.js', map: bundleData2.map},
      ],
      ScriptElements: [
        {src: 'https://example.com/coursehero-bundle-1.js', content: bundleData1.content},
        {src: 'https://example.com/coursehero-bundle-2.js', content: bundleData2.content},
      ],
    };
    const results = await ModuleDuplication.request(artifacts, context);
    expect(results).toMatchInlineSnapshot(`
      Map {
        "Control/assets/js/vendor/ng/select/select.js" => Array [
          Object {
            "resourceSize": 48513,
            "scriptUrl": "https://example.com/coursehero-bundle-1.js",
          },
          Object {
            "resourceSize": 48513,
            "scriptUrl": "https://example.com/coursehero-bundle-2.js",
          },
        ],
        "Control/assets/js/vendor/ng/select/angular-sanitize.js" => Array [
          Object {
            "resourceSize": 9135,
            "scriptUrl": "https://example.com/coursehero-bundle-1.js",
          },
          Object {
            "resourceSize": 9135,
            "scriptUrl": "https://example.com/coursehero-bundle-2.js",
          },
        ],
        "node_modules/@babel/runtime/helpers/inherits.js" => Array [
          Object {
            "resourceSize": 528,
            "scriptUrl": "https://example.com/coursehero-bundle-1.js",
          },
          Object {
            "resourceSize": 528,
            "scriptUrl": "https://example.com/coursehero-bundle-2.js",
          },
        ],
        "node_modules/@babel/runtime/helpers/typeof.js" => Array [
          Object {
            "resourceSize": 992,
            "scriptUrl": "https://example.com/coursehero-bundle-1.js",
          },
          Object {
            "resourceSize": 992,
            "scriptUrl": "https://example.com/coursehero-bundle-2.js",
          },
        ],
        "js/src/utils/service/amplitude-service.ts" => Array [
          Object {
            "resourceSize": 1348,
            "scriptUrl": "https://example.com/coursehero-bundle-1.js",
          },
          Object {
            "resourceSize": 1325,
            "scriptUrl": "https://example.com/coursehero-bundle-2.js",
          },
        ],
        "js/src/utils/service/gsa-inmeta-tags.ts" => Array [
          Object {
            "resourceSize": 591,
            "scriptUrl": "https://example.com/coursehero-bundle-1.js",
          },
          Object {
            "resourceSize": 563,
            "scriptUrl": "https://example.com/coursehero-bundle-2.js",
          },
        ],
        "js/src/search/results/store/filter-actions.ts" => Array [
          Object {
            "resourceSize": 956,
            "scriptUrl": "https://example.com/coursehero-bundle-2.js",
          },
          Object {
            "resourceSize": 946,
            "scriptUrl": "https://example.com/coursehero-bundle-1.js",
          },
        ],
        "js/src/search/results/store/item/resource-types.ts" => Array [
          Object {
            "resourceSize": 783,
            "scriptUrl": "https://example.com/coursehero-bundle-1.js",
          },
          Object {
            "resourceSize": 775,
            "scriptUrl": "https://example.com/coursehero-bundle-2.js",
          },
        ],
        "js/src/search/results/store/filter-store.ts" => Array [
          Object {
            "resourceSize": 12717,
            "scriptUrl": "https://example.com/coursehero-bundle-1.js",
          },
          Object {
            "resourceSize": 12650,
            "scriptUrl": "https://example.com/coursehero-bundle-2.js",
          },
        ],
        "js/src/search/results/view/filter/autocomplete-list.tsx" => Array [
          Object {
            "resourceSize": 1143,
            "scriptUrl": "https://example.com/coursehero-bundle-2.js",
          },
          Object {
            "resourceSize": 1134,
            "scriptUrl": "https://example.com/coursehero-bundle-1.js",
          },
        ],
        "js/src/search/results/view/filter/autocomplete-filter.tsx" => Array [
          Object {
            "resourceSize": 3823,
            "scriptUrl": "https://example.com/coursehero-bundle-1.js",
          },
          Object {
            "resourceSize": 3812,
            "scriptUrl": "https://example.com/coursehero-bundle-2.js",
          },
        ],
        "js/src/search/results/view/filter/autocomplete-filter-with-icon.tsx" => Array [
          Object {
            "resourceSize": 2696,
            "scriptUrl": "https://example.com/coursehero-bundle-1.js",
          },
          Object {
            "resourceSize": 2693,
            "scriptUrl": "https://example.com/coursehero-bundle-2.js",
          },
        ],
        "js/src/search/results/service/api/filter-api-service.ts" => Array [
          Object {
            "resourceSize": 554,
            "scriptUrl": "https://example.com/coursehero-bundle-1.js",
          },
          Object {
            "resourceSize": 534,
            "scriptUrl": "https://example.com/coursehero-bundle-2.js",
          },
        ],
        "js/src/common/component/school-search.tsx" => Array [
          Object {
            "resourceSize": 5840,
            "scriptUrl": "https://example.com/coursehero-bundle-2.js",
          },
          Object {
            "resourceSize": 5316,
            "scriptUrl": "https://example.com/coursehero-bundle-1.js",
          },
        ],
        "js/src/common/component/search/abstract-taxonomy-search.tsx" => Array [
          Object {
            "resourceSize": 3103,
            "scriptUrl": "https://example.com/coursehero-bundle-1.js",
          },
          Object {
            "resourceSize": 3098,
            "scriptUrl": "https://example.com/coursehero-bundle-2.js",
          },
        ],
        "js/src/common/component/search/course-search.tsx" => Array [
          Object {
            "resourceSize": 545,
            "scriptUrl": "https://example.com/coursehero-bundle-2.js",
          },
          Object {
            "resourceSize": 544,
            "scriptUrl": "https://example.com/coursehero-bundle-1.js",
          },
        ],
      }
    `);
  });

  it('normalizeSource', () => {
    const testCases = [
      ['test.js', 'test.js'],
      ['node_modules/othermodule.js', 'node_modules/othermodule.js'],
      ['node_modules/somemodule/node_modules/othermodule.js', 'node_modules/othermodule.js'],
      [
        'node_modules/somemodule/node_modules/somemodule2/node_modules/othermodule.js',
        'node_modules/othermodule.js',
      ],
      ['webpack.js?', 'webpack.js'],
    ];
    for (const [input, expected] of testCases) {
      expect(ModuleDuplication.normalizeSource(input)).toBe(expected);
    }
  });

  describe('_normalizeAggregatedData', () => {
    it('removes entries with just one value', () => {
      const data = new Map([['a.js', [{resourceSize: 100}]]]);
      ModuleDuplication._normalizeAggregatedData(data);
      expect(data).toMatchInlineSnapshot(`Map {}`);
    });

    it('sorts entries based on resource size', () => {
      const data = new Map([
        ['a.js', [{resourceSize: 250}, {resourceSize: 200}]],
        ['b.js', [{resourceSize: 200}, {resourceSize: 250}]],
      ]);
      ModuleDuplication._normalizeAggregatedData(data);
      expect(data).toMatchInlineSnapshot(`Map {}`);
    });

    it('removes data if size is much smaller than the largest', () => {
      const data = new Map([
        ['a.js', [{resourceSize: 200}, {resourceSize: 1}, {resourceSize: 250}]],
        ['b.js', [{resourceSize: 250}, {resourceSize: 1}]],
      ]);
      ModuleDuplication._normalizeAggregatedData(data);
      expect(data).toMatchInlineSnapshot(`Map {}`);
    });
  });
});
