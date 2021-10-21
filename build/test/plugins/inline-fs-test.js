/**
 * @license Copyright 2021 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* eslint-env jest */

const fs = require('fs');
const path = require('path');
const {inlineFs} = require('../../plugins/inline-fs.js');

const {LH_ROOT} = require('../../../root.js');
const filepath = `${LH_ROOT}/lighthouse-core/index.js`;

describe('inline-fs', () => {
  const tmpPath = `${LH_ROOT}/.tmp/inline-fs/test.txt`;
  const tmpDir = path.dirname(tmpPath);

  beforeAll(() => {
    fs.mkdirSync(tmpDir, {recursive: true});
  });

  afterAll(() => {
    fs.unlinkSync(tmpPath);
  });

  describe('supported syntax', () => {
    it('returns null for content with no fs calls', async () => {
      const content = 'const val = 1;';
      const result = await inlineFs(content, filepath);
      expect(result).toEqual({
        code: null,
        warnings: [],
      });
    });

    it('returns null for non-call references to fs methods', async () => {
      const content = 'const val = fs.readFileSync ? 1 : 2;';
      const result = await inlineFs(content, filepath);
      expect(result).toEqual({
        code: null,
        warnings: [],
      });
    });

    it('evaluates an fs.readFileSync call and inlines the contents', async () => {
      fs.writeFileSync(tmpPath, 'template literal text content');

      const content = `const myTextContent = fs.readFileSync('${tmpPath}', 'utf8');`;
      const result = await inlineFs(content, filepath);
      expect(result).toEqual({
        code: `const myTextContent = "template literal text content";`,
        warnings: [],
      });
    });

    it('warns and skips unsupported construct but inlines subsequent fs method calls', async () => {
      fs.writeFileSync(tmpPath, 'template literal text content');

      // eslint-disable-next-line max-len
      const content = `const myContent = fs.readFileSync(filePathVar, 'utf8');\nconst replacedContent = fs.readFileSync('${tmpPath}', 'utf8');`;
      const result = await inlineFs(content, filepath);
      expect(result).toEqual({
        // eslint-disable-next-line max-len
        code: `const myContent = fs.readFileSync(filePathVar, 'utf8');\nconst replacedContent = "template literal text content";`,
        warnings: [{
          text: `unsupported node: Identifier`,
          location: {
            file: filepath,
            line: 1,
            column: 34,
          },
        }],
      });
    });

    // TODO: this will work
    it('skips `__dirname`', async () => {
      fs.writeFileSync(tmpPath, '__dirname text content');

      const dirnamePath = `__dirname + '/../.tmp/inline-fs/test.txt'`;
      const content = `const myTextContent = fs.readFileSync(${dirnamePath}, 'utf8');`;
      const result = await inlineFs(content, filepath);
      expect(result).toEqual({
        code: null,
        warnings: [{
          text: `unsupported node: BinaryExpression`,
          location: {
            file: filepath,
            line: 1,
            column: 38,
          },
        }],
      });
    });

    describe('fs.readFileSync', () => {
      it('inlines content with quotes', async () => {
        fs.writeFileSync(tmpPath, `"quoted", and an unbalanced quote: "`);
        const content = `const myTextContent = fs.readFileSync('${tmpPath}', 'utf8');`;
        const result = await inlineFs(content, filepath);
        expect(result).toEqual({
          code: `const myTextContent = "\\"quoted\\", and an unbalanced quote: \\"";`,
          warnings: [],
        });
      });

      it('inlines multiple fs.readFileSync calls', async () => {
        fs.writeFileSync(tmpPath, 'some text content');
        // const content = `fs.readFileSync('${tmpPath}', 'utf8')fs.readFileSync(require.resolve('${tmpPath}'), 'utf8')`;
        // eslint-disable-next-line max-len
        const content = `fs.readFileSync('${tmpPath}', 'utf8')fs.readFileSync('${tmpPath}', 'utf8')`;
        const result = await inlineFs(content, filepath);
        expect(result).toEqual({
          code: `"some text content""some text content"`,
          warnings: [],
        });
      });

      it('inlines content from fs.readFileSync with variants of utf8 options', async () => {
        fs.writeFileSync(tmpPath, 'some text content');

        const utf8Variants = [
          `'utf8'`,
          `'utf-8'`,
          `{encoding: 'utf8'}`,
          `{encoding: 'utf-8'}`,
          `{encoding: 'utf8', nonsense: 'flag'}`,
        ];

        for (const opts of utf8Variants) {
          const content = `const myTextContent = fs.readFileSync('${tmpPath}', ${opts});`;
          const result = await inlineFs(content, filepath);
          expect(result).toEqual({
            code: `const myTextContent = "some text content";`,
            warnings: [],
          });
        }
      });

      it('warns and skips when missing encoding', async () => {
        const content = `const myTextContent = fs.readFileSync('${tmpPath}');`;
        const result = await inlineFs(content, filepath);
        expect(result).toEqual({
          code: null,
          warnings: [{
            text: 'fs.readFileSync() must have two arguments',
            location: {
              file: filepath,
              line: 1,
              column: 22,
            },
          }],
        });
      });

      it('warns and skips on unsupported encoding', async () => {
        const content = `const myTextContent = fs.readFileSync('${tmpPath}', 'binary');`;
        const result = await inlineFs(content, filepath);
        expect(result).toEqual({
          code: null,
          warnings: [{
            text: 'only utf8 readFileSync is supported',
            location: {
              file: filepath,
              line: 1,
              column: 105,
            },
          }],
        });
      });
    });

    describe('fs.readdirSync', () => {
      it('inlines content from fs.readdirSync calls', async () => {
        fs.writeFileSync(tmpPath, 'text');
        const content = `const files = fs.readdirSync('${tmpDir}');`;
        const result = await inlineFs(content, filepath);
        const tmpFilename = path.basename(tmpPath);
        expect(result).toEqual({
          code: `const files = ["${tmpFilename}"];`,
          warnings: [],
        });
      });

      it('handles methods chained on fs.readdirSync result', async () => {
        fs.writeFileSync(tmpPath, 'text');
        // eslint-disable-next-line max-len
        const content = `const files = [...fs.readdirSync('${tmpDir}'), ...fs.readdirSync('${tmpDir}').map(f => \`metrics/\${f}\`)]`;
        const result = await inlineFs(content, filepath);
        // eslint-disable-next-line max-len
        expect(result).toEqual({
          code: 'const files = [...["test.txt"], ...["test.txt"].map(f => `metrics/${f}`)]',
          warnings: [],
        });
      });

      it('inlines content from fs.readdirSync with variants of utf8 options', async () => {
        fs.writeFileSync(tmpPath, 'text');
        const tmpFilename = path.basename(tmpPath);

        const utf8Variants = [
          '', // `options` are optional for readdirSync, so include missing opts.
          `'utf8'`,
          `'utf-8'`,
          `{encoding: 'utf8'}`,
          `{encoding: 'utf-8'}`,
          `{encoding: 'utf8', nonsense: 'flag'}`,
        ];

        for (const opts of utf8Variants) {
          // Trailing comma has no effect in missing opts case.
          const content = `const files = fs.readdirSync('${tmpDir}', ${opts});`;
          const result = await inlineFs(content, filepath);
          expect(result).toEqual({
            code: `const files = ["${tmpFilename}"];`,
            warnings: [],
          });
        }
      });

      it('warns and skips on unsupported encoding', async () => {
        const content = `const files = fs.readdirSync('${tmpDir}', 'binary');`;
        const result = await inlineFs(content, filepath);
        expect(result).toEqual({
          code: null,
          warnings: [{
            text: 'only utf8 readdirSync is supported',
            location: {
              file: filepath,
              line: 1,
              column: 87,
            },
          }],
        });
      });

      it('throws when trying to fs.readdirSync a non-existent directory', async () => {
        const nonsenseDir = `${LH_ROOT}/.tmp/nonsense-path/`;
        const content = `const files = fs.readdirSync('${nonsenseDir}');`;
        const result = await inlineFs(content, filepath);
        expect(result).toEqual({
          code: null,
          warnings: [{
            // eslint-disable-next-line max-len
            text: expect.stringMatching(/^could not inline fs\.readdirSync.+ENOENT.+nonsense-path\/'$/),
            location: {
              file: filepath,
              line: 1,
              column: 14,
            },
          }],
        });
      });
    });
  });
});
