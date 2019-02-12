const {collateResults, report} = require('../lighthouse-cli/test/smokehouse/smokehouse-report');

/** @type {LH.Result} */
const actual = JSON.parse(process.argv[2]);

/** @type {LH.Result} */
const expected = JSON.parse(process.argv[3]);

const results = collateResults(actual, expected);

const counts = report(results);

if (counts.failed) {
  process.exit(1);
}
