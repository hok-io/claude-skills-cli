'use strict';

const { readManifest } = require('../lib/manifest');

async function listCommand(projectRoot) {
  const manifest = readManifest(projectRoot);

  if (!manifest) {
    console.log('No .claude/skills.json found. Run "skills skill add" to add a skill.');
    return;
  }

  const skills = Object.entries(manifest.skills);

  if (skills.length === 0) {
    console.log('No skills configured.');
    return;
  }

  const maxNameLen = Math.max(...skills.map(([name]) => name.length));
  const maxVersionLen = Math.max(...skills.map(([, s]) => s.version.length));

  for (const [name, skill] of skills) {
    console.log(
      `${name.padEnd(maxNameLen)}  ${skill.version.padEnd(maxVersionLen)}  ${skill.source}`
    );
  }
}

module.exports = { listCommand };
