/**
 * @license Copyright 2019 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const stream = require('stream');
const terser = require('terser');

/**
 * Minifies file which are read by fs.readFileSync (brfs)
 *
 * @param {string} file
 */
function minifyFileTransform(file) {
  // Don't transform files that aren't javascript.
  if (!file.endsWith('.js')) {
    return new stream.Transform({
      transform(chunk, enc, next) {
        this.push(chunk);
        next();
      },
    });
  }

  // Collect all the javascript and minify *at the end* once we have the complete file.
  let code = '';
  return new stream.Transform({
    transform(chunk, enc, next) {
      code += chunk.toString();
      next();
    },
    // TODO: when min is Node 16, can just make this function async.
    final(next) {
      terser.minify(code, {ecma: 2019}).then(result => {
        if (result.code) {
          const saved = code.length - result.code.length;
          // eslint-disable-next-line no-console
          console.log(`minifying ${file} saved ${saved / 1000} KB`);
          this.push(result.code);
        }

        next();
      }).catch(err => {
        // eslint-disable-next-line no-console
        console.error(err);
        process.exit(1);
      });
    },
  });
}

module.exports = {
  minifyFileTransform,
};
