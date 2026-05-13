'use strict';

const path = require('path');
const fs = require('fs');
const { readManifest, writeManifest, createEmptyManifest } = require('../lib/manifest');
const { resolveTagCommit, downloadSkill } = require('../lib/provider');
const { computeFolderSha256 } = require('../lib/checksum');
const { validateSkillName, validateSource, validateVersion } = require('../lib/validate');

async function addCommand(source, { skill: name, version }, projectRoot) {
  validateSkillName(name);
  validateSource(source, projectRoot);
  validateVersion(version);

  const manifest = readManifest(projectRoot) || createEmptyManifest();

  if (manifest.skills[name]) {
    throw new Error(
      `Skill "${name}" already exists. Use "skills skill upgrade ${name}@<version>" to upgrade.`
    );
  }

  console.log(`Resolving ${name}@${version}...`);

  const resolvedCommit = await resolveTagCommit(source, version);

  const skillsDir = path.join(projectRoot, '.claude', 'skills');
  fs.mkdirSync(skillsDir, { recursive: true });

  const destDir = await downloadSkill(source, name, version, skillsDir);
  const sha256 = computeFolderSha256(destDir);

  manifest.skills[name] = { source, version, resolvedCommit, sha256 };
  writeManifest(projectRoot, manifest);

  console.log(`Added ${name}@${version} (${resolvedCommit.slice(0, 8)})`);
}

module.exports = { addCommand };
