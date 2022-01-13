/**
 * @license Copyright 2020 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const rollup = require('rollup');
const rollupPlugins = require('./rollup-plugins.js');
const cpy = require('cpy');
const ghPages = require('gh-pages');
const glob = require('glob');
const lighthousePackage = require('../package.json');
const terser = require('terser');
const {LH_ROOT} = require('../root.js');

const ghPagesDistDir = `${LH_ROOT}/dist/gh-pages`;

const license = `/*
* @license Copyright 2020 The Lighthouse Authors. All Rights Reserved.
*
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
*
* http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express
* or implied. See the License for the specific language governing
* permissions and limitations under the License.
*/`;

/**
 * Literal string (representing JS, CSS, etc...), or an object with a path, which would
 * be interpreted relative to opts.appDir and be glob-able.
 * @typedef {{path: string, rollup?: boolean, rollupPlugins?: rollup.Plugin[]} | string} Source
 */

/**
 * @typedef BuildOptions
 * @property {string} name Name of app, used for hosted path (`googlechrome.github.io/lighthouse/{name}/`) and output directory (`dist/gh-pages/{name}`).
 * @property {string} appDir Path to directory where source lives, used as a base for other paths in options.
 * @property {Source} html
 * @property {Record<string, string>=} htmlReplacements Needle -> Replacement mapping, used on html source.
 * @property {Source[]} stylesheets
 * @property {Source[]} javascripts
 * @property {Array<{path: string, destDir?: string, rename?: string}>} assets List of paths to copy. Glob-able, maintains directory structure and copies into appDir. Provide a `destDir` and `rename` to state explicitly how to save in the app dir folder.
 */

/**
 * Evaluates path glob and loads all identified files as an array of strings.
 * @param {string} pattern
 * @return {string[]}
 */
function loadFiles(pattern) {
  const filePaths = glob.sync(pattern, {nodir: true});
  return filePaths.map(path => fs.readFileSync(path, {encoding: 'utf8'}));
}

/**
 * Write a file to filePath, creating parent directories if needed.
 * @param {string} filePath
 * @param {string} data
 */
function safeWriteFile(filePath, data) {
  const fileDir = path.dirname(filePath);
  fs.mkdirSync(fileDir, {recursive: true});
  fs.writeFileSync(filePath, data);
}

class GhPagesApp {
  /**
   * @param {BuildOptions} opts
   */
  constructor(opts) {
    this.opts = opts;
    this.distDir = `${ghPagesDistDir}/${opts.name}`;
    /** @type {string[]} */
    this.preloadScripts = [];
  }

  async build() {
    fs.rmSync(this.distDir, {recursive: true, force: true});

    const bundledJs = await this._compileJs();
    safeWriteFile(`${this.distDir}/src/bundled.js`, bundledJs);

    const html = await this._compileHtml();
    safeWriteFile(`${this.distDir}/index.html`, html);

    const css = await this._compileCss();
    safeWriteFile(`${this.distDir}/styles/bundled.css`, css);

    for (const {path, destDir, rename} of this.opts.assets) {
      const dir = destDir ? `${this.distDir}/${destDir}` : this.distDir;
      await cpy(path, dir, {
        cwd: this.opts.appDir,
        rename,
      });
    }
  }

  /**
   * @return {Promise<void>}
   */
  deploy() {
    return new Promise((resolve, reject) => {
      ghPages.publish(this.distDir, {
        add: true, // keep existing files
        dest: this.opts.name,
        message: `Update ${this.opts.name} to lighthouse@${lighthousePackage.version}`,
      }, err => {
        if (err) return reject(err);
        resolve();
      });
    });
  }

  /**
   * @param {Source[]} sources
   * @return {Promise<string[]>}
   */
  async _resolveSourcesList(sources) {
    const result = [];

    for (const source of sources) {
      if (typeof source === 'string') {
        result.push(source);
      } else if (source.rollup) {
        result.push(await this._rollupSource(
          path.resolve(this.opts.appDir, source.path),
          source.rollupPlugins)
        );
      } else {
        result.push(...loadFiles(path.resolve(this.opts.appDir, source.path)));
      }
    }

    return result;
  }

  /**
   * @param {string} input
   * @param {rollup.Plugin[]=} plugins
   * @return {Promise<string>}
   */
  async _rollupSource(input, plugins) {
    plugins = plugins || [
      rollupPlugins.nodeResolve(),
      rollupPlugins.commonjs(),
    ];
    if (!process.env.DEBUG) plugins.push(rollupPlugins.terser());
    const bundle = await rollup.rollup({
      preserveEntrySignatures: 'strict',
      input,
      plugins,
    });
    const {output} = await bundle.generate({format: 'esm'});

    // Return the code from the main chunk, and save the rest to the src directory.
    for (let i = 1; i < output.length; i++) {
      if (output[i].type === 'chunk') {
        // @ts-expect-error This is a chunk, not an asset.
        const code = output[i].code;
        safeWriteFile(`${this.distDir}/src/${output[i].fileName}`, code);
      }
    }
    const scripts = output[0].imports.map(fileName => `src/${fileName}`);
    this.preloadScripts.push(...scripts);
    return output[0].code;
  }

  async _compileHtml() {
    const resolvedSources = await this._resolveSourcesList([this.opts.html]);
    let htmlSrc = resolvedSources[0];

    if (this.opts.htmlReplacements) {
      for (const [key, value] of Object.entries(this.opts.htmlReplacements)) {
        htmlSrc = htmlSrc.replace(key, value);
      }
    }

    if (this.preloadScripts.length) {
      const preloads = this.preloadScripts.map(fileName =>
        `<link rel="preload" href="${fileName}" as="script" crossorigin="anonymous" />`
      ).join('\n');
      const endHeadIndex = htmlSrc.indexOf('</head>');
      if (endHeadIndex === -1) {
        throw new Error('HTML file needs a <head> element to inject preloads');
      }
      htmlSrc = htmlSrc.slice(0, endHeadIndex) + preloads + htmlSrc.slice(endHeadIndex);
    }

    return htmlSrc;
  }

  async _compileCss() {
    const resolvedSources = await this._resolveSourcesList(this.opts.stylesheets);
    return resolvedSources.join('\n');
  }

  async _compileJs() {
    // Current Lighthouse version as a global variable.
    const versionJs = `window.LH_CURRENT_VERSION = '${lighthousePackage.version}';`;

    const contents = [
      `"use strict";`,
      versionJs,
      ...await this._resolveSourcesList(this.opts.javascripts),
    ];
    if (process.env.DEBUG) return contents.join('\n');

    const options = {
      output: {preamble: license}, // Insert license at top.
    };
    const uglified = await terser.minify(contents, options);
    if (!uglified.code) {
      throw new Error('terser returned no result');
    }

    return uglified.code;
  }
}

module.exports = GhPagesApp;
