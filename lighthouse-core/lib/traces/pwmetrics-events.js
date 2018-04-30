/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
// @ts-nocheck
'use strict';

const log = require('lighthouse-logger');

function findValueInMetricsAuditFn(metricName, timingOrTimestamp) {
  return auditResults => {
    const metricsAudit = auditResults.metrics;
    if (!metricsAudit || !metricsAudit.details || !metricsAudit.details.items) return;

    const values = metricsAudit.details.items.find(item => item.metricName === metricName);
    return values && values[timingOrTimestamp];
  };
}

class Metrics {
  constructor(traceEvents, auditResults) {
    this._traceEvents = traceEvents;
    this._auditResults = auditResults;
  }

  /**
   * Returns simplified representation of all metrics
   * @return {!Array<{getTs: Function, id: string, name: string}>} metrics to consider
   */
  static get metricsDefinitions() {
    return [
      {
        name: 'Navigation Start',
        id: 'navstart',
        getTs: findValueInMetricsAuditFn('observedNavigationStart', 'timestamp'),
        getTiming: findValueInMetricsAuditFn('observedNavigationStart', 'timing'),
      },
      {
        name: 'First Contentful Paint',
        id: 'ttfcp',
        getTs: findValueInMetricsAuditFn('observedFirstContentfulPaint', 'timestamp'),
        getTiming: findValueInMetricsAuditFn('observedFirstContentfulPaint', 'timing'),
      },
      {
        name: 'First Meaningful Paint',
        id: 'ttfmp',
        getTs: findValueInMetricsAuditFn('observedFirstMeaningfulPaint', 'timestamp'),
        getTiming: findValueInMetricsAuditFn('observedFirstMeaningfulPaint', 'timing'),
      },
      {
        name: 'Speed Index',
        id: 'si',
        getTs: findValueInMetricsAuditFn('observedSpeedIndex', 'timestamp'),
        getTiming: findValueInMetricsAuditFn('observedSpeedIndex', 'timing'),
      },
      {
        name: 'First Visual Change',
        id: 'fv',
        getTs: findValueInMetricsAuditFn('observedFirstVisualChange', 'timestamp'),
        getTiming: findValueInMetricsAuditFn('observedFirstVisualChange', 'timing'),
      },
      {
        name: 'Visually Complete 100%',
        id: 'vc100',
        getTs: findValueInMetricsAuditFn('observedLastVisualChange', 'timestamp'),
        getTiming: findValueInMetricsAuditFn('observedLastVisualChange', 'timing'),
      },
      {
        name: 'First CPU Idle',
        id: 'ttfi',
        getTs: findValueInMetricsAuditFn('firstCPUIdle', 'timestamp'),
        getTiming: findValueInMetricsAuditFn('firstCPUIdle', 'timing'),
      },
      {
        name: 'Interactive',
        id: 'tti',
        getTs: findValueInMetricsAuditFn('interactive', 'timestamp'),
        getTiming: findValueInMetricsAuditFn('interactive', 'timing'),
      },
      {
        name: 'End of Trace',
        id: 'eot',
        getTs: findValueInMetricsAuditFn('observedTraceEnd', 'timestamp'),
        getTiming: findValueInMetricsAuditFn('observedTraceEnd', 'timing'),
      },
      {
        name: 'On Load',
        id: 'onload',
        getTs: findValueInMetricsAuditFn('observedLoad', 'timestamp'),
        getTiming: findValueInMetricsAuditFn('observedLoad', 'timing'),
      },
      {
        name: 'DOM Content Loaded',
        id: 'dcl',
        getTs: findValueInMetricsAuditFn('observedDomContentLoaded', 'timestamp'),
        getTiming: findValueInMetricsAuditFn('observedDomContentLoaded', 'timing'),
      },
    ];
  }

  /**
   * Returns simplified representation of all metrics' timestamps from monotonic clock
   * @return {!Array<{ts: number, id: string, name: string}>} metrics to consider
   */
  gatherMetrics() {
    const metricDfns = Metrics.metricsDefinitions;
    const resolvedMetrics = [];
    metricDfns.forEach(metric => {
      // try/catch in case auditResults is missing a particular audit result
      try {
        resolvedMetrics.push({
          id: metric.id,
          name: metric.name,
          ts: metric.getTs(this._auditResults),
        });
      } catch (e) {
        log.error('pwmetrics-events', `${metric.name} timestamp not found: ${e.message}`);
      }
    });
    return resolvedMetrics;
  }

  /**
   * Get the full trace event for our navigationStart
   * @param {!Array<{ts: number, id: string, name: string}>} metrics
   */
  identifyNavigationStartEvt(metrics) {
    const navStartMetric = metrics.find(e => e.id === 'navstart');
    if (!navStartMetric) return;
    this._navigationStartEvt = this._traceEvents.find(
      e => e.name === 'navigationStart' && e.ts === navStartMetric.ts
    );
  }

  /**
   * Constructs performance.measure trace events, which have start/end events as follows:
   *     { "pid": 89922,"tid":1295,"ts":77176783452,"ph":"b","cat":"blink.user_timing","name":"innermeasure","args":{},"tts":1257886,"id":"0xe66c67"}
   *     { "pid": 89922,"tid":1295,"ts":77176882592,"ph":"e","cat":"blink.user_timing","name":"innermeasure","args":{},"tts":1257898,"id":"0xe66c67"}
   * @param {{ts: number, id: string, name: string}} metric
   * @return {!Array} Pair of trace events (start/end)
   */
  synthesizeEventPair(metric) {
    // We'll masquerade our fake events to look mostly like navigationStart
    const eventBase = {
      pid: this._navigationStartEvt.pid,
      tid: this._navigationStartEvt.tid,
      cat: 'blink.user_timing',
      name: metric.name,
      args: {},
      // randomized id is same for the pair
      id: `0x${((Math.random() * 1000000) | 0).toString(16)}`,
    };
    const fakeMeasureStartEvent = Object.assign({}, eventBase, {
      ts: this._navigationStartEvt.ts,
      ph: 'b',
    });
    const fakeMeasureEndEvent = Object.assign({}, eventBase, {
      ts: metric.ts,
      ph: 'e',
    });
    return [fakeMeasureStartEvent, fakeMeasureEndEvent];
  }

  /**
   * @returns {Array<LH.TraceEvent>} User timing raw trace event pairs
   */
  generateFakeEvents() {
    const fakeEvents = [];
    const metrics = this.gatherMetrics();
    if (metrics.length === 0) {
      log.error('metrics-events', 'Metrics collection had errors, not synthetizing trace events');
      return [];
    }

    this.identifyNavigationStartEvt(metrics);
    if (!this._navigationStartEvt) {
      log.error('pwmetrics-events', 'Reference navigationStart not found');
      return [];
    }

    metrics.forEach(metric => {
      if (metric.id === 'navstart') {
        return;
      }
      if (!metric.ts) {
        log.error('pwmetrics-events', `(${metric.name}) missing timestamp. Skipping…`);
        return;
      }
      log.verbose('pwmetrics-events', `Sythesizing trace events for ${metric.name}`);
      fakeEvents.push(...this.synthesizeEventPair(metric));
    });
    return fakeEvents;
  }
}

module.exports = Metrics;
