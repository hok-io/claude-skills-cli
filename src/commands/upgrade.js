'use strict';

const path = require('path');
const fs = require('fs');
const { readManifest, writeManifest } = require('../lib/manifest');
const { resolveTagCommit, downloadSkillFile } = require('../lib/gitlab');
const { computeSha256 } = require('../lib/checksum');
const { validateVersion } = require('../lib/validate');

async function upgradeCommand(nameAtVersion, projectRoot) {
  const atIndex = nameAtVersion.lastIndexOf('@');
  if (atIndex === -1) {
    throw new Error(`Invalid format. Use: skills upgrade <name>@<version>`);
  }

  const name = nameAtVersion.slice(0, atIndex);
  const version = nameAtVersion.slice(atIndex + 1);

  validateVersion(version);

  const manifest = readManifest(projectRoot);

  if (!manifest) {
    throw new Error('.claude/skills.json not found.');
  }

  if (!manifest.skills[name]) {
    throw new Error(`Skill "${name}" not found in manifest. Use "skills add" to add it.`);
  }

  const token = process.env.GITLAB_TOKEN;
  const existing = manifest.skills[name];

  console.log(`Upgrading ${name} from ${existing.version} to ${version}...`);

  const resolvedCommit = await resolveTagCommit(existing.source, version, token);
  const content = await downloadSkillFile(existing.source, name, version, token);
  const sha256 = computeSha256(content);

  manifest.skills[name] = { ...existing, version, resolvedCommit, sha256 };
  writeManifest(projectRoot, manifest);

  const skillsDir = path.join(projectRoot, '.claude', 'skills');
  fs.mkdirSync(skillsDir, { recursive: true });
  fs.writeFileSync(path.join(skillsDir, `${name}.md`), content, 'utf8');

  console.log(`Upgraded ${name} to ${version} (${resolvedCommit.slice(0, 8)})`);
}

module.exports = { upgradeCommand };
