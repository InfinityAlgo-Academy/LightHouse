'use strict';

/* eslint-env jest */

require('jsdom');

describe('Tests', function() {
  it('pass', async function() {
    await import('../../report/renderer/dom.js');
  });
});
