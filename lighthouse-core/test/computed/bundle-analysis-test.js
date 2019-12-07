/**
 * @license Copyright 2019 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* eslint-env jest */
const fs = require('fs');
const BundleAnalysis = require('../../computed/bundle-analysis.js');
const networkRecordsToDevtoolsLog = require('../network-records-to-devtools-log.js');

function load(name) {
  const mapData = fs.readFileSync(`${__dirname}/../fixtures/source-maps/${name}.js.map`, 'utf-8');
  const content = fs.readFileSync(`${__dirname}/../fixtures/source-maps/${name}.js`, 'utf-8');
  return {map: JSON.parse(mapData), content};
}

describe('BundleAnalysis computed artifact', () => {
  it('collates script element, network record, and source map', async () => {
    const networkRecords = [{url: 'https://www.example.com/app.js'}];
    const artifacts = {
      SourceMaps: [{scriptUrl: 'https://www.example.com/app.js', map: {sources: ['index.js']}}],
      ScriptElements: [{src: 'https://www.example.com/app.js', content: ''}],
      devtoolsLogs: {defaultPass: networkRecordsToDevtoolsLog(networkRecords)},
    };
    const context = {computedCache: new Map()};
    const results = await BundleAnalysis.request(artifacts, context);

    expect(results).toHaveLength(1);
    expect(results[0].rawMap).toBe(artifacts.SourceMaps[0].map);
    expect(results[0].script).toBe(artifacts.ScriptElements[0]);
    expect(results[0].networkRecord.url).toEqual(networkRecords[0].url);
  });

  it('determines size of source files (simple map)', async () => {
    // This map is from source-map-explorer.
    // https://github.com/danvk/source-map-explorer/tree/4b95f6e7dfe0058d791dcec2107fee43a1ebf02e/tests
    const {map, content} = load('foo.min');
    const networkRecords = [{url: 'https://example.com/foo.js'}];
    const artifacts = {
      SourceMaps: [{scriptUrl: 'https://example.com/foo.js', map}],
      ScriptElements: [{src: 'https://example.com/foo.js', content}],
      devtoolsLogs: {defaultPass: networkRecordsToDevtoolsLog(networkRecords)},
    };
    const context = {computedCache: new Map()};
    const results = await BundleAnalysis.request(artifacts, context);

    expect(results).toHaveLength(1);
    expect(results[0].sizes).toMatchInlineSnapshot(`
      Object {
        "files": Object {
          "node_modules/browser-pack/_prelude.js": 480,
          "src/bar.js": 104,
          "src/foo.js": 97,
        },
        "totalBytes": 717,
        "unmappedBytes": 36,
      }
    `);
  });

  it('determines size of source files (complex map)', async () => {
    const {map, content} = load('squoosh');
    const networkRecords = [{url: 'https://squoosh.app/main-app.js'}];
    const artifacts = {
      SourceMaps: [{scriptUrl: 'https://squoosh.app/main-app.js', map}],
      ScriptElements: [{src: 'https://squoosh.app/main-app.js', content}],
      devtoolsLogs: {defaultPass: networkRecordsToDevtoolsLog(networkRecords)},
    };
    const context = {computedCache: new Map()};
    const results = await BundleAnalysis.request(artifacts, context);

    expect(results).toHaveLength(1);
    expect(results[0].sizes).toMatchInlineSnapshot(`
      Object {
        "files": Object {
          "webpack:///./node_modules/comlink/comlink.js": 4117,
          "webpack:///./node_modules/linkstate/dist/linkstate.es.js": 412,
          "webpack:///./node_modules/pointer-tracker/dist/PointerTracker.mjs": 2672,
          "webpack:///./node_modules/pretty-bytes/index.js": 635,
          "webpack:///./src/codecs/browser-bmp/encoder-meta.ts": 343,
          "webpack:///./src/codecs/browser-bmp/encoder.ts": 101,
          "webpack:///./src/codecs/browser-gif/encoder-meta.ts": 343,
          "webpack:///./src/codecs/browser-gif/encoder.ts": 101,
          "webpack:///./src/codecs/browser-jp2/encoder-meta.ts": 349,
          "webpack:///./src/codecs/browser-jp2/encoder.ts": 101,
          "webpack:///./src/codecs/browser-jpeg/encoder-meta.ts": 282,
          "webpack:///./src/codecs/browser-jpeg/encoder.ts": 115,
          "webpack:///./src/codecs/browser-jpeg/options.ts": 35,
          "webpack:///./src/codecs/browser-pdf/encoder-meta.ts": 349,
          "webpack:///./src/codecs/browser-pdf/encoder.ts": 101,
          "webpack:///./src/codecs/browser-png/encoder-meta.ts": 268,
          "webpack:///./src/codecs/browser-png/encoder.tsx": 101,
          "webpack:///./src/codecs/browser-tiff/encoder-meta.ts": 347,
          "webpack:///./src/codecs/browser-tiff/encoder.ts": 101,
          "webpack:///./src/codecs/browser-webp/encoder-meta.ts": 358,
          "webpack:///./src/codecs/browser-webp/encoder.ts": 115,
          "webpack:///./src/codecs/browser-webp/options.ts": 34,
          "webpack:///./src/codecs/decoders.ts": 206,
          "webpack:///./src/codecs/encoders.ts": 336,
          "webpack:///./src/codecs/generic/quality-option.tsx": 398,
          "webpack:///./src/codecs/generic/util.ts": 159,
          "webpack:///./src/codecs/identity/encoder-meta.ts": 46,
          "webpack:///./src/codecs/imagequant/options.tsx": 1052,
          "webpack:///./src/codecs/imagequant/processor-meta.ts": 40,
          "webpack:///./src/codecs/input-processors.ts": 11,
          "webpack:///./src/codecs/mozjpeg/encoder-meta.ts": 436,
          "webpack:///./src/codecs/mozjpeg/options.tsx": 4416,
          "webpack:///./src/codecs/optipng/encoder-meta.ts": 59,
          "webpack:///./src/codecs/optipng/options.tsx": 366,
          "webpack:///./src/codecs/preprocessors.ts": 75,
          "webpack:///./src/codecs/processor-worker/index.ts": 50,
          "webpack:///./src/codecs/processor.ts": 2380,
          "webpack:///./src/codecs/resize/options.tsx": 3970,
          "webpack:///./src/codecs/resize/processor-meta.ts": 225,
          "webpack:///./src/codecs/resize/processor-sync.ts": 462,
          "webpack:///./src/codecs/resize/util.ts": 134,
          "webpack:///./src/codecs/rotate/processor-meta.ts": 18,
          "webpack:///./src/codecs/tiny.webp": 89,
          "webpack:///./src/codecs/webp/encoder-meta.ts": 660,
          "webpack:///./src/codecs/webp/options.tsx": 5114,
          "webpack:///./src/components/Options/index.tsx": 2176,
          "webpack:///./src/components/Options/style.scss": 410,
          "webpack:///./src/components/Output/custom-els/PinchZoom/index.ts": 3653,
          "webpack:///./src/components/Output/custom-els/TwoUp/index.ts": 2088,
          "webpack:///./src/components/Output/custom-els/TwoUp/styles.css": 75,
          "webpack:///./src/components/Output/index.tsx": 5199,
          "webpack:///./src/components/Output/style.scss": 447,
          "webpack:///./src/components/checkbox/index.tsx": 247,
          "webpack:///./src/components/checkbox/style.scss": 106,
          "webpack:///./src/components/compress/custom-els/MultiPanel/index.ts": 3461,
          "webpack:///./src/components/compress/custom-els/MultiPanel/styles.css": 105,
          "webpack:///./src/components/compress/index.tsx": 8782,
          "webpack:///./src/components/compress/result-cache.ts": 611,
          "webpack:///./src/components/compress/style.scss": 132,
          "webpack:///./src/components/expander/index.tsx": 901,
          "webpack:///./src/components/expander/style.scss": 66,
          "webpack:///./src/components/range/index.tsx": 566,
          "webpack:///./src/components/range/style.scss": 200,
          "webpack:///./src/components/results/FileSize.tsx": 445,
          "webpack:///./src/components/results/index.tsx": 1538,
          "webpack:///./src/components/results/style.scss": 780,
          "webpack:///./src/components/select/index.tsx": 291,
          "webpack:///./src/components/select/style.scss": 103,
          "webpack:///./src/custom-els/RangeInput/index.ts": 2138,
          "webpack:///./src/custom-els/RangeInput/styles.css": 180,
          "webpack:///./src/lib/clean-modify.ts": 331,
          "webpack:///./src/lib/icons.tsx": 2531,
          "webpack:///./src/lib/util.ts": 4043,
        },
        "totalBytes": 83747,
        "unmappedBytes": 10060,
      }
    `);
  });
});
