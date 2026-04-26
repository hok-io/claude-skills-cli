'use strict';

const { readManifest } = require('../lib/manifest');
const { listTags } = require('../lib/provider');

async function outdatedCommand(projectRoot) {
  const manifest = readManifest(projectRoot);
  if (!manifest) {
    console.log('No .claude/skills.json found.');
    return;
  }

  const skills = Object.entries(manifest.skills);
  if (skills.length === 0) {
    console.log('No skills installed.');
    return;
  }

  const maxNameLen = Math.max(...skills.map(([n]) => n.length));
  const maxVerLen = Math.max(...skills.map(([, s]) => s.version.length));

  let outdated = 0;
  for (const [name, skill] of skills) {
    process.stdout.write(`${name.padEnd(maxNameLen)}  ${skill.version.padEnd(maxVerLen)}  `);
    try {
      const tags = await listTags(skill.source, 1);
      if (tags.length === 0) {
        console.log('(no tags found)');
        continue;
      }
      const latest = tags[0];
      if (latest === skill.version) {
        console.log('up to date');
      } else {
        console.log(`→ ${latest}`);
        outdated++;
      }
    } catch (err) {
      console.log(`failed: ${err.message}`);
    }
  }

  if (outdated > 0) {
    console.log(`\n${outdated} skill(s) outdated. Run "skills skill upgrade --all" to upgrade.`);
  }
}

module.exports = { outdatedCommand };
