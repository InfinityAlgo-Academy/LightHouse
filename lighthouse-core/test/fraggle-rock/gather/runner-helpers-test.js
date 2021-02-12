/**
 * @license Copyright 2021 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const helpers = require('../../../fraggle-rock/gather/runner-helpers.js');
const Gatherer = require('../../../fraggle-rock/gather/base-gatherer.js');

/* eslint-env jest */

describe('collectArtifactDependencies', () => {
  /** @type {LH.Config.ArtifactDefn} */
  let artifact;
  /** @type {Record<string, any>} */
  let artifactsById;

  beforeEach(() => {
    artifact = {
      id: 'Artifact',
      gatherer: {instance: new Gatherer()},
      dependencies: {ImageElements: {id: 'Dependency'}},
    };
    artifactsById = {
      Dependency: [],
    };
  });

  it('should handle no dependencies', async () => {
    artifact.dependencies = undefined;
    const result = await helpers.collectArtifactDependencies(artifact, artifactsById);
    expect(result).toEqual({});
  });

  it('should handle empty dependencies', async () => {
    // @ts-expect-error - this isn't valid given our set of types, but plugins might do this.
    artifact.dependencies = {};
    const result = await helpers.collectArtifactDependencies(artifact, artifactsById);
    expect(result).toEqual({});
  });

  it('should handle successful dependencies', async () => {
    const result = await helpers.collectArtifactDependencies(artifact, artifactsById);
    expect(result).toEqual({ImageElements: []});
  });

  it('should handle successful promise dependencies', async () => {
    artifactsById.Dependency = Promise.resolve([]);
    const result = await helpers.collectArtifactDependencies(artifact, artifactsById);
    expect(result).toEqual({ImageElements: []});
  });

  it('should handle falsy dependencies', async () => {
    artifactsById.Dependency = null;
    const result = await helpers.collectArtifactDependencies(artifact, artifactsById);
    expect(result).toEqual({ImageElements: null});
  });

  it('should handle missing dependencies', async () => {
    artifactsById.Dependency = undefined;
    const result = helpers.collectArtifactDependencies(artifact, artifactsById);
    await expect(result).rejects.toMatchObject({message: expect.stringContaining('did not run')});
  });

  it('should handle errored dependencies', async () => {
    artifactsById.Dependency = Promise.reject(new Error('DEP_FAILURE'));
    const result = helpers.collectArtifactDependencies(artifact, artifactsById);
    await expect(result).rejects.toMatchObject({
      message: expect.stringContaining('"Dependency" failed with exception: DEP_FAILURE'),
    });
  });
});
