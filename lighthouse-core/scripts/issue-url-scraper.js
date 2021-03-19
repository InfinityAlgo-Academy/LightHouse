/**
 * @license Copyright 2021 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

/**
 * @fileoverview
 * List URLs mentioned in all comments in an issue, including referenced issues.
 *
 * Make a token: https://github.com/settings/tokens
 *
 * Ex: GH_TOKEN_ISSUE_SCRAPER=... node lighthouse-core/scripts/issue-url-scraper.js 6512
 */

'use strict';

const {graphql} = require('@octokit/graphql');
const {ProgressLogger} = require('./lantern/collect/common.js');

const ARGS = {
  number: process.argv[2],
  token: process.env.GH_TOKEN_ISSUE_SCRAPER,
};

/**
 * Get box-drawing progress bar
 * @param {number} i
 * @param {number} total
 * @return {string}
 */
function getProgressBar(i, total) {
  const bars = new Array(Math.round(i * 40 / total)).fill('▄').join('').padEnd(40);
  return `${i + 1} / ${total} [${bars}]`;
}

/**
 * @param {string} qs
 */
async function query(qs) {
  return await graphql(qs, {
    owner: 'GooglChrome',
    repo: 'Lighthouse',
    headers: {
      authorization: `token ${ARGS.token}`,
    },
  });
}

/**
 * @param {string} qs
 * @param {(response: any) => {endCursor: string, hasNextPage: boolean}} getPageInfo
 */
async function paginate(qs, getPageInfo) {
  if (!qs.includes('CURSOR')) throw new Error('put CURSOR in the query');

  const responses = [];

  let pageInfo = {endCursor: '', hasNextPage: true};
  while (pageInfo.hasNextPage) {
    const thisQs = pageInfo.endCursor ?
      qs.replace('CURSOR', `, after: "${pageInfo.endCursor}"`) :
      qs.replace('CURSOR', '');
    const response = await query(thisQs);
    responses.push(response);
    pageInfo = getPageInfo(response);
  }

  return responses;
}

/**
 * @param {string} comment
 */
function parseCommentForUrl(comment) {
  // https://stackoverflow.com/a/29288898
  // eslint-disable-next-line max-len
  const matches = /(?:(?:https?|file):\/\/|www\.)(?:\([-A-Z0-9+&@#/%=~_|$?!:,.]*\)|[-A-Z0-9+&@#/%=~_|$?!:,.])*(?:\([-A-Z0-9+&@#/%=~_|$?!:,.]*\)|[A-Z0-9+&@#/%=~_|$])/igm.exec(comment);
  if (!matches) return null;

  try {
    const url = new URL(matches[0]);

    if (url.href.match(/localhost|github.com/)) {
      return null;
    }

    return url.href;
  } catch (_) {
    return null;
  }
}

/**
 * @param {number} number
 * @return {Promise<string[]>}
 */
async function getCommentsForIssue(number) {
  const responses = await paginate(`query {
    repository(owner: "GoogleChrome", name: "Lighthouse") {
      issue(number: ${number}) {
        body

        comments(first: 100 CURSOR) {
          nodes {
            body
          }
          pageInfo {
            endCursor
            hasNextPage
          }
        }
      }
    }
  }`, response => response.repository.issue.comments.pageInfo);

  const first = responses[0].repository.issue.body;
  const nodes = responses.flatMap(r => r.repository.issue.comments.nodes);
  const rest = nodes.map((node => node.body));
  return [first, ...rest];
}

async function main() {
  const progress = new ProgressLogger();

  progress.log('Fetching initial issue');
  const responses = await paginate(`query {
    repository(owner: "GoogleChrome", name: "Lighthouse") {
      issue(number: ${ARGS.number}) {
        title

        timelineItems(first: 250 CURSOR) {
          nodes {
            ... on CrossReferencedEvent {
              source {
                ... on Issue {
                  number
                  title
                }
              }
            }
          }
          pageInfo {
            endCursor
            hasNextPage
          }
        }
      }
    }
  }`, response => response.repository.issue.timelineItems.pageInfo);

  const nodes = responses.flatMap(r => r.repository.issue.timelineItems.nodes);
  const issues = nodes
    .filter((node) => node.source && node.source.number)
    .filter(Boolean)
    .map((node) => node.source);
  issues.unshift({number: ARGS.number});

  progress.log(`title: ${responses[0].repository.issue.title}`);
  progress.log(`parsing ${issues.length} issues for URLs`);

  /** @type {Set<string>} */
  const urls = new Set();
  for (const issue of issues) {
    progress.progress(getProgressBar(issues.indexOf(issue), issues.length));
    for (const comment of await getCommentsForIssue(issue.number)) {
      const url = parseCommentForUrl(comment);
      if (url) urls.add(url);
    }
  }

  progress.closeProgress();

  for (const url of urls) {
    // eslint-disable-next-line no-console
    console.log(url);
  }
}

main();
