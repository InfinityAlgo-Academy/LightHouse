/**
 * @license Copyright 2022 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

import fs from 'fs';
import path from 'path';
import {createRequire} from 'module';

// eslint-disable-next-line no-unused-vars
import esbuild from 'esbuild';
import builtin from 'builtin-modules';

import {inlineFsPlugin} from './plugins/esbuild-inline-fs.js';

/**
 * @typedef PartialLoader
 * @property {string} name
 * @property {(code: string, args: esbuild.OnLoadArgs) => Promise<{code: string, warnings?: esbuild.PartialMessage[]}>} onLoad
 */

const partialLoaders = {
  inlineFs: inlineFsPlugin,
  /** @type {PartialLoader} */
  rmGetModuleDirectory: {
    name: 'rm-get-module-directory',
    async onLoad(code) {
      return {code: code.replace(/getModuleDirectory\(import.meta\)/g, '""')};
    },
  },
  /**
   * @param {Record<string, string | ((id: string) => string)>} replacements
   * @return {PartialLoader}
   */
  replaceText(replacements) {
    return {
      name: 'text-replace',
      async onLoad(code, args) {
        for (const [k, v] of Object.entries(replacements)) {
          let replaceWith;
          if (v instanceof Function) {
            replaceWith = v(args.path);
          } else {
            replaceWith = v;
          }

          // @ts-expect-error
          code = code.replaceAll(k, replaceWith);
        }

        return {code};
      },
    };
  },
};

/**
 * Bundles multiple partial loaders (string => string JS transforms) into a single esbuild Loader plugin.
 * A partial loader that doesn't want to do any transform should just return the code given to it.
 * @param {Array<{name: string, onLoad: (code: string, args: esbuild.OnLoadArgs) => Promise<{code: string, warnings?: esbuild.PartialMessage[]}>}>} partialLoaders
 * @return {esbuild.Plugin}
 */
function bulkLoader(partialLoaders) {
  return {
    name: 'bulk-loader',
    setup(build) {
      build.onLoad({filter: /\.*.js$/}, async (args) => {
        /** @type {esbuild.PartialMessage[]} */
        const warnings = [];
        // TODO: source maps? lol.
        let code = await fs.promises.readFile(args.path, 'utf-8');

        for (const partialLoader of partialLoaders) {
          const partialResult = await partialLoader.onLoad(code, args);
          code = partialResult.code;
          if (partialResult.warnings) {
            for (const warning of partialResult.warnings) {
              warning.notes = warning.notes || [];
              warning.notes.unshift({text: `partial loader: ${partialLoader.name}`});
            }
            warnings.push(...partialResult.warnings);
          }
        }

        return {contents: code, warnings, resolveDir: path.dirname(args.path)};
      });
    },
  };
}

/**
 * Given a module path, replace the contents with the provided text.
 *
 * - If the module is a file on disk, the path MUST be absolute.
 * - Bare builtin specifiers (ex: 'fs', 'path') work too.
 * - Other loaders may give a resolved path that doesn't reference a filepath–
 * - In all cases where a module is replaced, no other loaders will process that module.
 *   If this is ever problematic, this plugin should be converted to be a partial loader.
 * - This plugin should always be the first loader plugin.
 *
 * @param {Record<string, string>} replaceMap
 * @param {{disableUnusedError: boolean}} opts
 * @return {esbuild.Plugin}
 */
function replaceModules(replaceMap, opts = {disableUnusedError: false}) {
  // Allow callers to specifier an unresolved path, but normalize things
  // by resolving those paths now.
  // TODO: really this should use import.meta.resolve, but... that's not a thing yet!
  const require = createRequire(import.meta.url);
  for (const [k, v] of Object.entries(replaceMap)) {
    try {
      const resolvedPath = require.resolve(k);
      if (resolvedPath !== k) {
        replaceMap[resolvedPath] = v;
        delete replaceMap[k];
      }
    } catch {}
  }

  return {
    name: 'replace-modules',
    setup(build) {
      // Capture modules of interest and resolve them to their absolute paths.
      // This handles real-files on disk, and builtin specifiers.
      build.onResolve({filter: /.*/}, (args) => {
        // const isBuiltin = builtin.includes(args.path);
        // TODO: delete, right?
        // if (!isBuiltin && args.resolveDir.includes('node_modules')) return;

        // `import.meta.resolve` would be amazing here!
        // ex: 'puppeteer-core' or 'pako/lib/zlib/inflate.js'
        // const isPackageSpecifier = !(args.path.startsWith('/') || args.path.startsWith('.'));
        // const resolvedPath = isBuiltin || isPackageSpecifier ?
        //   args.path :
        //   path.resolve(args.resolveDir, args.path);
        let resolvedPath;
        try {
          resolvedPath = require.resolve(args.path, {paths: [args.resolveDir]});
        } catch {
          // We should append .js and .ts and .tsx to try and file the correct file...
          // but we aren't shimming such modules at the moment, so whatever.
          return;
        }
        if (!(resolvedPath in replaceMap)) return;

        return {path: resolvedPath, namespace: 'replace-modules'};
      });

      const modulesNotSeen = new Set(Object.keys(replaceMap));
      build.onLoad({filter: /.*/, namespace: 'replace-modules'}, async (args) => {
        // Anything in our namespace is guaranteed to be something in replaceMap.
        modulesNotSeen.delete(args.path);
        return {contents: replaceMap[args.path], resolveDir: path.dirname(args.path)};
      });

      // Handle the third case - when the module i
      // Note that if there is a match here, that means the module is something that could not
      // be `require.resolve`'d above, ie. a fake resolved path from some other plugin.
      build.onLoad({filter: /.*/}, async (args) => {
        if (args.path in replaceMap) {
          modulesNotSeen.delete(args.path);
          return {contents: replaceMap[args.path], resolveDir: path.dirname(args.path)};
        }
        return null;
      });

      if (!opts.disableUnusedError) {
        build.onEnd(() => {
          if (modulesNotSeen.size > 0) {
            throw new Error('Unused module replacements: ' + [...modulesNotSeen]);
          }
        });
      }
    },
  };
}

/**
 * @param {string[]=} builtinList
 * @return {esbuild.Plugin}
 */
function ignoreBuiltins(builtinList) {
  if (!builtinList) builtinList = [...builtin];
  const builtinRegexp = new RegExp(`^(${builtinList.join('|')})\\/?(.+)?`);
  return {
    name: 'ignore-builtins',
    setup(build) {
      build.onResolve({filter: builtinRegexp}, (args) => {
        if (args.path.match(builtinRegexp)) {
          return {path: args.path, namespace: 'ignore-builtins'};
        }
      });
      build.onLoad({filter: builtinRegexp, namespace: 'ignore-builtins'}, async () => {
        return {contents: ''};
      });
    },
  };
}

/**
 * Currently there is no umd support in esbuild,
 * so we take the output of an iife build and create our own umd bundle.
 * https://github.com/evanw/esbuild/pull/1331
 * @param {string} iifeCode expected to use `globalName: 'umdExports'`
 * @param {string} moduleName
 * @return {string}
 */
function generateUMD(iifeCode, moduleName) {
  return `(function(root, factory) {
  if (typeof define === "function" && define.amd) {
    define(factory);
  } else if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.${moduleName} = factory();
  }
}(typeof self !== "undefined" ? self : this, function() {
  "use strict";
  ${iifeCode.replace('"use strict";\n', '')};
  return umdExports;
}));
`;
}

export {
  partialLoaders,
  bulkLoader,
  replaceModules,
  ignoreBuiltins,
  generateUMD,
};
