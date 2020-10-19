'use strict';

const packs = require.resolve('lighthouse-stack-packs/');
const path = require('path');
const fs = require('fs');
const glob = require('glob').sync;

const joined = path.join(path.dirname(packs), 'packs', '*.js');
const packsByStack = glob(joined).map(file => require(file));
const allAuditIdsWithDescs = new Set(packsByStack.map(pack => Object.keys(pack.UIStrings)).flat());

for (const auditId of allAuditIdsWithDescs) {
  // look up data
  const packsWithData = packsByStack.filter(pack => !!pack.UIStrings[auditId]);

  // construct markdown
  const sectionMd = constructMarkdown(packsWithData, auditId);

  // get web.dev doc file
  const potentialWebDevFiles = glob(`../web.dev/src/site/content/en/lighthouse-*/${auditId}/index.md`);
  if (potentialWebDevFiles.length === 0) {
    console.log('Could not find web.dev doc file for ', auditId);
    continue;
  } else if (potentialWebDevFiles.length > 1) {
    console.error('Found multiple web.dev doc files for', auditId);
    continue;
  }

  const filePath = potentialWebDevFiles[0];
  let docSource = fs.readFileSync(filePath, 'utf-8');

  // We are either updating an existing SP section or adding it fresh. It always goes above Resources
  const hasSPSection = docSource.includes(`## Stack-specific guidance`);
  const hasResourcesSection = docSource.includes(`## Resources`);

  if (!hasSPSection && !hasResourcesSection) {
    console.error(`${auditId} has no SP or Resources section. Can't inject markdown. :(`);
    continue;
  }

  // It has a SP section, so replace that
  if (hasSPSection) {
    docSource = docSource.replace(/\n## Stack-specific guidance[\S\s]*?## Resources/m, `
${sectionMd}

## Resources`);
  } else {
    // Add a new section
    docSource = docSource.replace(/\n## Resources/, `
${sectionMd}

## Resources`);
  }

  // Save the modified string back
  fs.writeFileSync(filePath, docSource, 'utf-8');
  console.log('successfully wrote doc for ', auditId);
}


function constructMarkdown(packsWithData, auditId) {
  const packDataMd = packsWithData.map(pack => {
    return `### ${pack.title}

${pack.UIStrings[auditId]}
`;
  });

  const sectionMd = `
## Stack-specific guidance

If you use any of these CMS's, libraries or frameworks, consider the following suggestions:

${packDataMd.join('\n')}
`.trim();
  return sectionMd;
}

