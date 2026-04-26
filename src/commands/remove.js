'use strict';

const path = require('path');
const fs = require('fs');
const { readManifest, writeManifest } = require('../lib/manifest');

async function removeCommand(name, projectRoot) {
  const manifest = readManifest(projectRoot);

  if (!manifest) {
    throw new Error('.claude/skills.json not found.');
  }

  if (!manifest.skills[name]) {
    throw new Error(`Skill "${name}" not found in manifest.`);
  }

  delete manifest.skills[name];
  writeManifest(projectRoot, manifest);

  const skillFile = path.join(projectRoot, '.claude', 'skills', `${name}.md`);
  if (fs.existsSync(skillFile)) {
    fs.unlinkSync(skillFile);
  }

  console.log(`Removed skill "${name}".`);
}

module.exports = { removeCommand };
