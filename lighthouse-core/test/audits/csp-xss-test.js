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
          formattedDefault:
            'Consider setting object-src to \'none\' to prevent ' +
            'the injection of plugins that execute JavaScript.',
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
            'This CSP policy does not configure a reporting destination. ' +
            'This makes it difficult to maintain the CSP policy over ' +
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
    ]
  );
});

describe('getRawCsps', () => {
  it.todo('basic case');
  it.todo('split on comma');
  it.todo('ignore if empty');
  it.todo('ignore if only whitespace');
});

describe('collectSyntaxResults', () => {
  it('single syntax error', () => {
    const rawCsp = `foo-bar 'none'`;
    const results = CspXss.collectSyntaxResults([rawCsp]);
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

  it('multiple syntax errors', () => {
    const rawCsp = `foo-bar 'asdf'`;
    const results = CspXss.collectSyntaxResults([rawCsp]);
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
    const results = CspXss.collectVulnerabilityResults([`script-src 'nonce-12345678'`], []);
    expect(results).toMatchObject(
      [
        {
          description: {
            formattedDefault:
              'Consider setting object-src to \'none\' to prevent ' +
              'the injection of plugins that execute JavaScript.',
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

  it('header and meta tag are treated the same', () => {
    const rawCsp = `script-src 'nonce-12345678'`;
    const resultsHeader = CspXss.collectVulnerabilityResults([rawCsp], []);
    const resultsMeta = CspXss.collectVulnerabilityResults([], [rawCsp]);
    expect(resultsHeader).toEqual(resultsMeta);
    expect(resultsHeader).toMatchObject(
      [
        {
          description: {
            formattedDefault:
              'Consider setting object-src to \'none\' to prevent ' +
              'the injection of plugins that execute JavaScript.',
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
    const rawCsp = `script-src 'nonce-12345678'`;
    const results = CspXss.collectSuggestionResults([rawCsp], []);
    expect(results).toMatchObject(
      [
        {
          description: {
            formattedDefault:
              'This CSP policy does not configure a reporting destination. ' +
              'This makes it difficult to maintain the CSP policy over ' +
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

  it('includes syntax results', () => {
    const rawCsp = `script-src 'nonce-12345678'; foo-bar 'none'`;
    const results = CspXss.collectSuggestionResults([rawCsp], []);
    expect(results).toMatchObject(
      [
        {
          description: {
            formattedDefault:
              'This CSP policy does not configure a reporting destination. ' +
              'This makes it difficult to maintain the CSP policy over ' +
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
      ]
    );
  });

  it('adds result when using meta tag', () => {
    const rawCsp = `script-src 'nonce-12345678'`;
    const results = CspXss.collectSuggestionResults([], [rawCsp]);
    expect(results).toMatchObject(
      [
        {
          description: {
            formattedDefault:
              'This CSP policy does not configure a reporting destination. ' +
              'This makes it difficult to maintain the CSP policy over ' +
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
        {
          description: {
            formattedDefault:
              'The page contains a CSP defined in a <meta> tag. It is not recommended to ' +
              'use a CSP this way, consider defining the CSP in an HTTP header.',
          },
        },
      ]
    );
  });
});
