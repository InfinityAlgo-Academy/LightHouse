'use strict';

/* eslint-env jest */

// require('jsdom');

describe('Tests', function() {
  it('pass', async function() {
    const {DOM} = await import('../../report/renderer/dom.js');
    expect(DOM).toBeTruthy();
  });
});
