/**
 * @license Copyright 2021 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const CspXss = require('../../audits/csp-xss.js');
const networkRecordsToDevtoolsLog = require('../network-records-to-devtools-log.js');

/* eslint-env jest */

it('audit basic header', async () => {
  const artifacts = {
    URL: 'https://example.com',
    MetaElements: [],
    devtoolsLogs: {
      defaultPass: networkRecordsToDevtoolsLog([
        {
          url: 'https://example.com',
          responseHeaders: [
            {name: 'Content-Security-Policy', value: `script-src 'nonce-12345678'; foo-bar 'none'`},
          ],
        },
      ]),
    },
  };
  const results = await CspXss.audit(artifacts, {computedCache: new Map()});
  expect(results.details.items).toMatchObject(
    [
      {
        description: {
          value:
            'script-src \'nonce-12345678\'; foo-bar \'none\'',
        },
        subItems: {
          type: 'subitems',
          items: [
            {
              description: {
                formattedDefault: 'Unknown CSP directive.',
              },
              directive: 'foo-bar',
            },
          ],
        },
      },
      {
        description: {
          formattedDefault:
            'Consider setting object-src to \'none\' to prevent ' +
            'the injection of plugins that execute unsafe scripts.',
        },
        directive: 'object-src',
      },
      {
        description: {
          formattedDefault:
            'Missing base-uri allows the injection of base tags. ' +
            'They can be used to set the base URL for all relative (script) URLs to ' +
            'an attacker controlled domain. Can you set it to \'none\' or \'self\'?',
        },
        directive: 'base-uri',
      },
      {
        description: {
          formattedDefault:
            'This CSP does not configure a reporting destination. ' +
            'This makes it difficult to maintain the CSP over ' +
            'time and monitor for any breakages.',
        },
        directive: 'report-uri',
      },
      {
        description: {
          formattedDefault:
            'Consider adding \'unsafe-inline\' (ignored by browsers supporting ' +
            'nonces/hashes) to be backward compatible with older browsers.',
        },
        directive: 'script-src',
      },
    ]
  );
});

it('adds result when using meta tag', async () => {
  const artifacts = {
    URL: 'https://example.com',
    MetaElements: [
      {
        httpEquiv: 'Content-Security-Policy',
        content: `base-uri 'none'`,
      },
    ],
    devtoolsLogs: {
      defaultPass: networkRecordsToDevtoolsLog([
        {
          url: 'https://example.com',
          responseHeaders: [
            {name: 'Content-Security-Policy', value: `script-src 'none'; object-src 'none'; report-uri https://example.com`},
          ],
        },
      ]),
    },
  };
  const results = await CspXss.audit(artifacts, {computedCache: new Map()});
  expect(results.details.items).toHaveLength(3);
  expect(results.details.items[2]).toMatchObject(
    {
      description: {
        formattedDefault:
          'The page contains a CSP defined in a <meta> tag. ' +
          'It is not recommended to use a CSP this way, ' +
          'consider defining the CSP in an HTTP header.',
      },
      directive: undefined,
    }
  );
});

describe('getRawCsps', () => {
  it('basic case', async () => {
    const artifacts = {
      URL: 'https://example.com',
      MetaElements: [
        {
          httpEquiv: 'Content-Security-Policy',
          content: `default-src 'none'`,
        },
      ],
      devtoolsLogs: {
        defaultPass: networkRecordsToDevtoolsLog([
          {
            url: 'https://example.com',
            responseHeaders: [
              {
                name: 'Content-Security-Policy',
                value: `script-src 'none'`,
              },
              {
                name: 'Content-Security-Policy',
                value: `object-src 'none'`,
              },
            ],
          },
        ]),
      },
    };
    const {cspHeaders, cspMetaTags}
      = await CspXss.getRawCsps(artifacts, {computedCache: new Map()});
    expect(cspHeaders).toEqual([
      `script-src 'none'`,
      `object-src 'none'`,
    ]);
    expect(cspMetaTags).toEqual([
      `default-src 'none'`,
    ]);
  });

  it('split on comma', async () => {
    const artifacts = {
      URL: 'https://example.com',
      MetaElements: [],
      devtoolsLogs: {
        defaultPass: networkRecordsToDevtoolsLog([
          {
            url: 'https://example.com',
            responseHeaders: [
              {
                name: 'Content-Security-Policy',
                value: `script-src 'none',default-src 'none'`,
              },
              {
                name: 'Content-Security-Policy',
                value: `object-src 'none'`,
              },
            ],
          },
        ]),
      },
    };
    const {cspHeaders, cspMetaTags}
      = await CspXss.getRawCsps(artifacts, {computedCache: new Map()});
    expect(cspHeaders).toEqual([
      `script-src 'none'`,
      `default-src 'none'`,
      `object-src 'none'`,
    ]);
    expect(cspMetaTags).toEqual([]);
  });

  it('ignore if empty', async () => {
    const artifacts = {
      URL: 'https://example.com',
      MetaElements: [],
      devtoolsLogs: {
        defaultPass: networkRecordsToDevtoolsLog([
          {
            url: 'https://example.com',
            responseHeaders: [
              {
                name: 'Content-Security-Policy',
                value: ``,
              },
              {
                name: 'Content-Security-Policy',
                value: `object-src 'none'`,
              },
            ],
          },
        ]),
      },
    };
    const {cspHeaders, cspMetaTags}
      = await CspXss.getRawCsps(artifacts, {computedCache: new Map()});
    expect(cspHeaders).toEqual([
      `object-src 'none'`,
    ]);
    expect(cspMetaTags).toEqual([]);
  });

  it('ignore if only whitespace', async () => {
    const artifacts = {
      URL: 'https://example.com',
      MetaElements: [],
      devtoolsLogs: {
        defaultPass: networkRecordsToDevtoolsLog([
          {
            url: 'https://example.com',
            responseHeaders: [
              {
                name: 'Content-Security-Policy',
                value: '   \t',
              },
              {
                name: 'Content-Security-Policy',
                value: `object-src 'none'`,
              },
            ],
          },
        ]),
      },
    };
    const {cspHeaders, cspMetaTags}
      = await CspXss.getRawCsps(artifacts, {computedCache: new Map()});
    expect(cspHeaders).toEqual([
      `object-src 'none'`,
    ]);
    expect(cspMetaTags).toEqual([]);
  });
});

describe('collectSyntaxResults', () => {
  it('single syntax error', () => {
    const results = CspXss.collectSyntaxResults([`foo-bar 'none'`]);
    expect(results).toMatchObject([
      {
        description: {
          value: 'foo-bar \'none\'',
        },
        subItems: {
          type: 'subitems',
          items: [
            {
              description: {
                formattedDefault: 'Unknown CSP directive.',
              },
              directive: 'foo-bar',
            },
          ],
        },
      },
    ]);
  });

  it('no syntax errors', () => {
    const results = CspXss.collectSyntaxResults([
      `script-src 'none'`,
      `object-src 'none'`,
    ]);
    expect(results).toMatchObject([
      {
        description: {
          value: 'script-src \'none\'',
        },
        subItems: {
          type: 'subitems',
          items: [
            {
              description: {
                formattedDefault: 'No syntax errors.',
              },
            },
          ],
        },
      },
      {
        description: {
          value: 'object-src \'none\'',
        },
        subItems: {
          type: 'subitems',
          items: [
            {
              description: {
                formattedDefault: 'No syntax errors.',
              },
            },
          ],
        },
      },
    ]);
  });

  it('multiple syntax errors', () => {
    const results = CspXss.collectSyntaxResults([`foo-bar 'asdf'`]);
    expect(results).toMatchObject([
      {
        description: {
          value: 'foo-bar \'asdf\'',
        },
        subItems: {
          type: 'subitems',
          items: [
            {
              description: {
                formattedDefault: 'Unknown CSP directive.',
              },
              directive: 'foo-bar',
            },
            {
              description: {
                formattedDefault: '\'asdf\' seems to be an invalid keyword.',
              },
              directive: 'foo-bar',
            },
          ],
        },
      },
    ]);
  });

  it('multiple CSPs', () => {
    const results = CspXss.collectSyntaxResults([`foo-bar 'none'`, `object-src 'asdf'`]);
    expect(results).toMatchObject([
      {
        description: {
          value: 'foo-bar \'none\'',
        },
        subItems: {
          type: 'subitems',
          items: [
            {
              description: {
                formattedDefault: 'Unknown CSP directive.',
              },
              directive: 'foo-bar',
            },
          ],
        },
      },
      {
        description: {
          value: 'object-src \'asdf\'',
        },
        subItems: {
          type: 'subitems',
          items: [
            {
              description: {
                formattedDefault: '\'asdf\' seems to be an invalid keyword.',
              },
              directive: 'object-src',
            },
          ],
        },
      },
    ]);
  });
});

describe('collectVulnerabilityResults', () => {
  it('basic case', () => {
    const results = CspXss.collectVulnerabilityResults([`script-src 'nonce-12345678'`]);
    expect(results).toMatchObject(
      [
        {
          description: {
            formattedDefault:
              'Consider setting object-src to \'none\' to prevent ' +
              'the injection of plugins that execute unsafe scripts.',
          },
          directive: 'object-src',
        },
        {
          description: {
            formattedDefault:
              'Missing base-uri allows the injection of base tags. ' +
              'They can be used to set the base URL for all relative (script) URLs to ' +
              'an attacker controlled domain. Can you set it to \'none\' or \'self\'?',
          },
          directive: 'base-uri',
        },
      ]
    );
  });
});

describe('collectSuggestionResults', () => {
  it('basic case', () => {
    const results = CspXss.collectSuggestionResults([`script-src 'nonce-12345678'`]);
    expect(results).toMatchObject(
      [
        {
          description: {
            formattedDefault:
              'This CSP does not configure a reporting destination. ' +
              'This makes it difficult to maintain the CSP over ' +
              'time and monitor for any breakages.',
          },
          directive: 'report-uri',
        },
        {
          description: {
            formattedDefault:
              'Consider adding \'unsafe-inline\' (ignored by browsers supporting ' +
              'nonces/hashes) to be backward compatible with older browsers.',
          },
          directive: 'script-src',
        },
      ]
    );
  });
});
