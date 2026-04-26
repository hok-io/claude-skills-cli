'use strict';

const path = require('path');
const fs = require('fs');
const { readManifest, writeManifest, createEmptyManifest } = require('../lib/manifest');
const { resolveTagCommit, downloadSkillFile } = require('../lib/gitlab');
const { computeSha256 } = require('../lib/checksum');
const { validateSkillName, validateSource, validateVersion } = require('../lib/validate');

async function addCommand(source, { skill: name, version }, projectRoot) {
  validateSkillName(name);
  validateSource(source);
  validateVersion(version);

  const token = process.env.GITLAB_TOKEN;
  const manifest = readManifest(projectRoot) || createEmptyManifest();

  if (manifest.skills[name]) {
    throw new Error(
      `Skill "${name}" already exists. Use "skills upgrade ${name}@<version>" to upgrade.`
    );
  }

  console.log(`Resolving ${name}@${version}...`);

  const resolvedCommit = await resolveTagCommit(source, version, token);
  const content = await downloadSkillFile(source, name, version, token);
  const sha256 = computeSha256(content);

  manifest.skills[name] = { source, version, resolvedCommit, sha256 };
  writeManifest(projectRoot, manifest);

  const skillsDir = path.join(projectRoot, '.claude', 'skills');
  fs.mkdirSync(skillsDir, { recursive: true });
  fs.writeFileSync(path.join(skillsDir, `${name}.md`), content, 'utf8');

  console.log(`Added ${name}@${version} (${resolvedCommit.slice(0, 8)})`);
}

module.exports = { addCommand };
