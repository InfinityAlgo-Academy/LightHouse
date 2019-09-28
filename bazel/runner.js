// https://docs.bazel.build/versions/master/test-encyclopedia.html#role-of-the-test-runner

const fs = require('fs');
const {spawnSync} = require('child_process');

const TOTAL_SHARDS = Number(process.env['TEST_TOTAL_SHARDS']);
const SHARD_INDEX = Number(process.env['TEST_SHARD_INDEX']);
const SMOKETESTS = require('../lighthouse-cli/test/smokehouse/smoke-test-dfns.js').SMOKE_TEST_DFNS;

async function main() {
  const start = SMOKETESTS.length * SHARD_INDEX / TOTAL_SHARDS;
  const end = SMOKETESTS.length * (SHARD_INDEX + 1) / TOTAL_SHARDS;
  const enabledSmokes = SMOKETESTS.slice(start, end);
  console.log(SHARD_INDEX, TOTAL_SHARDS, enabledSmokes.map(smoke => smoke.id));
  if (!enabledSmokes.length) return;

  const {status} = spawnSync('node', [
    'lighthouse-cli/test/smokehouse/run-smoke.js',
    ...enabledSmokes.map(smoke => smoke.id),
  ], {stdio: 'inherit'});
  process.exit(status);
}

// Test sharding support
// See https://docs.bazel.build/versions/master/test-encyclopedia.html#role-of-the-test-runner
// See https://github.com/bazelbuild/rules_nodejs/blob/77088586445e777a238f245ff96743e0773e49a7/packages/jasmine/src/jasmine_runner.js#L37
// Tell Bazel that this test runner supports sharding by updating the last modified date of the
// magic file
if (TOTAL_SHARDS) {
  fs.closeSync(fs.openSync(process.env.TEST_SHARD_STATUS_FILE, 'w'));
}

main();
