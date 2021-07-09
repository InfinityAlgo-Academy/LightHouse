'use strict';

/* eslint-env jest */

describe('Tests', function() {
  it('pass', function() {
    import('../../report/renderer/dom.js');
    expect(1).toEqual(1);
  });
});
