/**
 * @license Copyright 2020 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const BaseAudit = require('../../../audits/audit.js');
const BaseGatherer = require('../../../fraggle-rock/gather/base-gatherer.js');
const {defaultSettings} = require('../../../config/constants.js');
const filters = require('../../../fraggle-rock/config/filters.js');

/* eslint-env jest */

describe('Fraggle Rock Config Filtering', () => {
  const snapshotGatherer = new BaseGatherer();
  snapshotGatherer.meta = {supportedModes: ['snapshot']};
  const timespanGatherer = new BaseGatherer();
  timespanGatherer.meta = {supportedModes: ['timespan']};

  const artifacts = [
    {id: 'Snapshot', gatherer: {instance: snapshotGatherer}},
    {id: 'Timespan', gatherer: {instance: timespanGatherer}},
  ];

  describe('filterArtifactsByGatherMode', () => {
    it('should handle null', () => {
      expect(filters.filterArtifactsByGatherMode(null, 'snapshot')).toBe(null);
    });

    it('should filter to the correct mode', () => {
      expect(filters.filterArtifactsByGatherMode(artifacts, 'snapshot')).toEqual([
        {id: 'Snapshot', gatherer: {instance: snapshotGatherer}},
      ]);

      expect(filters.filterArtifactsByGatherMode(artifacts, 'timespan')).toEqual([
        {id: 'Timespan', gatherer: {instance: timespanGatherer}},
      ]);
    });
  });

  const auditMeta = {title: '', description: ''};
  class SnapshotAudit extends BaseAudit {
    static meta = {
      id: 'snapshot',
      requiredArtifacts: /** @type {any} */ (['Snapshot']),
      ...auditMeta,
    };
  }
  class ManualAudit extends BaseAudit {
    static meta = {
      id: 'manual',
      scoreDisplayMode: BaseAudit.SCORING_MODES.MANUAL,
      requiredArtifacts: /** @type {any} */ ([]),
      ...auditMeta,
    };
  }
  class TimespanAudit extends BaseAudit {
    static meta = {
      id: 'timespan',
      requiredArtifacts: /** @type {any} */ (['Timespan']),
      ...auditMeta,
    };
  }
  class NavigationAudit extends BaseAudit {
    static meta = {
      id: 'navigation',
      requiredArtifacts: /** @type {any} */ (['Snapshot', 'Timespan']),
      ...auditMeta,
    };
  }
  class NavigationOnlyAudit extends BaseAudit {
    static meta = {
      id: 'navigation-only',
      requiredArtifacts: /** @type {any} */ (['Snapshot', 'Timespan']),
      supportedModes: /** @type {['navigation']} */ (['navigation']),
      ...auditMeta,
    };
  }

  const audits = [SnapshotAudit, TimespanAudit, NavigationAudit, ManualAudit].map(audit => ({
    implementation: audit,
    options: {},
  }));

  describe('filterAuditsByAvailableArtifacts', () => {
    it('should handle null', () => {
      expect(filters.filterAuditsByAvailableArtifacts(null, [])).toBe(null);
    });

    it('should filter when partial artifacts available', () => {
      const partialArtifacts = [{id: 'Snapshot', gatherer: {instance: snapshotGatherer}}];
      expect(filters.filterAuditsByAvailableArtifacts(audits, partialArtifacts)).toEqual([
        {implementation: SnapshotAudit, options: {}},
        {implementation: ManualAudit, options: {}},
      ]);
    });

    it('should not filter audits with dependencies on base artifacts', () => {
      class SnapshotWithBase extends BaseAudit {
        static meta = {
          id: 'snapshot',
          requiredArtifacts: /** @type {any} */ (['Snapshot', 'URL', 'Timing']),
          ...auditMeta,
        };
      }

      const auditsWithBaseArtifacts = [SnapshotWithBase, TimespanAudit].map(audit => ({
        implementation: audit,
        options: {},
      }));
      const partialArtifacts = [{id: 'Snapshot', gatherer: {instance: snapshotGatherer}}];
      expect(
        filters.filterAuditsByAvailableArtifacts(auditsWithBaseArtifacts, partialArtifacts)
      ).toEqual([{implementation: SnapshotWithBase, options: {}}]);
    });

    it('should be noop when all artifacts available', () => {
      expect(filters.filterAuditsByAvailableArtifacts(audits, artifacts)).toEqual(audits);
    });
  });

  /** @type {LH.Config.FRConfig['categories']} */
  const categories = {
    snapshot: {title: 'Snapshot', auditRefs: [{id: 'snapshot', weight: 0}]},
    timespan: {title: 'Timespan', auditRefs: [{id: 'timespan', weight: 0}]},
    navigation: {title: 'Navigation', auditRefs: [{id: 'navigation', weight: 0}]},
    manual: {title: 'Manual', auditRefs: [{id: 'manual', weight: 0}]},
    mixed: {
      title: 'Mixed',
      auditRefs: [
        {id: 'snapshot', weight: 0},
        {id: 'timespan', weight: 0},
        {id: 'navigation', weight: 0},
      ],
    },
  };

  describe('filterCategoriesByAvailableAudits', () => {
    it('should handle null', () => {
      expect(filters.filterCategoriesByAvailableAudits(null, [])).toBe(null);
    });

    it('should filter entire categories', () => {
      const partialAudits = [{implementation: SnapshotAudit, options: {}}];
      const filtered = filters.filterCategoriesByAvailableAudits(categories, partialAudits);
      expect(filtered).not.toMatchObject({
        timespan: {},
        navigation: {},
      });
      expect(filtered).toMatchObject({
        snapshot: {},
        mixed: {},
      });
    });

    it('should filter entire categories when all remaining audits are manual', () => {
      const partialAudits = [
        {implementation: SnapshotAudit, options: {}},
        {implementation: ManualAudit, options: {}},
      ];

      const filteredCategories = filters.filterCategoriesByAvailableAudits(
        {
          snapshot: categories.snapshot,
          timespanWithManual: {
            title: 'Timespan + Manual',
            auditRefs: [{id: 'timespan', weight: 0}, {id: 'manual', weight: 0}],
          },
        },
        partialAudits
      );
      expect(filteredCategories).not.toHaveProperty('timespanWithManual');
    });

    it('should filter audits within categories', () => {
      const partialAudits = [{implementation: SnapshotAudit, options: {}}];
      const filtered = filters.filterCategoriesByAvailableAudits(categories, partialAudits);
      if (!filtered) throw new Error(`Failed to produce a categories object`);
      expect(filtered.mixed).toEqual({
        title: 'Mixed',
        auditRefs: [{id: 'snapshot', weight: 0}],
      });
    });

    it('should be noop when all audits available', () => {
      expect(filters.filterCategoriesByAvailableAudits(categories, audits)).toEqual(categories);
    });
  });

  describe('filterAuditsByGatherMode', () => {
    it('should handle null', () => {
      expect(filters.filterAuditsByGatherMode(null, 'timespan')).toBeNull();
    });

    it('should filter unsupported audits', () => {
      const timespanAudits = [TimespanAudit, NavigationOnlyAudit].map(audit => ({
        implementation: audit,
        options: {},
      }));
      expect(filters.filterAuditsByGatherMode(timespanAudits, 'timespan')).toEqual([
        {implementation: TimespanAudit, options: {}},
      ]);
    });

    it('should keep audits without explicit modes defined', () => {
      const timespanAudits = [TimespanAudit, NavigationAudit].map(audit => ({
        implementation: audit,
        options: {},
      }));
      expect(filters.filterAuditsByGatherMode(timespanAudits, 'timespan')).toEqual([
        {implementation: TimespanAudit, options: {}},
        {implementation: NavigationAudit, options: {}},
      ]);
    });
  });

  describe('filterConfigByGatherMode', () => {
    it('should filter the entire config', () => {
      const config = {
        artifacts,
        navigations: null,
        audits,
        categories,
        groups: null,
        settings: defaultSettings,
      };
      expect(filters.filterConfigByGatherMode(config, 'snapshot')).toMatchObject({
        artifacts: [{id: 'Snapshot'}],
        audits: [{implementation: SnapshotAudit}, {implementation: ManualAudit}],
        categories: {
          snapshot: {},
          manual: {},
          mixed: {auditRefs: [{id: 'snapshot'}]},
        },
      });
    });
  });
});
