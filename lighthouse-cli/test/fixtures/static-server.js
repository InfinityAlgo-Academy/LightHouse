/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* eslint-disable no-console */

const http = require('http');
const path = require('path');
const fs = require('fs');
const parseQueryString = require('querystring').parse;
const parseURL = require('url').parse;

const lhRootDirPath = path.join(__dirname, '../../../');

function requestHandler(request, response) {
  const requestUrl = parseURL(request.url);
  const filePath = requestUrl.pathname;
  const queryString = requestUrl.search && parseQueryString(requestUrl.search.slice(1));
  let absoluteFilePath = path.join(__dirname, filePath);

  if (filePath === '/zone.js') {
    // evaluateAsync previously had a bug that LH would fail if a page polyfilled Promise.
    // We bring in an aggressive Promise polyfill (zone) to ensure we don't still fail.
    const zonePath = '../../../node_modules/zone.js';
    absoluteFilePath = path.join(__dirname, `${zonePath}/dist/zone.js`);
  }

  // Disallow file requests outside of LH folder
  if (!path.parse(absoluteFilePath).dir.startsWith(lhRootDirPath)) {
    return readFileCallback(new Error('Disallowed path'));
  }

  fs.exists(absoluteFilePath, fsExistsCallback);

  function fsExistsCallback(fileExists) {
    if (!fileExists) {
      return sendResponse(404, `404 - File not found. ${absoluteFilePath}`);
    }
    fs.readFile(absoluteFilePath, 'binary', readFileCallback);
  }

  function readFileCallback(err, file) {
    if (err) {
      console.error(`Unable to read local file ${absoluteFilePath}:`, err);
      return sendResponse(500, '500 - Internal Server Error');
    }
    sendResponse(200, file);
  }

  function sendResponse(statusCode, data) {
    let headers;
    if (filePath.endsWith('.js')) {
      headers = {'Content-Type': 'text/javascript'};
    } else if (filePath.endsWith('.css')) {
      headers = {'Content-Type': 'text/css'};
    } else if (filePath.endsWith('.svg')) {
      headers = {'Content-Type': 'image/svg+xml'};
    }

    let delay = 0;
    if (queryString) {
      // set document status-code
      if (typeof queryString.status_code !== 'undefined') {
        statusCode = parseInt(queryString.status_code, 10);
      }

      // set delay of request when present
      if (typeof queryString.delay !== 'undefined') {
        delay = parseInt(queryString.delay, 10) || 2000;
      }

      // redirect url to new url if present
      if (typeof queryString.redirect !== 'undefined') {
        return setTimeout(sendRedirect, delay, queryString.redirect);
      }
    }

    response.writeHead(statusCode, headers);

    // Delay the response
    if (delay > 0) {
      return setTimeout(finishResponse, delay, data);
    }

    finishResponse(data);
  }

  function sendRedirect(url) {
    const headers = {
      Location: url,
    };
    response.writeHead(302, headers);
    response.end();
  }

  function finishResponse(data) {
    response.write(data, 'binary');
    response.end();
  }
}

const serverForOnline = http.createServer(requestHandler);
const serverForOffline = http.createServer(requestHandler);

serverForOnline.on('error', e => console.error(e.code, e));
serverForOffline.on('error', e => console.error(e.code, e));

// Listen
serverForOnline.listen(10200, 'localhost');
serverForOffline.listen(10503, 'localhost');
