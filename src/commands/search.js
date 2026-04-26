'use strict';

const { readManifest } = require('../lib/manifest');
const { listSkillFiles } = require('../lib/provider');

async function searchCommand(source, projectRoot) {
  const manifest = readManifest(projectRoot);
  const installed = manifest ? new Set(Object.keys(manifest.skills)) : new Set();

  console.log(`Fetching skills from ${source}...\n`);

  const skills = await listSkillFiles(source);

  if (skills.length === 0) {
    console.log('No skill files (.md) found in the repository root.');
    return;
  }

  const sorted = [...skills].sort();
  const maxLen = Math.max(...sorted.map(n => n.length));

  for (const name of sorted) {
    const marker = installed.has(name) ? '[installed]' : '';
    console.log(`  ${name.padEnd(maxLen)}  ${marker}`);
  }

  console.log(`\n${skills.length} skill(s) found.`);
}

module.exports = { searchCommand };
