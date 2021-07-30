'use strict';

const puppeteer = require('puppeteer');

async function run() {
  const browser = await puppeteer.launch({
    headless: false,
    executablePath: '/usr/bin/google-chrome',
    userDataDir: '/tmp/protocol_timeout',
  });

  try {
    const page = await browser.newPage();
    await page.goto('chrome://crashes');

    console.log(await page.evaluate(async () => {
      return document.body.innerText;
    }));
    await browser.close();
  } catch (err) {
    console.error(err);
    await browser.close();
    process.exit(1);
  }
}

run();
