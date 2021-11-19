'use strict';

import fs from 'fs';

import {generateReportHtml} from './report/clients/bundle.js';


(async function() {
// const sampleLhr = /** @type {LH.Result} */ (require('../../lighthouse-core/test/results/sample_v2.json'));

  const sampleLhr = JSON.parse(
  fs.readFileSync('./lighthouse-core/test/results/sample_v2.json', 'utf-8')
  );

  // import sampleLhr from './lighthouse-core/test/results/sample_v2.json';
    debugger;
  const html = await generateReportHtml(sampleLhr);


  fs.writeFileSync('cool.html', html);
  console.log('./cool.html written.');
})();
