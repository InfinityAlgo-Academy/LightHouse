'use strict';

/* eslint-env jest */

require('semver');

describe('Tests', function() {
  it('pass', async function() {
    await import('../../report/renderer/dom.js');
  });
});
