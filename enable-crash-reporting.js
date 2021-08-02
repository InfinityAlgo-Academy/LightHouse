'use strict';
// xvfb-run --auto-servernum lighthouse https://www.webpagetest.org --chrome-flags="--user-data-dir=/tmp/protocol_timeout --enable-logging --v=1" --verbose --throttling-method=devtools
// xvfb-run --auto-servernum lighthouse https://www.webpagetest.org --verbose --throttling-method=devtools --port=9222
const puppeteer = require('puppeteer');

async function run() {
  const browser = await puppeteer.launch({
    headless: false,
    executablePath: '/usr/bin/google-chrome',
    userDataDir: '/tmp/protocol_timeout',
  });

  try {
    const page = await browser.newPage();
    await page.goto('chrome://settings/syncSetup');
    console.log(
      await page.evaluate(async () => {
        function getElementsInDocument(selector) {
          const realMatchesFn = window.__ElementMatches || window.Element.prototype.matches;
          /** @type {Array<ParseSelector<T>>} */
          const results = [];

          /** @param {NodeListOf<Element>} nodes */
          const _findAllElements = (nodes) => {
            for (let i = 0, el; (el = nodes[i]); ++i) {
              if (!selector || realMatchesFn.call(el, selector)) {
                /** @type {ParseSelector<T>} */
                // @ts-expect-error - el is verified as matching above, tsc just can't verify it through the .call().
                const matchedEl = el;
                results.push(matchedEl);
              }

              // If the element has a shadow root, dig deeper.
              if (el.shadowRoot) {
                _findAllElements(el.shadowRoot.querySelectorAll('*'));
              }
            }
          };
          _findAllElements(document.querySelectorAll('*'));

          return results;
        }

        while (!getElementsInDocument('#metricsReportingControl').length) {
          console.log('Waiting for metrics control to appear');
          await new Promise((r) => setTimeout(r, 1000));
        }

        const [element] = getElementsInDocument('#metricsReportingControl');
        element.click();
        while (!element.querySelector('#restart')) {
          console.log('Waiting for relaunch to appear');
          await new Promise((r) => setTimeout(r, 100));
        }

        setTimeout(() => element.querySelector('#restart'), 5000);
        return getElementsInDocument('*')
          .filter((el) => !el.childElementCount && el.tagName !== 'STYLE')
          .map((el) => el.textContent)
          .join('\n').replace(/\n+/g, '\n');
      })
    );
    await new Promise((r) => setTimeout(r, 6000));
    await browser.close();
  } catch (err) {
    console.error(err);
    await browser.close();
    process.exit(1);
  }
}

run();
