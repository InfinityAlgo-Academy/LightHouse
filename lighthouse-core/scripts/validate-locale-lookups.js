const fs = require('fs');
const path = require('path');
const glob = require('glob');

const i18n = require('../lib/i18n/i18n.js');
const lookupClosestLocale = require('lookup-closest-locale');

const cldrAliasData = require('cldr-core/supplemental/aliases.json');
const cldrAliases = cldrAliasData.supplemental.metadata.alias.languageAlias;

const cldrParentsData = require('cldr-core/supplemental/parentLocales.json');
const cldrParentLocales = cldrParentsData.supplemental.parentLocales.parentLocale;


// Get list of locales we have string files for
const lhLocales = glob
  .sync('./lighthouse-core/lib/i18n/locales/*.json')
  .filter(f => !f.includes('.ctc.json'))
  .map(filename => path.parse(filename).name);

//
// 1. Validate the locales we store are canonical and not an alias
//
const aliasExceptions = ['zh-HK', 'zh-TW', 'no']; // TC pipeline still uses these codes rather than the CLDR's preferred `zh-Hant-HK`, `zh-Hant-TW`, `nb`
// See also https://github.com/unicode-cldr/cldr-core/blob/master/supplemental/likelySubtags.json

for (const localeCode of lhLocales) {
  if (Object.keys(cldrAliases).includes(localeCode) && !aliasExceptions.includes(localeCode)) {
    // TODO, assert/throw?
    console.error(localeCode, 'is considered an alias.', cldrAliases[localeCode]);
  }
}

//
// 2. generate subsetted list of aliases
//
const aliasesSubset = {};
const aliasesSubsetMacroLanguage = {};
Object.entries(cldrAliases).forEach(([alias, entry]) => {
  if (lhLocales.includes(entry._replacement)) {
    if (entry._reason == 'macrolanguage') {
      aliasesSubsetMacroLanguage[alias] = entry._replacement;
    } else {
      aliasesSubset[alias] = entry._replacement;
    }
  }
});

writeJSONFile('aliasesSubset', aliasesSubset, __dirname + '/../lib/i18n/cldrdata/aliases.json');
writeJSONFile('aliasesSubsetMacroLanguage', aliasesSubsetMacroLanguage,
  __dirname + '/../lib/i18n/cldrdata/aliases-macrolanguage.json');

//
// 3. generate subsetted list of parentLocales
//
const parentsSubset = {};
Object.entries(cldrParentLocales).forEach(([locale, parentLocale]) => {

  if (parentLocale === 'root') return;

  const availableLocales = Object.fromEntries(lhLocales.map(loc => ([loc, 1])));
  const matchingLocale = lookupClosestLocale(parentLocale, availableLocales);
  if (matchingLocale) {
    parentsSubset[locale] = parentLocale;
  }
});

writeJSONFile('parentsSubset', parentsSubset, __dirname + '/../lib/i18n/cldrdata/parentLocales.json');

/**
 *
 * @param {string} name
 * @param {Object} data
 * @param {string} filename
 */
function writeJSONFile(name, data, filename) {
  console.log({[name]: data});
  fs.writeFileSync(filename, JSON.stringify(data, null, 2));
  console.log(`Wrote to disk at ${filename}.`);
}
