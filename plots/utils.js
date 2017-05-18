/**
 * @license
 * Copyright 2017 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';

const fs = require('fs');
const path = require('path');

/**
 * @param {string} path
 * @return {boolean}
 */
function isDir(path) {
  try {
    return fs.statSync(path).isDirectory();
  } catch (error) {
    return false;
  }
}

/**
 * @param {string} path
 * @return {boolean}
 */
function isFile(path) {
  try {
    return fs.statSync(path).isFile();
  } catch (error) {
    return false;
  }
}

/**
 * @param {!Array} array
 */
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

/**
 * @param {string} filePath
 */
function removeRecursive(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      if (isFile(filePath)) {
        fs.unlinkSync(filePath);
        return;
      }
      const files = fs.readdirSync(filePath);
      for (let i = 0; i < files.length; i++) {
        const childPath = path.resolve(filePath, files[i]);
        if (isDir(childPath))
          removeRecursive(childPath);
        else
          fs.unlinkSync(childPath);
      }
      fs.rmdirSync(filePath);
    }
  } catch (error) {
    throw new Error(`Received an error: [${error}] while trying to remove: ${filePath}`);
  }
}

module.exports = {
  isDir,
  isFile,
  shuffle,
  removeRecursive,
};
