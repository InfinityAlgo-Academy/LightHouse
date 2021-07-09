'use strict';

/* eslint-env jest */

// can be any commonjs module
// require('semver');

describe('Tests', function() {
  beforeAll(async () => {
    const semver = await import('semver');
    console.log(semver);
  });

  it('pass', async function() {
    await import('../../report/renderer/dom.js');
  });
});
