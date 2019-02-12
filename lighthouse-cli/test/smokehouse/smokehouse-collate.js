const NUMERICAL_EXPECTATION_REGEXP = /^(<=?|>=?)((\d|\.)+)$/;

/**
 * @typedef {{path: string, actual: *, expected: *}} Difference
 */

/**
 * @typedef {{category: string, actual: *, expected: *, equal: boolean, diff?: Difference | null}} Comparison
 */

/**
 * @typedef {Pick<LH.Result, 'audits' | 'finalUrl' | 'requestedUrl'> & {errorCode?: string}} ExpectedLHR
 */

/**
 * @typedef {{audits: Comparison[], errorCode: Comparison, finalUrl: Comparison}} LHRComparison
 */

/**
 * Checks if the actual value matches the expectation. Does not recursively search. This supports
 *    - Greater than/less than operators, e.g. "<100", ">90"
 *    - Regular expressions
 *    - Strict equality
 *
 * @param {*} actual
 * @param {*} expected
 * @return {boolean}
 */
function matchesExpectation(actual, expected) {
  if (typeof actual === 'number' && NUMERICAL_EXPECTATION_REGEXP.test(expected)) {
    const parts = expected.match(NUMERICAL_EXPECTATION_REGEXP);
    const operator = parts[1];
    const number = parseFloat(parts[2]);
    switch (operator) {
      case '>':
        return actual > number;
      case '>=':
        return actual >= number;
      case '<':
        return actual < number;
      case '<=':
        return actual <= number;
      default:
        throw new Error(`unexpected operator ${operator}`);
    }
  } else if (typeof actual === 'string' && expected instanceof RegExp && expected.test(actual)) {
    return true;
  } else {
    // Strict equality check, plus NaN equivalence.
    return Object.is(actual, expected);
  }
}

/**
 * Walk down expected result, comparing to actual result. If a difference is found,
 * the path to the difference is returned, along with the expected primitive value
 * and the value actually found at that location. If no difference is found, returns
 * null.
 *
 * Only checks own enumerable properties, not object prototypes, and will loop
 * until the stack is exhausted, so works best with simple objects (e.g. parsed JSON).
 * @param {string} path
 * @param {*} actual
 * @param {*} expected
 * @return {(Difference|null)}
 */
function findDifference(path, actual, expected) {
  if (matchesExpectation(actual, expected)) {
    return null;
  }

  // If they aren't both an object we can't recurse further, so this is the difference.
  if (actual === null || expected === null || typeof actual !== 'object' ||
    typeof expected !== 'object' || expected instanceof RegExp) {
    return {
      path,
      actual,
      expected,
    };
  }

  // We only care that all expected's own properties are on actual (and not the other way around).
  for (const key of Object.keys(expected)) {
    // Bracket numbers, but property names requiring quotes will still be unquoted.
    const keyAccessor = /^\d+$/.test(key) ? `[${key}]` : `.${key}`;
    const keyPath = path + keyAccessor;
    const expectedValue = expected[key];

    if (!(key in actual)) {
      return {path: keyPath, actual: undefined, expected: expectedValue};
    }

    const actualValue = actual[key];
    const subDifference = findDifference(keyPath, actualValue, expectedValue);

    // Break on first difference found.
    if (subDifference) {
      return subDifference;
    }
  }

  return null;
}

/**
 * Collate results into comparisons of actual and expected scores on each audit.
 * @param {ExpectedLHR} actual
 * @param {ExpectedLHR} expected
 * @return {LHRComparison}
 */
function collateResults(actual, expected) {
  const auditNames = Object.keys(expected.audits);
  const collatedAudits = auditNames.map(auditName => {
    const actualResult = actual.audits[auditName];
    if (!actualResult) {
      throw new Error(`Config did not trigger run of expected audit ${auditName}`);
    }

    const expectedResult = expected.audits[auditName];
    const diff = findDifference(auditName, actualResult, expectedResult);

    return {
      category: auditName,
      actual: actualResult,
      expected: expectedResult,
      equal: !diff,
      diff,
    };
  });

  return {
    audits: collatedAudits,
    errorCode: {
      category: 'error code',
      actual: actual.errorCode,
      expected: expected.errorCode,
      equal: actual.errorCode === expected.errorCode,
    },
    finalUrl: {
      category: 'final url',
      actual: actual.finalUrl,
      expected: expected.finalUrl,
      equal: actual.finalUrl === expected.finalUrl,
    },
  };
}

module.exports = collateResults;
