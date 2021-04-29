/**
 * @license Copyright 2020 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const BaseFRGatherer = require('../../../fraggle-rock/gather/base-gatherer.js');
const BaseLegacyGatherer = require('../../../gather/gatherers/gatherer.js');
const validation = require('../../../fraggle-rock/config/validation.js');

/* eslint-env jest */

/** @typedef {LH.Gatherer.GathererMeta['supportedModes']} SupportedModes */

describe('Fraggle Rock Config Validation', () => {
  describe('isFRGathererDefn', () => {
    it('should identify fraggle rock gatherer definitions', () => {
      expect(validation.isFRGathererDefn({instance: new BaseFRGatherer()})).toBe(true);
    });

    it('should identify legacy gatherer definitions', () => {
      expect(validation.isFRGathererDefn({instance: new BaseLegacyGatherer()})).toBe(false);
    });
  });

  describe('isValidArtifactDependency', () => {
    /** @type {Array<{dependent: SupportedModes, dependency: SupportedModes, isValid: boolean}>} */
    const combinations = [
      {dependent: ['timespan'], dependency: ['timespan'], isValid: true},
      {dependent: ['timespan'], dependency: ['snapshot'], isValid: false},
      {dependent: ['timespan'], dependency: ['navigation'], isValid: false},
      {dependent: ['snapshot'], dependency: ['timespan'], isValid: false},
      {dependent: ['snapshot'], dependency: ['snapshot'], isValid: true},
      {dependent: ['snapshot'], dependency: ['navigation'], isValid: false},
      {dependent: ['navigation'], dependency: ['timespan'], isValid: true},
      {dependent: ['navigation'], dependency: ['snapshot'], isValid: true},
      {dependent: ['navigation'], dependency: ['navigation'], isValid: true},
    ];

    for (const {dependent, dependency, isValid} of combinations) {
      it(`should identify ${dependent.join(',')} / ${dependency.join(',')} correctly`, () => {
        const dependentDefn = {instance: new BaseFRGatherer()};
        dependentDefn.instance.meta.supportedModes = dependent;
        const dependencyDefn = {instance: new BaseFRGatherer()};
        dependencyDefn.instance.meta.supportedModes = dependency;
        expect(validation.isValidArtifactDependency(dependentDefn, dependencyDefn)).toBe(isValid);
      });
    }
  });
});
