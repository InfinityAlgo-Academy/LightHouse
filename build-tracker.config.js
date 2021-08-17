// https://buildtracker.dev/docs/installation/#upload-your-builds

'use strict';

const Comparator = require('@build-tracker/comparator').default;
const ArtifactDelta = require('@build-tracker/comparator/dist/ArtifactDelta');
const {formatBytes} = require('@build-tracker/formatting');
const fetch = require('node-fetch');

const applicationUrl = 'https://lh-build-tracker.herokuapp.com';

const createBuildComparisonUrl = (a, b) => `${applicationUrl}/builds/${a}/${b}`;

const postStatus = ({sha, state, targetUrl, description}, {buildTrackerGithubToken}) =>
  // https://developer.github.com/v3/repos/statuses/#create-a-status
  fetch(`https://api.github.com/repos/GoogleChrome/lighthouse/statuses/${sha}`, {
    method: 'POST',
    headers: {
      'Authorization': `token ${buildTrackerGithubToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      state,
      target_url: targetUrl,
      description,
      context: 'Build Tracker',
    }),
  }).then(response =>
    response.ok === false
      ? response.json().then(json => {
        throw new Error(
            `Response was not ok. Status: ${response.status}. Body: ${JSON.stringify(json)}`
        );
      })
      : Promise.resolve()
  );

const SIZE_KEY = 'gzip';

// Copied from
// https://github.com/paularmstrong/build-tracker/blob/51b0a32d914c8c0cf11515eb2075923ffb42b399/src/comparator/src/index.ts#L136
const formatDelta = allArtifactDelta =>
  `${formatBytes(allArtifactDelta.sizes[SIZE_KEY])} (${(
    allArtifactDelta.percents[SIZE_KEY] * 100
  ).toFixed(1)}%)`;

const getDescriptionStats = (parentBuild, build) => {
  const parentBuildSum = parentBuild.getSum(parentBuild.artifactNames);
  const buildSum = build.getSum(build.artifactNames);
  const allArtifactDelta = new ArtifactDelta('All', [], buildSum, parentBuildSum, false);
  const formattedDelta = formatDelta(allArtifactDelta);
  const formattedTotalSize = formatBytes(buildSum[SIZE_KEY]);
  const descriptionStats = [`Change: ${formattedDelta}`, `Total: ${formattedTotalSize}`].join(' ');
  return descriptionStats;
};

// Based off of example at
// https://github.com/paularmstrong/build-tracker/blob/8f1df8ca248f5f96619c9b2ff14cd21c7f304522/docs/docs/guides/ci.md
const onCompare =
  ({buildTrackerGithubToken, sha}) =>
  data => {
    const {comparatorData} = data;
    const comparator = Comparator.deserialize(comparatorData);

    if (comparator.builds.length === 1) {
      // We need 2 builds to provide a useful comparison, so if there is only one build, we exit early.
      return Promise.reject(
        new Error(
          `Expected comparator to have exactly 2 builds, but it only has 1. This most likely means the base branch hasn't finished building yet. Retry this build when the base branch has finished building. Note you will need to push a new commit.`
        )
      );
    } else {
      const parentBuild = comparator.builds[0];
      const build = comparator.builds[1];
      const url = createBuildComparisonUrl(
        build.getMetaValue('parentRevision'),
        build.getMetaValue('revision')
      );

      const isSuccess = comparator.errors.length === 0;

      const descriptionStats = getDescriptionStats(parentBuild, build);

      const hasWarnings =
        comparator.unexpectedHashChanges.length > 1 || comparator.warnings.length > 1;

      const description = [hasWarnings ? '⚠️ See report.' : undefined, descriptionStats]
        .filter(s => s !== undefined)
        .join(' ');

      return postStatus(
        {
          // Note: we don't use the `build` revision because—in a pull request build—this will
          // represent a merge commit "between the source branch and the upstream branch". This commit
          // doesn't actually exist in the PR.
          // https://docs.travis-ci.com/user/pull-requests/#how-pull-requests-are-built
          sha,
          state: isSuccess ? 'success' : 'failure',
          targetUrl: url,
          description,
        },
        {
          buildTrackerGithubToken,
        }
      );
    }
  };

module.exports = {
  applicationUrl,
  // Budgets for these are expressed in https://github.com/paulirish/lh-build-tracker/blob/master/build-tracker.config.js
  artifacts: [
    'dist/lightrider/lighthouse-lr-bundle.js',
    'dist/extension/scripts/lighthouse-ext-bundle.js',
    'dist/lighthouse-dt-bundle.js',
    'dist/gh-pages/viewer/src/bundled.js',
    'dist/gh-pages/treemap/src/bundled.js',
    'dist/lightrider/report-generator-bundle.js',
    'dist/dt-report-resources/report.js',
    'dist/dt-report-resources/report-generator.js',
  ],
  onCompare,
};
