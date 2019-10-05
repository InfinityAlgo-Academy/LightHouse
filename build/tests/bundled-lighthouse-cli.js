/**
 * @license Copyright 2019 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const mkdirp = require('mkdirp');
const rimraf = require('rimraf');
const ChromeProtocol = require('../../lighthouse-core/gather/connections/cri.js');

const LH_ROOT = path.resolve(__dirname, '../..');
const corePath = `${LH_ROOT}/lighthouse-core/index.js`;

// Oh yeahhhhh this works. Think of this as `requireBundled('../../lighthouse-core/index.js')`.
const lighthouse = (function getLighthouseCoreBundled() {
  // The eval will assign to `require`. Normally, that would be the require on the global object.
  // This `let` protects the global reference to the native require.
  // Doesn't need to have any value, but for good measure define a function that explicitly forbids
  // its own usage.
  /* eslint-disable-next-line */
  let require = () => {
    throw new Error('illegal require');
  };

  const lighthouseBundledCode = fs.readFileSync('dist/test-bundle.js', 'utf-8')
    // Some modules are impossible to bundle. So we cheat by leaning on globalThis.
    .replace('new ChromeProtocol', 'new globalThis.ChromeProtocol')
    // Needed for asset-saver.js.
    .replace(/mkdirp\./g, 'globalThis.mkdirp.')
    .replace(/rimraf\./g, 'globalThis.rimraf.')
    .replace(/fs\.(writeFileSync|createWriteStream)/g, 'globalThis.$&');

  /* eslint-disable no-undef */
  // @ts-ignore
  globalThis.ChromeProtocol = ChromeProtocol;
  // @ts-ignore
  globalThis.mkdirp = mkdirp;
  // @ts-ignore
  globalThis.rimraf = rimraf;
  // @ts-ignore
  globalThis.fs = fs;
  /*  eslint-enable no-undef */

  const bundledLighthouseRequire = eval(lighthouseBundledCode);

  // Find the lighthouse module.
  /** @type {import('../../lighthouse-core/index.js')} */
  let lighthouse;
  for (let i = 1; i < 1000; i++) {
    const module = bundledLighthouseRequire(i);
    if (module.name === 'lighthouse') {
      lighthouse = module;
      break;
    }
  }

  // @ts-ignore
  if (!lighthouse) throw new Error('could not find lighthouse module');

  return lighthouse;
})();

// Shim the core module with the bundled code.

// @ts-ignore
lighthouse.__PATCHED__ = true;
require.cache[corePath] = {
  exports: lighthouse,
};

// @ts-ignore
if (!require('../../lighthouse-core/index.js').__PATCHED__) {
  throw new Error('error patching core module');
}

// Kick off the CLI.
require('../../lighthouse-cli/index.js');
