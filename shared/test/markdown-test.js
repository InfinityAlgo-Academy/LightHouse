/**
 * @license Copyright 2022 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

import {splitMarkdownCodeSpans, splitMarkdownLink} from '../markdown.js';

describe('markdown', () => {
  describe('#splitMarkdownCodeSpans', () => {
    it('handles strings with no backticks in them', () => {
      expect(splitMarkdownCodeSpans('regular text')).toEqual([
        {isCode: false, text: 'regular text'},
      ]);
    });

    it('does not split on a single backtick', () => {
      expect(splitMarkdownCodeSpans('regular `text')).toEqual([
        {isCode: false, text: 'regular `text'},
      ]);
    });

    it('splits on backticked code', () => {
      expect(splitMarkdownCodeSpans('regular `code` text')).toEqual([
        {isCode: false, text: 'regular '},
        {isCode: true, text: 'code'},
        {isCode: false, text: ' text'},
      ]);
    });

    it('splits on backticked code at the beginning of the string', () => {
      expect(splitMarkdownCodeSpans('`start code` regular text')).toEqual([
        {isCode: true, text: 'start code'},
        {isCode: false, text: ' regular text'},
      ]);
    });

    it('splits on backticked code at the end of the string', () => {
      expect(splitMarkdownCodeSpans('regular text `end code`')).toEqual([
        {isCode: false, text: 'regular text '},
        {isCode: true, text: 'end code'},
      ]);
    });

    it('does not split on a single backtick after split out backticked code', () => {
      expect(splitMarkdownCodeSpans('regular text `code` and more `text')).toEqual([
        {isCode: false, text: 'regular text '},
        {isCode: true, text: 'code'},
        {isCode: false, text: ' and more `text'},
      ]);
    });

    it('splits on two instances of backticked code', () => {
      expect(splitMarkdownCodeSpans('regular text `code` more text `and more code`')).toEqual([
        {isCode: false, text: 'regular text '},
        {isCode: true, text: 'code'},
        {isCode: false, text: ' more text '},
        {isCode: true, text: 'and more code'},
      ]);
    });

    it('splits on two directly adjacent instances of backticked code', () => {
      // eslint-disable-next-line max-len
      expect(splitMarkdownCodeSpans('regular text `first code``second code` end text')).toEqual([
        {isCode: false, text: 'regular text '},
        {isCode: true, text: 'first code'},
        {isCode: true, text: 'second code'},
        {isCode: false, text: ' end text'},
      ]);
    });

    it('handles text only within backticks', () => {
      expect(splitMarkdownCodeSpans('`first code``second code`')).toEqual([
        {isCode: true, text: 'first code'},
        {isCode: true, text: 'second code'},
      ]);
    });

    it('splits on two instances of backticked code separated by only a space', () => {
      // eslint-disable-next-line max-len
      expect(splitMarkdownCodeSpans('`first code` `second code`')).toEqual([
        {isCode: true, text: 'first code'},
        {isCode: false, text: ' '},
        {isCode: true, text: 'second code'},
      ]);
    });
  });

  describe('#splitMarkdownLink', () => {
    it('handles strings with no links in them', () => {
      expect(splitMarkdownLink('some text')).toEqual([
        {isLink: false, text: 'some text'},
      ]);
    });

    it('does not split on an incomplete markdown link', () => {
      expect(splitMarkdownLink('some [not link text](text')).toEqual([
        {isLink: false, text: 'some [not link text](text'},
      ]);
    });

    it('splits on a markdown link', () => {
      expect(splitMarkdownLink('some [link text](https://example.com) text')).toEqual([
        {isLink: false, text: 'some '},
        {isLink: true, text: 'link text', linkHref: 'https://example.com'},
        {isLink: false, text: ' text'},
      ]);
    });

    it('splits on an http markdown link', () => {
      expect(splitMarkdownLink('you should [totally click here](http://never-mitm.com) now')).toEqual([
        {isLink: false, text: 'you should '},
        {isLink: true, text: 'totally click here', linkHref: 'http://never-mitm.com'},
        {isLink: false, text: ' now'},
      ]);
    });

    it('does not split on a non-http/https link', () => {
      expect(splitMarkdownLink('some [link text](ftp://example.com) text')).toEqual([
        {isLink: false, text: 'some [link text](ftp://example.com) text'},
      ]);
    });

    it('does not split on a malformed markdown link', () => {
      expect(splitMarkdownLink('some [link ]text](https://example.com')).toEqual([
        {isLink: false, text: 'some [link ]text](https://example.com'},
      ]);

      expect(splitMarkdownLink('some [link text] (https://example.com')).toEqual([
        {isLink: false, text: 'some [link text] (https://example.com'},
      ]);
    });

    it('does not split on empty link text', () => {
      expect(splitMarkdownLink('some [](https://example.com) empty link')).toEqual([
        {isLink: false, text: 'some [](https://example.com) empty link'},
      ]);
    });

    it('splits on a markdown link at the beginning of a string', () => {
      expect(splitMarkdownLink('[link text](https://example.com) end text')).toEqual([
        {isLink: true, text: 'link text', linkHref: 'https://example.com'},
        {isLink: false, text: ' end text'},
      ]);
    });

    it('splits on a markdown link at the end of a string', () => {
      expect(splitMarkdownLink('start text [link text](https://example.com)')).toEqual([
        {isLink: false, text: 'start text '},
        {isLink: true, text: 'link text', linkHref: 'https://example.com'},
      ]);
    });

    it('handles a string consisting only of a markdown link', () => {
      expect(splitMarkdownLink(`[I'm only a link](https://example.com)`)).toEqual([
        {isLink: true, text: `I'm only a link`, linkHref: 'https://example.com'},
      ]);
    });

    it('handles a string starting and ending with a markdown link', () => {
      expect(splitMarkdownLink('[first link](https://first.com) other text [second link](https://second.com)')).toEqual([
        {isLink: true, text: 'first link', linkHref: 'https://first.com'},
        {isLink: false, text: ' other text '},
        {isLink: true, text: 'second link', linkHref: 'https://second.com'},
      ]);
    });

    it('handles a string with adjacent markdown links', () => {
      expect(splitMarkdownLink('start text [first link](https://first.com)[second link](https://second.com) and scene')).toEqual([
        {isLink: false, text: 'start text '},
        {isLink: true, text: 'first link', linkHref: 'https://first.com'},
        {isLink: true, text: 'second link', linkHref: 'https://second.com'},
        {isLink: false, text: ' and scene'},
      ]);
    });
  });
});
