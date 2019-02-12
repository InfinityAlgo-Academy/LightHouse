const collateResults = require('../lighthouse-cli/test/smokehouse/smokehouse-collate');

/** @type {LH.Result} */
const actual = JSON.parse(process.argv[2]);

/** @type {LH.Result} */
const expected = JSON.parse(process.argv[3]);

const results = collateResults(actual, expected);

report(results);

function tick() {
    return '✓';
  }

function cross() {
    return '✘';
  }

/**
 * Log the result of an assertion of actual and expected results.
 * @param {Comparison} assertion
 */
function reportAssertion(assertion) {
    // @ts-ignore - this doesn't exist now but could one day, so try not to break the future
    const _toJSON = RegExp.prototype.toJSON;
    // @ts-ignore
    // eslint-disable-next-line no-extend-native
    RegExp.prototype.toJSON = RegExp.prototype.toString;
  
    if (assertion.equal) {
      console.log(`  ${tick()} ${assertion.category}: ` +
          assertion.actual);
    } else {
      if (assertion.diff) {
        const diff = assertion.diff;
        const fullActual = JSON.stringify(assertion.actual, null, 2).replace(/\n/g, '\n      ');
        const msg = `
    ${cross()} difference at ${diff.path}
                expected: ${JSON.stringify(diff.expected)}
                   found: ${JSON.stringify(diff.actual)}
  
            found result:
        ${fullActual}
  `;
        console.log(msg);
      } else {
        console.log(`   ${assertion.category}:
                expected: ${JSON.stringify(assertion.expected)}
                   found: ${JSON.stringify(assertion.actual)}
  `);
      }
    }
  
    // @ts-ignore
    // eslint-disable-next-line no-extend-native
    RegExp.prototype.toJSON = _toJSON;
  }
  
  /**
   * Log all the comparisons between actual and expected test results, then print
   * summary. Returns count of passed and failed tests.
   * @param {LHRComparison} results
   * @return {{passed: number, failed: number}}
   */
  function report(results) {
    reportAssertion(results.finalUrl);
    reportAssertion(results.errorCode);
  
    let correctCount = 0;
    let failedCount = 0;
    results.audits.forEach(auditAssertion => {
      if (auditAssertion.equal) {
        correctCount++;
      } else {
        failedCount++;
        reportAssertion(auditAssertion);
      }
    });
  
    const plural = correctCount === 1 ? '' : 's';
    const correctStr = `${correctCount} assertion${plural}`;
    console.log(`  Correctly passed ${correctStr}\n`);
  
    return {
      passed: correctCount,
      failed: failedCount,
    };
  }
