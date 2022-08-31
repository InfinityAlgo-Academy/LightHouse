/**
 * @license Copyright 2018 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

/**
 * @fileoverview Script to bundle lighthouse entry points so that they can be run
 * in the browser (as long as they have access to a debugger protocol Connection).
 */

import fs from 'fs';
import path from 'path';
import {execSync} from 'child_process';
import {createRequire} from 'module';

import esMain from 'es-main';
import esbuild from 'esbuild';
import {NodeModulesPolyfillPlugin as nodeModulesPolyfillPlugin} from '@esbuild-plugins/node-modules-polyfill';
// TODO(esmodules): convert pubads to esm
// // @ts-expect-error: plugin has no types.
// import PubAdsPlugin from 'lighthouse-plugin-publisher-ads/plugin.js';

import * as plugins from './esbuild-plugins.js';
import {Runner} from '../core/runner.js';
import {LH_ROOT} from '../root.js';
import {readJson} from '../core/test/test-utils.js';

const require = createRequire(import.meta.url);

/** The commit hash for the current HEAD. */
const COMMIT_HASH = execSync('git rev-parse HEAD').toString().trim();

// HACK: manually include the lighthouse-plugin-publisher-ads audits.
/** @type {Array<string>} */
// // @ts-expect-error
// const pubAdsAudits = PubAdsPlugin.audits.map(a => a.path);

/** @param {string} file */
const isDevtools = file =>
  path.basename(file).includes('devtools') || path.basename(file).endsWith('dt-bundle.js');
/** @param {string} file */
const isLightrider = file => path.basename(file).includes('lightrider');

// Set to true for source maps.
const DEBUG = false;

const today = (() => {
  const date = new Date();
  const year = new Intl.DateTimeFormat('en', {year: 'numeric'}).format(date);
  const month = new Intl.DateTimeFormat('en', {month: 'short'}).format(date);
  const day = new Intl.DateTimeFormat('en', {day: '2-digit'}).format(date);
  return `${month} ${day} ${year}`;
})();
const pkg = readJson(`${LH_ROOT}/package.json`);
const banner = `
/**
 * Lighthouse v${pkg.version} ${COMMIT_HASH} (${today})
 *
 * ${pkg.description}
 *
 * @homepage ${pkg.homepage}
 * @author   ${pkg.author}
 * @license  ${pkg.license}
 */
`.trim();

/**
 * Bundle starting at entryPath, writing the minified result to distPath.
 * @param {string} entryPath
 * @param {string} distPath
 * @param {{minify: boolean}=} opts
 * @return {Promise<void>}
 */
async function buildBundle(entryPath, distPath, opts = {minify: true}) {
  if (fs.existsSync(LH_ROOT + '/lighthouse-logger/node_modules')) {
    throw new Error('delete `lighthouse-logger/node_modules` because it messes up rollup bundle');
  }

  // List of paths (absolute / relative to config-helpers.js) to include
  // in bundle and make accessible via config-helpers.js `requireWrapper`.
  const dynamicModulePaths = [
    ...Runner.getGathererList().map(gatherer => `../gather/gatherers/${gatherer}`),
    ...Runner.getAuditList().map(gatherer => `../audits/${gatherer}`),
  ];

  // Include lighthouse-plugin-publisher-ads.
  // if (isDevtools(entryPath) || isLightrider(entryPath)) {
  //   dynamicModulePaths.push('lighthouse-plugin-publisher-ads');
  //   pubAdsAudits.forEach(pubAdAudit => {
  //     dynamicModulePaths.push(pubAdAudit);
  //   });
  // }

  const bundledMapEntriesCode = dynamicModulePaths.map(modulePath => {
    const pathNoExt = modulePath.replace('.js', '');
    return `['${pathNoExt}', import('${modulePath}')]`;
  }).join(',\n');

  /** @type {Record<string, string>} */
  const shimsObj = {
    [require.resolve('../core/gather/connections/cri.js')]:
      'export const CriConnection = {}',
    [require.resolve('../package.json')]: `export const version = '${pkg.version}';`,
    'rollup-plugin-node-polyfills/polyfills/zlib-lib/inflate.js': `
      export function inflateInit2() {};
      export function inflate() {};
      export function inflateEnd() {};
      export function inflateReset() {};
    `,
  };

  const modulesToIgnore = [
    'puppeteer-core',
    'pako/lib/zlib/inflate.js',
    '@sentry/node',
    'source-map',
    'ws',
  ];

  // Don't include the stringified report in DevTools - see devtools-report-assets.js
  // Don't include in Lightrider - HTML generation isn't supported, so report assets aren't needed.
  if (isDevtools(entryPath) || isLightrider(entryPath)) {
    shimsObj[`${LH_ROOT}/report/generator/report-assets.js`] =
      'export const reportAssets = {}';
  }

  // Don't include locales in DevTools.
  if (isDevtools(entryPath)) {
    shimsObj[`${LH_ROOT}/shared/localization/locales.js`] = 'export const locales = {};';
  }

  for (const modulePath of modulesToIgnore) {
    shimsObj[modulePath] = 'export default {}';
  }

  const result = await esbuild.build({
    entryPoints: [entryPath],
    outfile: distPath,
    write: false,
    format: 'iife',
    bundle: true,
    minify: opts.minify,
    treeShaking: true,
    sourcemap: DEBUG,
    banner: {js: banner},
    plugins: [
      plugins.replaceModules({
        ...shimsObj,
        // Allows for plugins to import lighthouse.
        // TODO: not needed until pubads is back. (note: might not be needed even then?)
        // 'lighthouse': `
        //   import {Audit} from '${require.resolve('../core/audits/audit.js')}';
        //   export {Audit};
        // `,
        'url': `
          export const URL = globalThis.URL;
          export const fileURLToPath = url => url;
          export default {URL, fileURLToPath};
        `,
        'module': `
          export const createRequire = () => {
            return {
              resolve() {
                throw new Error('createRequire.resolve is not supported in bundled Lighthouse');
              },
            };
          };
        `,
      }, {
        // buildBundle is used in a lot of different contexts. Some share the same modules
        // that need to be replaced, but others don't use those modules at all.
        disableUnusedError: true,
      }),
      nodeModulesPolyfillPlugin(),
      plugins.bulkLoader([
        {name: 'text-replace', async onLoad(code, args) {
          const replacements = {
            '/* BUILD_REPLACE_BUNDLED_MODULES */': `[\n${bundledMapEntriesCode},\n]`,
            // This package exports to default in a way that causes Rollup to get confused,
            // resulting in MessageFormat being undefined.
            'require(\'intl-messageformat\').default': 'require(\'intl-messageformat\')',
            // Below we replace lighthouse-logger with a local copy, which is ES modules. Need
            // to change every require of the package to reflect this.
            'require(\'lighthouse-logger\');': 'require(\'lighthouse-logger\').default;',
            // Rollup doesn't replace this, so let's manually change it to false.
            'require.main === module': 'false',
            // TODO: Use globalThis directly.
            'global.isLightrider': 'globalThis.isLightrider',
            'global.isDevtools': 'globalThis.isDevtools',
            // For some reason, `shim` doesn't work to force this module to return false, so instead
            // just replace usages of it with false.
            'esMain(import.meta)': 'false',
            'import esMain from \'es-main\'': '',
            // By default esbuild converts `import.meta` to an empty object.
            // We need at least the url property for i18n things.
            /** @param {string} id */
            'import.meta': (id) => `{url: '${path.relative(LH_ROOT, id)}'}`,
          };

          for (const [k, v] of Object.entries(replacements)) {
            let replaceWith;
            if (v instanceof Function) {
              replaceWith = v(args.path);
            } else {
              replaceWith = v;
            }

            // @ts-expect-error
            if (String.prototype.replaceAll) {
              // @ts-expect-error
              code = code.replaceAll(k, replaceWith);
            } else {
              // TODO: delete when not supporting node 14
              while (code.includes(k)) code = code.replace(k, replaceWith);
            }
          }

          return {code};
        }},
        // TODO: for rollup, various things were tree-shaken out before inlineFs did its thing.
        // Now treeshaking only happens at the end, so the plugin sees more cases than it did before.
        // Some of those new cases emit warnings. Safe to ignore, but should be resolved eventually.
        plugins.partialLoaders.inlineFs,
        plugins.partialLoaders.rmGetModuleDirectory,
      ]),
      {
        name: 'alias',
        setup(build) {
          build.onResolve({filter: /\.*/}, (args) => {
            /** @type {Record<string, string>} */
            const entries = {
              'debug': require.resolve('debug/src/browser.js'),
              'lighthouse-logger': require.resolve('../lighthouse-logger/index.js'),
            };
            if (args.path in entries) {
              return {path: entries[args.path]};
            }
          });
        },
      },
      {
        name: 'postprocess',
        setup(build) {
          build.onEnd(result => {
            if (!result.outputFiles) throw new Error();

            // esbuild sees the usages of these functions in page functions (ex: see AnchorElements)
            // and treats them as globals. Because the names are "taken" by the global, esbuild renames
            // the actual functions (ex: to getNodeDetails2). The page functions expect a certain name, so
            // here we undo what esbuild did.

            const replacements = [
              ['getBoundingClientRect2', 'getBoundingClientRect'],
              ['getElementsInDocument2', 'getElementsInDocument'],
              ['getNodeDetails2', 'getNodeDetails'],
              ['getRectCenterPoint2', 'getRectCenterPoint'],
              ['isPositionFixed2', 'isPositionFixed'],
            ];

            let code = result.outputFiles[0].text;
            for (const [k, v] of replacements) {
              // @ts-expect-error
              if (String.prototype.replaceAll) {
                // @ts-expect-error
                code = code.replaceAll(k, v);
              } else {
                // TODO: delete when not supporting node 14
                while (code.includes(k)) code = code.replace(k, v);
              }
            }

            // Get rid of our extra license comments.
            // https://stackoverflow.com/a/35923766
            const re = /\/\*\*\s*\n([^*]|(\*(?!\/)))*\*\/\n/g;
            let hasSeenFirst = false;
            code = code.replace(re, (match) => {
              if (match.includes('@license') && match.match(/Lighthouse Authors|Google/)) {
                if (hasSeenFirst) {
                  return '';
                }

                hasSeenFirst = true;
              }

              return match;
            });

            result.outputFiles[0].contents = new TextEncoder().encode(code);
          });
        },
      },

      // TODO
      // opts.minify && rollupPlugins.terser({
      //   ecma: 2019,
      //   output: {
      //     comments: (node, comment) => {
      //       const text = comment.value;
      //       if (text.includes('The Lighthouse Authors') && comment.line > 1) return false;
      //       return /@ts-nocheck - Prevent tsc|@preserve|@license|@cc_on|^!/i.test(text);
      //     },
      //     max_line_len: 1000,
      //   },
      //   // The config relies on class names for gatherers.
      //   keep_classnames: true,
      //   // Runtime.evaluate errors if function names are elided.
      //   keep_fnames: true,
      // }),
    ],
  });

  await fs.promises.writeFile(result.outputFiles[0].path, result.outputFiles[0].text);
}

/**
 * @param {Array<string>} argv
 */
async function cli(argv) {
  // Take paths relative to cwd and build.
  const [entryPath, distPath] = argv.slice(2)
    .map(filePath => path.resolve(process.cwd(), filePath));
  await buildBundle(entryPath, distPath, {minify: !process.env.DEBUG});
}

// Test if called from the CLI or as a module.
if (esMain(import.meta)) {
  await cli(process.argv);
}

export {
  COMMIT_HASH,
  buildBundle,
};
