'use strict';

/* eslint-env jest */

// can be any commonjs module
require('semver');

describe('Tests', function() {
  it('pass', async function() {
    await import('../../report/renderer/dom.js');
  });
});
