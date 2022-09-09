/**
 * @license Copyright 2022 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

import {strict as assert} from 'assert';

import {Util} from '../shared-utils.js';

describe('shared util helpers', () => {
  it('calculates a score ratings', () => {
    assert.equal(Util.calculateRating(0.0), 'fail');
    assert.equal(Util.calculateRating(0.10), 'fail');
    assert.equal(Util.calculateRating(0.45), 'fail');
    assert.equal(Util.calculateRating(0.5), 'average');
    assert.equal(Util.calculateRating(0.75), 'average');
    assert.equal(Util.calculateRating(0.80), 'average');
    assert.equal(Util.calculateRating(0.90), 'pass');
    assert.equal(Util.calculateRating(1.00), 'pass');
  });

  describe('getTld', () => {
    it('returns the correct tld', () => {
      assert.equal(Util.getTld('example.com'), '.com');
      assert.equal(Util.getTld('example.co.uk'), '.co.uk');
      assert.equal(Util.getTld('example.com.br'), '.com.br');
      assert.equal(Util.getTld('example.tokyo.jp'), '.jp');
    });
  });

  describe('getRootDomain', () => {
    it('returns the correct rootDomain from a string', () => {
      assert.equal(Util.getRootDomain('https://www.example.com/index.html'), 'example.com');
      assert.equal(Util.getRootDomain('https://example.com'), 'example.com');
      assert.equal(Util.getRootDomain('https://www.example.co.uk'), 'example.co.uk');
      assert.equal(Util.getRootDomain('https://example.com.br/app/'), 'example.com.br');
      assert.equal(Util.getRootDomain('https://example.tokyo.jp'), 'tokyo.jp');
      assert.equal(Util.getRootDomain('https://sub.example.com'), 'example.com');
      assert.equal(Util.getRootDomain('https://sub.example.tokyo.jp'), 'tokyo.jp');
      assert.equal(Util.getRootDomain('http://localhost'), 'localhost');
      assert.equal(Util.getRootDomain('http://localhost:8080'), 'localhost');
    });

    it('returns the correct rootDomain from an URL object', () => {
      assert.equal(Util.getRootDomain(new URL('https://www.example.com/index.html')), 'example.com');
      assert.equal(Util.getRootDomain(new URL('https://example.com')), 'example.com');
      assert.equal(Util.getRootDomain(new URL('https://www.example.co.uk')), 'example.co.uk');
      assert.equal(Util.getRootDomain(new URL('https://example.com.br/app/')), 'example.com.br');
      assert.equal(Util.getRootDomain(new URL('https://example.tokyo.jp')), 'tokyo.jp');
      assert.equal(Util.getRootDomain(new URL('https://sub.example.com')), 'example.com');
      assert.equal(Util.getRootDomain(new URL('https://sub.example.tokyo.jp')), 'tokyo.jp');
      assert.equal(Util.getRootDomain(new URL('http://localhost')), 'localhost');
      assert.equal(Util.getRootDomain(new URL('http://localhost:8080')), 'localhost');
    });
  });
});
