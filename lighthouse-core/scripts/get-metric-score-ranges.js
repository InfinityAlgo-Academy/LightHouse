
const Config = require('../config/config.js');
const defaultConfig = require('../config/default-config.js');
const Audit = require('../audits/audit.js');
const statistics = require('../lib/statistics.js');

/**
 * @fileoverview calculate min/max limits via the score curves
 * something like this:
    limits: {
      'first-contentful-paint': [ 1360, 11800 ],
      'first-meaningful-paint': [ 1360, 11800 ],
      'largest-contentful-paint': [ 1360, 11800 ],
      'speed-index': [ 1970, 17100 ],
      'estimated-input-latency': [ 34, 295 ],
      'total-blocking-time': [ 136, 2650 ],
      'max-potential-fid': [ 67.3, 931 ],
      'first-cpu-idle': [ 1950, 21700 ],
      interactive: [ 1950, 27400 ]
    }
 */

const GREAT_PCTL = 0.995;
// This could be 0.05 instead to nearly HALVE the distance. Long tails, man.
const TERRIBLE_PCTL = 0.0049;

const config = new Config(defaultConfig);
const continuouslyScoredAudits = config.audits.filter(a => {
    if (!a.path.includes('metric')) return false;
    const hasScoreConsts = a.implementation.defaultOptions.mobile || a.implementation.defaultOptions.scoreMedian
    return hasScoreConsts;
});

const roundNum = num => Number(num.toPrecision(3)); // "rounding"

const results = continuouslyScoredAudits.map(audit => {
    // TODO: handle desktop scoring as well..
    const { scoreMedian, scorePODR } = (audit.implementation.defaultOptions.mobile || audit.implementation.defaultOptions);
    const great = statistics.VALUE_AT_QUANTILE(scoreMedian, scorePODR, GREAT_PCTL);
    const worst = statistics.VALUE_AT_QUANTILE(scoreMedian, scorePODR, TERRIBLE_PCTL);
    const auditId = audit.path.split('/').slice(-1)[0];
    return [auditId, [roundNum(great), roundNum(worst)]];
});

const limits = Object.fromEntries(results);
console.log({ limits });
