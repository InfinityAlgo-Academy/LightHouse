const browserify = require('browserify');
const fs = require('fs');

const distDir = __dirname + '/../dist';
const outFile = `${distDir}/report-generator.js`;
const generatorFilename = `./lighthouse-core/report/report-generator.js`;
browserify(generatorFilename, {standalone: 'ReportGenerator'})
  .transform('brfs')
  .bundle((err, src) => {
    if (err) throw err;
    fs.writeFileSync(outFile, src.toString());
  });
