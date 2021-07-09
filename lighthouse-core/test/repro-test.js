'use strict';

/* eslint-env jest */

// can be any commonjs module
// require('semver');

describe('Tests', function() {
  beforeAll(async () => {
    const dep = await import('../../lighthouse-core/lib/navigation-error.js');
    console.log(dep);
  });

  it('pass', async function() {
    await import('../../report/renderer/dom.js');
  });
});
