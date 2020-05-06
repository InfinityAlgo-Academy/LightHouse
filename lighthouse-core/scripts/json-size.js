// cat lhr.json | node lighthouse-core/scripts/json-size.js | less
// cat lhr.json | jq .audits | node lighthouse-core/scripts/json-size.js | less

const fs = require('fs');
const inputJson = fs.readFileSync(0, 'utf-8');
const object = JSON.parse(inputJson);

/**
 * @param {*} obj
 */
function size(obj) {
  return JSON.stringify(obj).length;
}

/**
 * @param {string} key
 * @param {number} keySize
 */
function printRow(key, keySize) {
  const keyPadded = key.padEnd(longestKeyLength);
  const percentage = Math.round((keySize / totalSize) * 100);
  console.log(`${keyPadded} ${percentage}\t${keySize}`);
}

const totalSize = size(object);
const longestKeyLength = Math.max(...Object.keys(object).map(key => key.length));

printRow('total', totalSize);
Object.entries(object)
  .map(([key, value]) => /** @type {[string, number]} */([key, size(value)]))
  .sort((a, b) => b[1] - a[1])
  .forEach(([key, keySize]) => {
    printRow(key, keySize);
  });
