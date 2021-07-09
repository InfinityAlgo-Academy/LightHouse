'use strict';

/* eslint-env jest */

// require('jsdom');
require('fs');

describe('Tests', function() {
  it('pass', async function() {
    await import('../../report/renderer/dom.js');
  });
});
