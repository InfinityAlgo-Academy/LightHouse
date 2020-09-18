/**
 * @license Copyright 2018 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/**
 * @fileoverview Script to bundle lighthouse entry points so that they can be run
 * in the browser (as long as they have access to a debugger protocol Connection).
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert').strict;
const mkdir = fs.promises.mkdir;
const { Readable } = require('stream');
const brfs = require('@wardpeet/brfs');
const LighthouseRunner = require('../lighthouse-core/runner.js');
const terser = require('terser');
const {minifyFileTransform} = require('./build-utils.js');

const COMMIT_HASH = require('child_process')
  .execSync('git rev-parse HEAD')
  .toString().trim();

const audits = LighthouseRunner.getAuditList()
  .map(f => '../lighthouse-core/audits/' + f);

const gatherers = LighthouseRunner.getGathererList()
  .map(f => '../lighthouse-core/gather/gatherers/' + f);

const locales = fs.readdirSync(__dirname + '/../lighthouse-core/lib/i18n/locales/')
  .map(f => require.resolve(`../lighthouse-core/lib/i18n/locales/${f}`));

// HACK: manually include the lighthouse-plugin-publisher-ads audits.
/** @type {Array<string>} */
// @ts-expect-error
const pubAdsAudits = require('lighthouse-plugin-publisher-ads/plugin.js').audits.map(a => a.path);

/** @param {string} file */
const isDevtools = file =>
  path.basename(file).includes('devtools') || path.basename(file).endsWith('dt-bundle.js');
/** @param {string} file */
const isLightrider = file => path.basename(file).includes('lightrider');

// Set to true for source maps.
const DEBUG = false;

/**
 * Minify a javascript file, in place.
 * Browserify starting at the file at entryPath. Contains entry-point-specific
 * ignores (e.g. for DevTools or the extension) to trim the bundle depending on
 * the eventual use case.
 * @param {string} entryPath
 * @param {string} distPath
 * @return {Promise<void>}
 */
async function bundleWithRollup(entryPath, distPath) {
  const rollup = require('rollup');
  const modulesToIgnore = [
    'intl',
    'intl-pluralrules',
    'raven',
    'rimraf',
    'pako/lib/zlib/inflate.js',
  ].map(p => require.resolve(p));

  // TODO: rename
  const dynamicRequireTargets = [];

  // Don't include the desktop protocol connection.
  modulesToIgnore.push(require.resolve('../lighthouse-core/gather/connections/cri.js'));
  
  // Don't include the stringified report in DevTools - see devtools-report-assets.js
  // Don't include in Lightrider - HTML generation isn't supported, so report assets aren't needed.
  if (isDevtools(entryPath) || isLightrider(entryPath)) {
    modulesToIgnore.push(require.resolve('../lighthouse-core/report/html/html-report-assets.js'));
  }

  // Don't include locales in DevTools.
  if (isDevtools(entryPath)) {
    modulesToIgnore.push(...locales);
  }

  // Expose the audits, gatherers, and computed artifacts so they can be dynamically loaded.
  // Exposed path must be a relative path from lighthouse-core/config/config-helpers.js (where loading occurs).
  const corePath = './lighthouse-core/';
  const driverPath = `${corePath}gather/`;
  audits.forEach(audit => {
    // bundle = bundle.require(audit, {expose: audit.replace(corePath, '../')});
    // dynamicRequireTargets.push(audit);
    // dynamicRequireTargets.push(audit.replace(corePath, '../'));
    
    dynamicRequireTargets.push(require.resolve(audit));
  });
  gatherers.forEach(gatherer => {
    // bundle = bundle.require(gatherer, {expose: gatherer.replace(driverPath, '../gather/')});
    // dynamicRequireTargets.push(gatherer);
    // dynamicRequireTargets.push(gatherer.replace(driverPath, '../gather/'));
    // console.log(gatherer)
    
    dynamicRequireTargets.push(require.resolve(gatherer));
  });

  // HACK: manually include the lighthouse-plugin-publisher-ads audits.
  if (isDevtools(entryPath) || isLightrider(entryPath)) {
    dynamicRequireTargets.push(require.resolve('lighthouse-plugin-publisher-ads'));
    // dynamicRequireTargets.push('lighthouse-plugin-publisher-ads');
    pubAdsAudits.forEach(pubAdAudit => {
      dynamicRequireTargets.push(require.resolve(pubAdAudit));
      // dynamicRequireTargets.push(pubAdAudit + '.js');
    });
  }

  // console.log(dynamicRequireTargets.join('\n'));

  /** @type {Record<string, string>} */
  const files = {};
  for (const module of modulesToIgnore) {
    if (module.endsWith('.json')) {
      files[module] = '{}';
    } else {
      files[module] = 'export default {};';
    }
  }

  const rollupBrfs = function(options = {}) {
    return {
      name: 'brfs',
      transform(_code, id) {
        const ignore = options.ignore || [];

        if (id.startsWith('\u0000') || ignore.includes(id) || !fs.existsSync(id) || id.includes('node_modules')) {
          return null;
        }

        return new Promise((resolve, reject) => {
          let output = '';
          const stream = Readable.from(_code).pipe(brfs(id, options));
          stream.on('data', (data) => {
            output += data.toString();
          });
          stream.on('end', () => resolve({
            code: output,
            map: {mappings: ''},
          }));
          stream.on('error', reject);
        });
      },
    };
  };

  files['lighthouse-logger/index.js'] = fs.readFileSync(require.resolve('../lighthouse-logger/index.js'), 'utf-8');

  // files['test.js'] = 'require("" + "/Users/cjamcl/src/lighthouse/lighthouse-core/audits/metrics/first-cpu-idle.js")';
  
  // entryPath = '/Users/cjamcl/src/lighthouse/lighthouse-core/report/html/html-report-assets.js';
  // console.log(dynamicRequireTargets)
  // entryPath = dynamicRequireTargets[0]
  // entryPath = '/Users/cjamcl/src/lighthouse/lighthouse-core/config/config.js'

  // const LH_ROOT = `${__dirname}/..`;
  // const tmpPath = `${LH_ROOT}/.tmp/dynamic-requires.js`;
  // const requires = dynamicRequireTargets.slice(0,1)
  //   .map((file, i) => `const v${i} = require('${file}');`)
  //   .join('\n');
  // const props = dynamicRequireTargets.slice(0,1)
  //   .map((file, i) => `'${file}': v${i},`)
  //   .join('\n');
  // const dynamicCode = `${requires};\nmodule.exports = {\n${props}\n};`;
  // fs.writeFileSync(tmpPath, dynamicCode);

  const bundle = await rollup.rollup({
    input: entryPath,
    plugins: [
      
      // require('rollup-plugin-replace')({
      //   fileReplacements: [{
      //     file: 'lodash.isequal',
      //     with: 'lodash-es/isEqual.js',
      //   }],
      // }),
      // TODO move to 2nd
      require('./rollup-plugin-tmp.js')({
        files,
        allowFallthrough: true,
      }),

      require('@rollup/plugin-alias')({
        entries: [
          {find: 'debug', replacement: 'debug/src/browser.js'},
        ],
      }),

      rollupBrfs({
        readFileSyncTransform: minifyFileTransform,
        global: true,
        parserOpts: {ecmaVersion: 10},
        // sourceMap: true,
        ignore: modulesToIgnore,
      }),

      

      // https://github.com/rollup/rollup/issues/2463#issuecomment-455957865
      // {
      //   // this is necessary to tell rollup that it should not try to resolve "dynamic-targets"
      //   // via other means
      //   resolveId(id, importer) {
      //     if (id === 'dynamic-targets') {
      //       return id;
      //     }

      //     if (importer === 'dynamic-targets') {
      //       // return require.resolve(id);
      //     }

      //     return null;
      //   },
    
      //   // create a module that exports an object containing file names as keys and
      //   // functions that import those files as values
      //   load(id) {
      //     if (id === 'dynamic-targets') {
      //       // const files = [...dynamicRequireTargets, require.resolve('../lighthouse-core/index.js')];
      //       const files = dynamicRequireTargets;
      //       const requires = files
      //         .map((file, i) => `import * as v${i} from '${file}';`)
      //         .join('\n');
      //       const props = files
      //         .map((file, i) => `'${file}': v${i},`)
      //         .join('\n');
      //       // TODO: remove export?
      //       return `${requires};\nexport default {\n${props}\n};`;

      //       // const files = dynamicRequireTargets;
      //       // const requires = files
      //       //   .map((file, i) => `const v${i} = require('${file}');`)
      //       //   .join('\n');
      //       // const props = files
      //       //   .map((file, i) => `'${file}': v${i},`)
      //       //   .join('\n');
      //       // // TODO: remove export?
      //       // return `${requires};\nmodule.exports = {\n${props}\n};`;
      //     }
      //     return null;
      //   }
      // },

      require('@rollup/plugin-node-resolve').nodeResolve({preferBuiltins: true}),
      // @ts-expect-error - Types don't match package.
      require('@rollup/plugin-commonjs')({
        dynamicRequireTargets,
        // dynamicRequireTargets: [require.resolve('../lighthouse-core/index.js')],
        transformMixedEsModules: true,
      }),
      // @ts-expect-error - Types don't match package.
      require('rollup-plugin-node-polyfills')(),
      // @ts-expect-error - Types don't match package.
      require('rollup-plugin-node-globals')({
        dirname: true,
        filename: true,
        process: true,
        global: false,
        buffer: false,
        baseDir: false,
      }),
      // @ts-expect-error - Types don't match package.
      require('@rollup/plugin-json')(),
    ],
  });

  await bundle.write({
    file: distPath,
    format: 'iife',
    inlineDynamicImports: true,
    sourcemap: true,
  });
}

/**
 * Minimally minify a javascript file, in place.
 * @param {string} filePath
 */
function minifyScript(filePath) {
  const result = terser.minify(fs.readFileSync(filePath, 'utf-8'), {
    output: {
      comments: /^!/,
      // @ts-expect-error - terser types are whack-a-doodle wrong.
      max_line_len: /** @type {boolean} */ (1000),
    },
    // The config relies on class names for gatherers.
    keep_classnames: true,
    // Runtime.evaluate errors if function names are elided.
    keep_fnames: true,
    sourceMap: DEBUG && {
      content: JSON.parse(fs.readFileSync(`${filePath}.map`, 'utf-8')),
      url: path.basename(`${filePath}.map`),
    },
  });
  if (result.error) {
    throw result.error;
  }

  // Add a comment for TypeScript, but not if in DEBUG mode so that source maps are not affected.
  // See lighthouse-cli/test/smokehouse/lighthouse-runners/bundle.js
  if (!DEBUG && isDevtools(filePath) && result.code) {
    result.code =
      '// @ts-nocheck - Prevent tsc stepping into any required bundles.\n' + result.code;
  }

  fs.writeFileSync(filePath, result.code);
  if (DEBUG) fs.writeFileSync(`${filePath}.map`, result.map);
}

/**
 * Browserify starting at entryPath, writing the minified result to distPath.
 * @param {string} entryPath
 * @param {string} distPath
 * @return {Promise<void>}
 */
async function build(entryPath, distPath) {
  await bundleWithRollup(entryPath, distPath);
  // minifyScript(distPath);
}

/**
 * @param {Array<string>} argv
 */
async function cli(argv) {
  // Take paths relative to cwd and build.
  const [entryPath, distPath] = argv.slice(2)
    .map(filePath => path.resolve(process.cwd(), filePath));
  build(entryPath, distPath);
}

// @ts-expect-error Test if called from the CLI or as a module.
if (require.main === module) {
  cli(process.argv);
} else {
  module.exports = {
    /** The commit hash for the current HEAD. */
    COMMIT_HASH,
    build,
  };
}
