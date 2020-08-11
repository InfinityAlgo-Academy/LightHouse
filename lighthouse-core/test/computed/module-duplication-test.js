/**
 * @license Copyright 2020 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* eslint-env jest */

const fs = require('fs');
const ModuleDuplication = require('../../computed/module-duplication.js');

function load(name) {
  const mapJson = fs.readFileSync(`${__dirname}/../fixtures/source-maps/${name}.js.map`, 'utf-8');
  const content = fs.readFileSync(`${__dirname}/../fixtures/source-maps/${name}.js`, 'utf-8');
  return {map: JSON.parse(mapJson), content};
}

describe('ModuleDuplication computed artifact', () => {
  it('works (simple)', async () => {
    const context = {computedCache: new Map()};
    const {map, content} = load('foo.min');
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
    expect(results).toMatchInlineSnapshot(`
      Map {
        "node_modules/browser-pack/_prelude.js" => Array [
          Object {
            "resourceSize": 480,
            "scriptUrl": "https://example.com/foo1.min.js",
          },
          Object {
            "resourceSize": 480,
            "scriptUrl": "https://example.com/foo2.min.js",
          },
        ],
        "src/bar.js" => Array [
          Object {
            "resourceSize": 104,
            "scriptUrl": "https://example.com/foo1.min.js",
          },
          Object {
            "resourceSize": 104,
            "scriptUrl": "https://example.com/foo2.min.js",
          },
        ],
        "src/foo.js" => Array [
          Object {
            "resourceSize": 98,
            "scriptUrl": "https://example.com/foo1.min.js",
          },
          Object {
            "resourceSize": 98,
            "scriptUrl": "https://example.com/foo2.min.js",
          },
        ],
      }
    `);
  });

  it('works (complex)', async () => {
    const context = {computedCache: new Map()};
    const bundleData1 = load('coursehero-bundle-1');
    const bundleData2 = load('coursehero-bundle-2');
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
        "node_modules/@babel/runtime/helpers/classCallCheck.js" => Array [
          Object {
            "resourceSize": 358,
            "scriptUrl": "https://example.com/coursehero-bundle-1.js",
          },
          Object {
            "resourceSize": 236,
            "scriptUrl": "https://example.com/coursehero-bundle-2.js",
          },
        ],
        "node_modules/@babel/runtime/helpers/createClass.js" => Array [
          Object {
            "resourceSize": 799,
            "scriptUrl": "https://example.com/coursehero-bundle-1.js",
          },
          Object {
            "resourceSize": 496,
            "scriptUrl": "https://example.com/coursehero-bundle-2.js",
          },
        ],
        "node_modules/@babel/runtime/helpers/assertThisInitialized.js" => Array [
          Object {
            "resourceSize": 296,
            "scriptUrl": "https://example.com/coursehero-bundle-2.js",
          },
          Object {
            "resourceSize": 294,
            "scriptUrl": "https://example.com/coursehero-bundle-1.js",
          },
        ],
        "node_modules/@babel/runtime/helpers/applyDecoratedDescriptor.js" => Array [
          Object {
            "resourceSize": 892,
            "scriptUrl": "https://example.com/coursehero-bundle-1.js",
          },
          Object {
            "resourceSize": 446,
            "scriptUrl": "https://example.com/coursehero-bundle-2.js",
          },
        ],
        "node_modules/@babel/runtime/helpers/possibleConstructorReturn.js" => Array [
          Object {
            "resourceSize": 230,
            "scriptUrl": "https://example.com/coursehero-bundle-2.js",
          },
          Object {
            "resourceSize": 228,
            "scriptUrl": "https://example.com/coursehero-bundle-1.js",
          },
        ],
        "node_modules/@babel/runtime/helpers/getPrototypeOf.js" => Array [
          Object {
            "resourceSize": 361,
            "scriptUrl": "https://example.com/coursehero-bundle-2.js",
          },
          Object {
            "resourceSize": 338,
            "scriptUrl": "https://example.com/coursehero-bundle-1.js",
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
        "node_modules/@babel/runtime/helpers/defineProperty.js" => Array [
          Object {
            "resourceSize": 290,
            "scriptUrl": "https://example.com/coursehero-bundle-2.js",
          },
          Object {
            "resourceSize": 288,
            "scriptUrl": "https://example.com/coursehero-bundle-1.js",
          },
        ],
        "node_modules/@babel/runtime/helpers/extends.js" => Array [
          Object {
            "resourceSize": 490,
            "scriptUrl": "https://example.com/coursehero-bundle-1.js",
          },
          Object {
            "resourceSize": 245,
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
        "node_modules/@babel/runtime/helpers/setPrototypeOf.js" => Array [
          Object {
            "resourceSize": 290,
            "scriptUrl": "https://example.com/coursehero-bundle-2.js",
          },
          Object {
            "resourceSize": 260,
            "scriptUrl": "https://example.com/coursehero-bundle-1.js",
          },
        ],
        "js/src/common/base-component.ts" => Array [
          Object {
            "resourceSize": 459,
            "scriptUrl": "https://example.com/coursehero-bundle-1.js",
          },
          Object {
            "resourceSize": 216,
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
        "js/src/aged-beef.ts" => Array [
          Object {
            "resourceSize": 213,
            "scriptUrl": "https://example.com/coursehero-bundle-1.js",
          },
          Object {
            "resourceSize": 194,
            "scriptUrl": "https://example.com/coursehero-bundle-2.js",
          },
        ],
        "js/src/utils/service/api-service.ts" => Array [
          Object {
            "resourceSize": 116,
            "scriptUrl": "https://example.com/coursehero-bundle-1.js",
          },
          Object {
            "resourceSize": 54,
            "scriptUrl": "https://example.com/coursehero-bundle-2.js",
          },
        ],
        "js/src/common/decorators/throttle.ts" => Array [
          Object {
            "resourceSize": 251,
            "scriptUrl": "https://example.com/coursehero-bundle-1.js",
          },
          Object {
            "resourceSize": 244,
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
        "js/src/utils/service/global-service.ts" => Array [
          Object {
            "resourceSize": 336,
            "scriptUrl": "https://example.com/coursehero-bundle-1.js",
          },
          Object {
            "resourceSize": 167,
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
        "js/src/common/input/keycode.ts" => Array [
          Object {
            "resourceSize": 237,
            "scriptUrl": "https://example.com/coursehero-bundle-1.js",
          },
          Object {
            "resourceSize": 223,
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
        "node_modules/lodash-es/_freeGlobal.js" => Array [
          Object {
            "resourceSize": 118,
            "scriptUrl": "https://example.com/coursehero-bundle-2.js",
          },
          Object {
            "resourceSize": 93,
            "scriptUrl": "https://example.com/coursehero-bundle-1.js",
          },
        ],
        "node_modules/lodash-es/_root.js" => Array [
          Object {
            "resourceSize": 93,
            "scriptUrl": "https://example.com/coursehero-bundle-1.js",
          },
          Object {
            "resourceSize": 93,
            "scriptUrl": "https://example.com/coursehero-bundle-2.js",
          },
        ],
        "node_modules/lodash-es/_Symbol.js" => Array [
          Object {
            "resourceSize": 10,
            "scriptUrl": "https://example.com/coursehero-bundle-1.js",
          },
          Object {
            "resourceSize": 10,
            "scriptUrl": "https://example.com/coursehero-bundle-2.js",
          },
        ],
        "node_modules/lodash-es/_arrayMap.js" => Array [
          Object {
            "resourceSize": 99,
            "scriptUrl": "https://example.com/coursehero-bundle-1.js",
          },
          Object {
            "resourceSize": 99,
            "scriptUrl": "https://example.com/coursehero-bundle-2.js",
          },
        ],
        "node_modules/lodash-es/isArray.js" => Array [
          Object {
            "resourceSize": 16,
            "scriptUrl": "https://example.com/coursehero-bundle-1.js",
          },
          Object {
            "resourceSize": 16,
            "scriptUrl": "https://example.com/coursehero-bundle-2.js",
          },
        ],
        "node_modules/lodash-es/_getRawTag.js" => Array [
          Object {
            "resourceSize": 206,
            "scriptUrl": "https://example.com/coursehero-bundle-1.js",
          },
          Object {
            "resourceSize": 206,
            "scriptUrl": "https://example.com/coursehero-bundle-2.js",
          },
        ],
        "node_modules/lodash-es/_objectToString.js" => Array [
          Object {
            "resourceSize": 64,
            "scriptUrl": "https://example.com/coursehero-bundle-1.js",
          },
          Object {
            "resourceSize": 64,
            "scriptUrl": "https://example.com/coursehero-bundle-2.js",
          },
        ],
        "node_modules/lodash-es/_baseGetTag.js" => Array [
          Object {
            "resourceSize": 143,
            "scriptUrl": "https://example.com/coursehero-bundle-1.js",
          },
          Object {
            "resourceSize": 143,
            "scriptUrl": "https://example.com/coursehero-bundle-2.js",
          },
        ],
        "node_modules/lodash-es/isObjectLike.js" => Array [
          Object {
            "resourceSize": 54,
            "scriptUrl": "https://example.com/coursehero-bundle-1.js",
          },
          Object {
            "resourceSize": 54,
            "scriptUrl": "https://example.com/coursehero-bundle-2.js",
          },
        ],
        "node_modules/lodash-es/isSymbol.js" => Array [
          Object {
            "resourceSize": 79,
            "scriptUrl": "https://example.com/coursehero-bundle-1.js",
          },
          Object {
            "resourceSize": 79,
            "scriptUrl": "https://example.com/coursehero-bundle-2.js",
          },
        ],
        "node_modules/lodash-es/_baseToString.js" => Array [
          Object {
            "resourceSize": 198,
            "scriptUrl": "https://example.com/coursehero-bundle-1.js",
          },
          Object {
            "resourceSize": 198,
            "scriptUrl": "https://example.com/coursehero-bundle-2.js",
          },
        ],
        "node_modules/lodash-es/isObject.js" => Array [
          Object {
            "resourceSize": 80,
            "scriptUrl": "https://example.com/coursehero-bundle-2.js",
          },
          Object {
            "resourceSize": 79,
            "scriptUrl": "https://example.com/coursehero-bundle-1.js",
          },
        ],
        "node_modules/lodash-es/toNumber.js" => Array [
          Object {
            "resourceSize": 370,
            "scriptUrl": "https://example.com/coursehero-bundle-2.js",
          },
          Object {
            "resourceSize": 354,
            "scriptUrl": "https://example.com/coursehero-bundle-1.js",
          },
        ],
        "node_modules/lodash-es/toFinite.js" => Array [
          Object {
            "resourceSize": 118,
            "scriptUrl": "https://example.com/coursehero-bundle-2.js",
          },
          Object {
            "resourceSize": 117,
            "scriptUrl": "https://example.com/coursehero-bundle-1.js",
          },
        ],
        "node_modules/lodash-es/toInteger.js" => Array [
          Object {
            "resourceSize": 60,
            "scriptUrl": "https://example.com/coursehero-bundle-1.js",
          },
          Object {
            "resourceSize": 60,
            "scriptUrl": "https://example.com/coursehero-bundle-2.js",
          },
        ],
        "node_modules/lodash-es/toString.js" => Array [
          Object {
            "resourceSize": 43,
            "scriptUrl": "https://example.com/coursehero-bundle-1.js",
          },
          Object {
            "resourceSize": 43,
            "scriptUrl": "https://example.com/coursehero-bundle-2.js",
          },
        ],
      }
    `);
  });

  it('_normalizeSource', () => {
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
      expect(ModuleDuplication._normalizeSource(input)).toBe(expected);
    }
  });
});
