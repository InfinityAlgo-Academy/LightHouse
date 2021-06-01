/**
 * @license Copyright 2021 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* eslint-env jest */

const {
  getNetworkError,
  getInterstitialError,
  getPageLoadError,
  getNonHtmlError,
} = require('../../lib/navigation-error.js');
const NetworkRequest = require('../../lib/network-request.js');

const LoadFailureMode = {
  fatal: /** @type {'fatal'} */ ('fatal'),
  ignore: /** @type {'ignore'} */ ('ignore'),
  warn: /** @type {'warn'} */ ('warn'),
};

describe('#getNetworkError', () => {
  /**
   * @param {NetworkRequest=} mainRecord
   */
  function getAndExpectError(mainRecord) {
    const error = getNetworkError(mainRecord);
    if (!error) throw new Error('expected a network error');
    return error;
  }

  it('passes when the page is loaded', () => {
    const url = 'http://the-page.com';
    const mainRecord = new NetworkRequest();
    mainRecord.url = url;
    expect(getNetworkError(mainRecord)).toBeUndefined();
  });

  it('fails when page fails to load', () => {
    const url = 'http://the-page.com';
    const mainRecord = new NetworkRequest();
    mainRecord.url = url;
    mainRecord.failed = true;
    mainRecord.localizedFailDescription = 'foobar';
    const error = getAndExpectError(mainRecord);
    expect(error.message).toEqual('FAILED_DOCUMENT_REQUEST');
    expect(error.code).toEqual('FAILED_DOCUMENT_REQUEST');
    expect(error.friendlyMessage).toBeDisplayString(
      /^Lighthouse was unable to reliably load.*foobar/
    );
  });

  it('fails when page times out', () => {
    const error = getAndExpectError(undefined);
    expect(error.message).toEqual('NO_DOCUMENT_REQUEST');
    expect(error.code).toEqual('NO_DOCUMENT_REQUEST');
    expect(error.friendlyMessage).toBeDisplayString(/^Lighthouse was unable to reliably load/);
  });

  it('fails when page returns with a 404', () => {
    const url = 'http://the-page.com';
    const mainRecord = new NetworkRequest();
    mainRecord.url = url;
    mainRecord.statusCode = 404;
    const error = getAndExpectError(mainRecord);
    expect(error.message).toEqual('ERRORED_DOCUMENT_REQUEST');
    expect(error.code).toEqual('ERRORED_DOCUMENT_REQUEST');
    expect(error.friendlyMessage).toBeDisplayString(/^Lighthouse was unable to reliably load.*404/);
  });

  it('fails when page returns with a 500', () => {
    const url = 'http://the-page.com';
    const mainRecord = new NetworkRequest();
    mainRecord.url = url;
    mainRecord.statusCode = 500;
    const error = getAndExpectError(mainRecord);
    expect(error.message).toEqual('ERRORED_DOCUMENT_REQUEST');
    expect(error.code).toEqual('ERRORED_DOCUMENT_REQUEST');
    expect(error.friendlyMessage).toBeDisplayString(/^Lighthouse was unable to reliably load.*500/);
  });

  it('fails when page domain doesn\'t resolve', () => {
    const url = 'http://the-page.com';
    const mainRecord = new NetworkRequest();
    mainRecord.url = url;
    mainRecord.failed = true;
    mainRecord.localizedFailDescription = 'net::ERR_NAME_NOT_RESOLVED';
    const error = getAndExpectError(mainRecord);
    expect(error.message).toEqual('DNS_FAILURE');
    expect(error.code).toEqual('DNS_FAILURE');
    expect(error.friendlyMessage).toBeDisplayString(/^DNS servers could not resolve/);
  });
});

describe('#getInterstitialError', () => {
  /**
   * @param {NetworkRequest} mainRecord
   * @param {NetworkRequest[]} networkRecords
   */
  function getAndExpectError(mainRecord, networkRecords) {
    const error = getInterstitialError(mainRecord, networkRecords);
    if (!error) throw new Error('expected an interstitial error');
    return error;
  }

  it('passes when the page was not requested', () => {
    expect(getInterstitialError(undefined, [])).toBeUndefined();
  });

  it('passes when the page is loaded', () => {
    const url = 'http://the-page.com';
    const mainRecord = new NetworkRequest();
    mainRecord.url = url;
    expect(getInterstitialError(mainRecord, [mainRecord])).toBeUndefined();
  });

  it('passes when page fails to load normally', () => {
    const url = 'http://the-page.com';
    const mainRecord = new NetworkRequest();
    mainRecord.url = url;
    mainRecord.failed = true;
    mainRecord.localizedFailDescription = 'foobar';
    expect(getInterstitialError(mainRecord, [mainRecord])).toBeUndefined();
  });

  it('passes when page gets a generic interstitial but somehow also loads everything', () => {
    // This case, AFAIK, is impossible, but we'll err on the side of not tanking the run.
    const url = 'http://the-page.com';
    const mainRecord = new NetworkRequest();
    mainRecord.url = url;
    const interstitialRecord = new NetworkRequest();
    interstitialRecord.url = 'data:text/html;base64,abcdef';
    interstitialRecord.documentURL = 'chrome-error://chromewebdata/';
    const records = [mainRecord, interstitialRecord];
    expect(getInterstitialError(mainRecord, records)).toBeUndefined();
  });

  it('fails when page gets a generic interstitial', () => {
    const url = 'http://the-page.com';
    const mainRecord = new NetworkRequest();
    mainRecord.url = url;
    mainRecord.failed = true;
    mainRecord.localizedFailDescription = 'ERR_CONNECTION_RESET';
    const interstitialRecord = new NetworkRequest();
    interstitialRecord.url = 'data:text/html;base64,abcdef';
    interstitialRecord.documentURL = 'chrome-error://chromewebdata/';
    const records = [mainRecord, interstitialRecord];
    const error = getAndExpectError(mainRecord, records);
    expect(error.message).toEqual('CHROME_INTERSTITIAL_ERROR');
    expect(error.code).toEqual('CHROME_INTERSTITIAL_ERROR');
    expect(error.friendlyMessage).toBeDisplayString(/^Chrome prevented/);
  });

  it('fails when page gets a security interstitial', () => {
    const url = 'http://the-page.com';
    const mainRecord = new NetworkRequest();
    mainRecord.url = url;
    mainRecord.failed = true;
    mainRecord.localizedFailDescription = 'net::ERR_CERT_COMMON_NAME_INVALID';
    const interstitialRecord = new NetworkRequest();
    interstitialRecord.url = 'data:text/html;base64,abcdef';
    interstitialRecord.documentURL = 'chrome-error://chromewebdata/';
    const records = [mainRecord, interstitialRecord];
    const error = getAndExpectError(mainRecord, records);
    expect(error.message).toEqual('INSECURE_DOCUMENT_REQUEST');
    expect(error.code).toEqual('INSECURE_DOCUMENT_REQUEST');
    expect(error.friendlyMessage).toBeDisplayString(/valid security certificate/);
    expect(error.friendlyMessage).toBeDisplayString(/net::ERR_CERT_COMMON_NAME_INVALID/);
  });

  it('passes when page iframe gets a generic interstitial', () => {
    const url = 'http://the-page.com';
    const mainRecord = new NetworkRequest();
    mainRecord.url = url;
    mainRecord.failed = false;
    const iframeRecord = new NetworkRequest();
    iframeRecord.failed = true;
    iframeRecord.url = 'https://the-ad.com';
    iframeRecord.documentURL = 'https://the-ad.com';
    const interstitialRecord = new NetworkRequest();
    interstitialRecord.url = 'data:text/html;base64,abcdef';
    interstitialRecord.documentURL = 'chrome-error://chromewebdata/';
    const records = [mainRecord, iframeRecord, interstitialRecord];
    const error = getInterstitialError(mainRecord, records);
    expect(error).toBeUndefined();
  });
});

describe('#getNonHtmlError', () => {
  /**
   * @param {NetworkRequest} mainRecord
   */
  function getAndExpectError(mainRecord) {
    const error = getNonHtmlError(mainRecord);
    if (!error) throw new Error('expected a non-HTML error');
    return error;
  }

  it('passes when the page was not requested', () => {
    expect(getNonHtmlError(undefined)).toBeUndefined();
  });

  it('passes when the page is of MIME type text/html', () => {
    const url = 'http://the-page.com';
    const mainRecord = new NetworkRequest();
    const mimeType = 'text/html';
    mainRecord.url = url;
    mainRecord.mimeType = mimeType;
    expect(getNonHtmlError(mainRecord)).toBeUndefined();
  });

  it('fails when the page is not of MIME type text/html', () => {
    const url = 'http://the-page.com';
    const mimeType = 'application/xml';
    const mainRecord = new NetworkRequest();
    mainRecord.url = url;
    mainRecord.mimeType = mimeType;
    const error = getAndExpectError(mainRecord);
    expect(error.message).toEqual('NOT_HTML');
    expect(error.code).toEqual('NOT_HTML');
    expect(error.friendlyMessage).toBeDisplayString(/is not HTML \(served as/);
  });
});

describe('#getPageLoadError', () => {
  /**
   * @param {LH.LighthouseError|undefined} navigationError
   * @param {Parameters<typeof getPageLoadError>[1]} context
   */
  function getAndExpectError(navigationError, context) {
    const error = getPageLoadError(navigationError, context);
    if (!error) throw new Error('expected a page load error');
    return error;
  }

  /** @type {LH.LighthouseError} */
  let navigationError;

  beforeEach(() => {
    navigationError = /** @type {LH.LighthouseError} */ (new Error('NAVIGATION_ERROR'));
  });

  it('passes when the page is loaded', () => {
    const mainRecord = new NetworkRequest();
    const context = {
      url: 'http://the-page.com',
      networkRecords: [mainRecord],
      loadFailureMode: LoadFailureMode.fatal,
    };
    mainRecord.url = context.url;
    mainRecord.mimeType = 'text/html';
    const error = getPageLoadError(undefined, context);
    expect(error).toBeUndefined();
  });

  it('passes when the page is loaded, ignoring any fragment', () => {
    const mainRecord = new NetworkRequest();
    const context = {
      url: 'http://example.com/#/page/list',
      networkRecords: [mainRecord],
      loadFailureMode: LoadFailureMode.fatal,
    };
    mainRecord.url = 'http://example.com';
    mainRecord.mimeType = 'text/html';
    const error = getPageLoadError(undefined, context);
    expect(error).toBeUndefined();
  });

  it('passes when the page is expected to fail', () => {
    const mainRecord = new NetworkRequest();
    const context = {
      url: 'http://the-page.com',
      networkRecords: [mainRecord],
      loadFailureMode: LoadFailureMode.ignore,
    };
    mainRecord.url = context.url;
    mainRecord.failed = true;

    const error = getPageLoadError(undefined, context);
    expect(error).toBeUndefined();
  });

  it('passes when the page redirects to MIME type text/html', () => {
    const mainRecord = new NetworkRequest();
    const context = {
      url: 'http://the-page.com',
      networkRecords: [mainRecord],
      loadFailureMode: LoadFailureMode.fatal,
    };
    const finalRecord = new NetworkRequest();

    mainRecord.url = context.url;
    mainRecord.redirectDestination = finalRecord;
    finalRecord.url = 'http://the-redirected-page.com';
    finalRecord.mimeType = 'text/html';

    const error = getPageLoadError(undefined, context);
    expect(error).toBeUndefined();
  });

  it('fails with interstitial error first', () => {
    const mainRecord = new NetworkRequest();
    const interstitialRecord = new NetworkRequest();
    const context = {
      url: 'http://the-page.com',
      networkRecords: [mainRecord, interstitialRecord],
      loadFailureMode: LoadFailureMode.fatal,
    };

    mainRecord.url = context.url;
    mainRecord.failed = true;
    interstitialRecord.url = 'data:text/html;base64,abcdef';
    interstitialRecord.documentURL = 'chrome-error://chromewebdata/';

    const error = getAndExpectError(navigationError, context);
    expect(error.message).toEqual('CHROME_INTERSTITIAL_ERROR');
  });

  it('fails with network error second', () => {
    const mainRecord = new NetworkRequest();
    const context = {
      url: 'http://the-page.com',
      networkRecords: [mainRecord],
      loadFailureMode: LoadFailureMode.fatal,
    };

    mainRecord.url = context.url;
    mainRecord.failed = true;

    const error = getAndExpectError(navigationError, context);
    expect(error.message).toEqual('FAILED_DOCUMENT_REQUEST');
  });

  it('fails with non-HTML error third', () => {
    const mainRecord = new NetworkRequest();
    const context = {
      url: 'http://the-page.com',
      networkRecords: [mainRecord],
      loadFailureMode: LoadFailureMode.fatal,
    };

    mainRecord.url = context.url;
    mainRecord.mimeType = 'application/xml';

    const error = getAndExpectError(navigationError, context);
    expect(error.message).toEqual('NOT_HTML');
  });

  it('fails with nav error last', () => {
    const mainRecord = new NetworkRequest();
    const context = {
      url: 'http://the-page.com',
      networkRecords: [mainRecord],
      loadFailureMode: LoadFailureMode.fatal,
    };

    mainRecord.url = context.url;
    mainRecord.mimeType = 'text/html';

    const error = getAndExpectError(navigationError, context);
    expect(error.message).toEqual('NAVIGATION_ERROR');
  });

  it('fails when loadFailureMode is warn', () => {
    const mainRecord = new NetworkRequest();
    const context = {
      url: 'http://the-page.com',
      networkRecords: [mainRecord],
      loadFailureMode: LoadFailureMode.warn,
    };

    mainRecord.url = context.url;
    mainRecord.mimeType = 'text/html';

    const error = getAndExpectError(navigationError, context);
    expect(error.message).toEqual('NAVIGATION_ERROR');
  });

  it('fails with non-HTML when redirect is not HTML', () => {
    const mainRecord = new NetworkRequest();
    const context = {
      url: 'http://the-page.com',
      networkRecords: [mainRecord],
      loadFailureMode: LoadFailureMode.fatal,
    };
    const finalRecord = new NetworkRequest();

    mainRecord.url = context.url;
    mainRecord.redirectDestination = finalRecord;
    finalRecord.url = 'http://the-redirected-page.com';

    const error = getAndExpectError(navigationError, context);
    expect(error.message).toEqual('NOT_HTML');
  });
});
