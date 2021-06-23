'use strict';
const puppeteer = require('puppeteer');
const lighthouse = require('./lighthouse-core/fraggle-rock/api.js');

async function run() {
  const browser = await puppeteer.launch({
    headless: false,
  });
  const page = await browser.newPage();
  await page.goto('http://localhost:8080/responsive-image.html');

  const result = await lighthouse.snapshot({page});

  console.log(JSON.stringify(result.lhr, null, 2));

  await page.close();
  await browser.close();
}
run();
