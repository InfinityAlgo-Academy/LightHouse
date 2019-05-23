#!/usr/bin/env node
/**
 * @license Copyright 2019 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const fs = require('fs');
const path = require('path');

/** @param {string} dir */
function rewriteDirectory(dir) {
  for (const name of fs.readdirSync(dir)) {
    const fullPath = path.join(dir, name);

    if (fs.statSync(fullPath).isDirectory()) {
      rewriteDirectory(fullPath);
    } else if (name.endsWith('.js')) {
      let contents = fs.readFileSync(fullPath, 'utf8');
      const requireStatements = contents.match(/require\(.*\);\n/g) || [];

      for (const stmt of requireStatements) {
        const [_, file] = stmt.match(/require\('(.*)'\);/) || ['', ''];
        if (!file) continue;
        if (!file.startsWith('.')) continue;
        if (file.endsWith('/')) continue;
        if (file.endsWith('.js')) continue;
        if (file.endsWith('.json')) continue;
        const fullPathOfDep = path.resolve(dir, file);
        if (!fs.existsSync(fullPathOfDep)) {
          console.warn(`Uh-oh! Cannot find dependency "${fullPathOfDep}" in ${name}`); // eslint-disable-line no-console
          continue;
        }

        console.log(`Fixing "${file}" in ${name}`); // eslint-disable-line no-console
        contents = contents.replace(`require('${file}');`, `require('${file}.js');`);
      }

      fs.writeFileSync(fullPath, contents);
    }
  }
}

rewriteDirectory(path.join(__dirname, '../../lighthouse-core'));
rewriteDirectory(path.join(__dirname, '../../lighthouse-cli'));
rewriteDirectory(path.join(__dirname, '../../build'));
