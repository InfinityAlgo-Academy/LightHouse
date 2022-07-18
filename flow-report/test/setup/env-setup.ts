/**
 * @license Copyright 2021 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

import fs from 'fs';
import {MessageChannel} from 'worker_threads';

import jestMock from 'jest-mock';
import {JSDOM} from 'jsdom';
import * as preact from 'preact';

import {LH_ROOT} from '../../../root.js';

// These modules aren't imported correctly if these directories aren't defined to use ES modules.
// Similar to this, which was resolved but their fix didn't work for us:
// https://github.com/testing-library/preact-testing-library/issues/36#issuecomment-1136484478
fs.writeFileSync(`${LH_ROOT}/node_modules/@testing-library/preact/dist/esm/package.json`,
  '{"type": "module"}');
fs.writeFileSync(`${LH_ROOT}/node_modules/@testing-library/preact-hooks/src/package.json`,
  '{"type": "module"}');

const rootHooks = {
  beforeAll() {
    // @ts-expect-error
    global.React = preact;
  },
  beforeEach() {
    const {window} = new JSDOM(undefined, {
      url: 'file:///Users/example/report.html/',
    });
    global.window = window as any;
    global.document = window.document;
    global.location = window.location;
    global.self = global.window;

    // Use JSDOM types as necessary.
    global.Blob = window.Blob;
    global.HTMLInputElement = window.HTMLInputElement;

    // Functions not implemented in JSDOM.
    window.Element.prototype.scrollIntoView = jestMock.fn();
    global.self.matchMedia = jestMock.fn<any, any>(() => ({
      addListener: jestMock.fn(),
    }));

    // @ts-expect-error: for @testing-library/preact-hooks
    global.MessageChannel = MessageChannel;
  },
};

export {
  rootHooks,
};
