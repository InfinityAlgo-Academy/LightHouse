'use strict';

const fs = require('fs');
const puppeteer = require('puppeteer');
const {snapshot} = require('./api.js');


(async () => {
  const browser = await puppeteer.launch({headless: false});

  try {
    const page = await browser.newPage();
    await page.goto('https://cuzillion.com/');
    await page.click('button[title="Add a script element"]');
    await page.click('button[title="Add a script element"]');

    const {lhr, report} = await snapshot({page, config: {
      extends: true,
      settings: {
        output: 'html',
      },
    }});
    console.log(`Ran ${Object.keys(lhr.audits).length} audits`);
    fs.writeFileSync('latest.report.html', report);
    await browser.close();
  } catch (err) {
    console.error(err);
    await browser.close().catch(() => {});
    process.exit(1);
  }
})();
