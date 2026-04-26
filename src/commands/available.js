'use strict';

const { readManifest } = require('../lib/manifest');
const { listSkillFiles } = require('../lib/provider');

async function availableCommand(projectRoot) {
  const manifest = readManifest(projectRoot);
  if (!manifest) {
    throw new Error('.claude/skills.json not found. Run "skills skill add" first.');
  }

  const installed = new Set(Object.keys(manifest.skills));
  const sources = [...new Set(Object.values(manifest.skills).map(s => s.source))];

  if (sources.length === 0) {
    console.log('No sources in manifest. Add a skill first with "skills skill add".');
    return;
  }

  let totalAvailable = 0;
  for (const source of sources) {
    process.stdout.write(`From ${source}: `);
    try {
      const skills = await listSkillFiles(source);
      const notInstalled = skills.filter(name => !installed.has(name));
      if (notInstalled.length === 0) {
        console.log('all skills installed');
        continue;
      }
      console.log('');
      for (const name of notInstalled) {
        console.log(`  ${name}`);
      }
      totalAvailable += notInstalled.length;
    } catch (err) {
      console.log(`failed: ${err.message}`);
    }
  }

  if (totalAvailable > 0) {
    console.log(
      `\n${totalAvailable} skill(s) available.\n` +
      `Install with: skills skill add <source> --skill <name> --version <tag>`
    );
  }
}

module.exports = { availableCommand };
