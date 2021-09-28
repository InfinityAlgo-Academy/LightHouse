/**
 * @license Copyright 2020 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

import fs from 'fs';
import crypto from 'crypto';

import {LH_ROOT} from '../../../root.js';

const scriptDir = `${LH_ROOT}/lighthouse-core/scripts/legacy-javascript`;

export function makeHash() {
  return crypto
    .createHash('sha256')
    .update(fs.readFileSync(`${scriptDir}/yarn.lock`, 'utf8'))
    .update(fs.readFileSync(`${scriptDir}/run.js`, 'utf8'))
    .update(fs.readFileSync(`${scriptDir}/main.js`, 'utf8'))
    /* eslint-disable max-len */
    .update(fs.readFileSync(`${LH_ROOT}/lighthouse-core/audits/byte-efficiency/legacy-javascript.js`, 'utf8'))
    /* eslint-enable max-len */
    .digest('hex');
}
