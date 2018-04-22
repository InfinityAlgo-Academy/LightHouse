/* eslint-disable */

'use strict';

const fs = require('fs');

const files = ['paulirish'];

for (const file of files){
  const ReportGenerator = require('../../lighthouse-core/report/report-generator');
  const results = require(`../_json/${file}.json`);
  const html = ReportGenerator.generateReportHtml(results);
  const filename = __dirname + `/../${file}.html`;
  fs.writeFileSync(filename, html, {encoding: 'utf-8'});

  // Create Devtools report that's denser
  // TODO: add in extra styles that devtools manually injects
  const devtoolshtml = html.replace(`"lh-root lh-vars"`, `"lh-root lh-vars lh-devtools"`);
  const devtoolsfilename = filename.replace('.html', '.devtools.html');
  fs.writeFileSync(devtoolsfilename, devtoolshtml, {encoding: 'utf-8'});
  console.log(`Wrote ${html.length.toLocaleString()} bytes to ${filename} (and devtools*). ${new Date().toLocaleTimeString()}`);
}
