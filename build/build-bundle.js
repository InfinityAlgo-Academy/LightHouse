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
const rollup = require('rollup');
const alias = require('@rollup/plugin-alias');
const commonjs =
// @ts-expect-error types are wrong.
/** @type {import('rollup-plugin-commonjs').default} */ (require('rollup-plugin-commonjs'));
const json = require('@rollup/plugin-json');
const nodePolyfills = require('rollup-plugin-node-polyfills');
const nodeResolve = require('rollup-plugin-node-resolve');
const postprocess = require('./rollup-postprocess.js');
const replace = require('rollup-plugin-replace');
const shim = require('rollup-plugin-shim');
const {terser} = require('rollup-plugin-terser');
const LighthouseRunner = require('../lighthouse-core/runner.js');
const {minifyFileTransform} = require('./build-utils.js');
const Runner = require('../lighthouse-core/runner.js');
const rollupBrfs = require('./rollup-brfs.js');
const {LH_ROOT} = require('../root.js');

const COMMIT_HASH = require('child_process')
  .execSync('git rev-parse HEAD')
  .toString().trim();

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

// TODO
// bundle
//   .plugin('browserify-banner', {
//     pkg: Object.assign({COMMIT_HASH}, require('../package.json')),
//     file: require.resolve('./banner.txt'),
//   })

/**
 * Minify a javascript file, in place.
 * @param {string} filePath
 */
async function minifyScript(filePath) {
  const code = fs.readFileSync(filePath, 'utf-8');
  const result = await terser.minify(code, {
    ecma: 2019,
    output: {
      comments: /^!/,
      max_line_len: 1000,
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

  // Add the banner and modify globals for DevTools if necessary.
  if (isDevtools(filePath) && result.code) {
    // Add a comment for TypeScript, but not if in DEBUG mode so that source maps are not affected.
    // See lighthouse-cli/test/smokehouse/lighthouse-runners/bundle.js
    if (!DEBUG) {
      result.code =
        '// @ts-nocheck - Prevent tsc stepping into any required bundles.\n' + result.code;
    }

    assert.ok(result.code.includes('\nrequire='), 'missing browserify require stub');
    result.code = result.code.replace('\nrequire=', '\nglobalThis.require=');
    assert.ok(!result.code.includes('\nrequire='), 'contained unexpected browserify require stub');
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
  // List of paths (absolute / relative to config-helpers.js) to include
  // in bundle and make accessible via config-helpers.js `requireWrapper`.
  const dynamicModulePaths = [
    ...Runner.getGathererList().map(gatherer => `../gather/gatherers/${gatherer}`),
    ...Runner.getAuditList().map(gatherer => `../audits/${gatherer}`),
  ];

  // Include lighthouse-plugin-publisher-ads.
  if (isDevtools(entryPath) || isLightrider(entryPath)) {
    dynamicModulePaths.push('lighthouse-plugin-publisher-ads');
    pubAdsAudits.forEach(pubAdAudit => {
      dynamicModulePaths.push(pubAdAudit);
    });
  }

  const bundledMapEntriesCode = dynamicModulePaths.map(modulePath => {
    const pathNoExt = modulePath.replace('.js', '');
    return `['${pathNoExt}', require('${modulePath}')]`;
  }).join(',\n');

  const shimsObj = {};
  const modulesToIgnore = [
    'intl-pluralrules',
    'intl',
    'pako/lib/zlib/inflate.js',
    'raven',
    'source-map',
    'ws',
    require.resolve('../lighthouse-core/gather/connections/cri.js'),
  ];

  // Don't include the stringified report in DevTools - see devtools-report-assets.js
  // Don't include in Lightrider - HTML generation isn't supported, so report assets aren't needed.
  if (isDevtools(entryPath) || isLightrider(entryPath)) {
    modulesToIgnore.push(require.resolve('../report/report-assets.js'));
  }

  // Don't include locales in DevTools.
  if (isDevtools(entryPath)) {
    const localeKeys = Object.keys(require('../lighthouse-core/lib/i18n/locales.js'));
    const localesShim = {};
    for (const key of localeKeys) localesShim[key] = {};
    shimsObj['./locales.js'] = `export default ${JSON.stringify(localesShim)}`;
  }

  for (const modulePath of modulesToIgnore) {
    shimsObj[modulePath] = 'export default {}';
  }

  const packageJsonShim = {version: require('../package.json').version};
  shimsObj[require.resolve('../package.json')] = `export default ${JSON.stringify(packageJsonShim)}`;

  const bundle = await rollup.rollup({
    input: entryPath,
    context: 'globalThis',
    plugins: [
      replace({
        delimiters: ['', ''],
        values: {
          '/* BUILD_REPLACE_BUNDLED_MODULES */': `[\n${bundledMapEntriesCode},\n]`,
          '__dirname': (id) => `'${path.relative(LH_ROOT, path.dirname(id))}'`,
          '__filename': (id) => `'${path.relative(LH_ROOT, id)}'`,
        },
      }),
      alias({
        entries: {
          debug: require.resolve('debug/src/browser.js'),
          url: require.resolve('../lighthouse-core/lib/url-shim.js'),
        },
      }),
      shim({
        ...shimsObj,
        // Allows for plugins to import lighthouse.
        'lighthouse': `import Audit from '${require.resolve('../lighthouse-core/audits/audit.js')}'; export {Audit};`,
      }),
      // Currently must run before commonjs (brfs does not support import).
      // This currenty messes up source maps.
      rollupBrfs({
        readFileSyncTransform: minifyFileTransform,
        global: true,
        parserOpts: {ecmaVersion: 12, sourceType: 'module'},
      }),
      commonjs({
        // https://github.com/rollup/plugins/issues/922
        ignoreGlobal: true,
      }),
      json({
        preferConst: true,
      }),
      nodeResolve({preferBuiltins: true}),
      nodePolyfills(),
      // Rollup sees the usages of these functions in page functions (ex: see AnchorElements)
      // and treats them as globals. Because the names are "taken" by the global, Rollup renames
      // the actual functions (getNodeDetails$1). The page functions expect a certain name, so
      // here we undo what Rollup did.
      postprocess([
        [/getElementsInDocument\$1/, 'getElementsInDocument'],
        [/getNodeDetails\$1/, 'getNodeDetails'],
        [/getRectCenterPoint\$1/, 'getRectCenterPoint'],
      ]),
      terser({
        ecma: 2019,
        output: {
          comments: /^!/,
          max_line_len: 1000,
        },
        // The config relies on class names for gatherers.
        keep_classnames: true,
        // Runtime.evaluate errors if function names are elided.
        keep_fnames: true,
      }),
    ],
  });

  await bundle.write({
    file: distPath,
    format: 'iife',
    sourcemap: DEBUG,
  });
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

// Test if called from the CLI or as a module.
if (require.main === module) {
  cli(process.argv);
} else {
  module.exports = {
    /** The commit hash for the current HEAD. */
    COMMIT_HASH,
    build,
  };
}
