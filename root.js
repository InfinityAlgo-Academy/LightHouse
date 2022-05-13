/**
 * @license Copyright 2021 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

import fs from 'fs';
import path from 'path';
import {getModuleDirectory} from './lighthouse-core/scripts/esm-utils.js';

const pkg = JSON.parse(fs.readFileSync('./package.json', 'utf-8'));

const LH_ROOT = getModuleDirectory(import.meta);
const lighthouseVersion = pkg.version;

/**
 * Return parsed json object.
 * Resolves path relative to importMeta.url (if provided) or LH_ROOT (if not provided).
 * @param {string} filePath Can be an absolute or relative path.
 * @param {ImportMeta=} importMeta
 */
function readJson(filePath, importMeta) {
  const dir = importMeta ? getModuleDirectory(importMeta) : LH_ROOT;
  filePath = path.resolve(dir, filePath);
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

export {
  LH_ROOT,
  lighthouseVersion,
  readJson,
};
