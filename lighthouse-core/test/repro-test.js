'use strict';

/* eslint-env jest */

const jsdom = require('jsdom');

const url = 'http://www.example.com';
let dom;

describe('Tests', function() {
  it('pass', async function() {
    const {DOM} = await import('../../report/renderer/dom.js');
    expect(DOM).toBeTruthy();

    const {document, ShadowRoot, Node, HTMLElement} = new jsdom.JSDOM('', {url}).window;
    global.ShadowRoot = ShadowRoot;
    global.Node = Node;
    global.HTMLElement = HTMLElement;
    global.window = {};
    dom = new DOM(document);
  });
});
