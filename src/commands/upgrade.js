'use strict';

const path = require('path');
const fs = require('fs');
const { readManifest, writeManifest } = require('../lib/manifest');
const { resolveTagCommit, downloadSkillFile, listTags } = require('../lib/provider');
const { computeSha256 } = require('../lib/checksum');
const { validateVersion } = require('../lib/validate');

async function performUpgrade(name, existing, newVersion, manifest, projectRoot) {
  const resolvedCommit = await resolveTagCommit(existing.source, newVersion);
  const content = await downloadSkillFile(existing.source, name, newVersion);
  const sha256 = computeSha256(content);

  manifest.skills[name] = { ...existing, version: newVersion, resolvedCommit, sha256 };
  writeManifest(projectRoot, manifest);

  const skillsDir = path.join(projectRoot, '.claude', 'skills');
  fs.mkdirSync(skillsDir, { recursive: true });
  fs.writeFileSync(path.join(skillsDir, `${name}.md`), content, 'utf8');

  return resolvedCommit;
}

async function upgradeCommand(nameAtVersion, projectRoot) {
  const atIndex = nameAtVersion.lastIndexOf('@');
  if (atIndex === -1) {
    throw new Error('Invalid format. Use: skills skill upgrade <name>@<version>');
  }

  const name = nameAtVersion.slice(0, atIndex);
  const version = nameAtVersion.slice(atIndex + 1);

  validateVersion(version);

  const manifest = readManifest(projectRoot);
  if (!manifest) throw new Error('.claude/skills.json not found.');
  if (!manifest.skills[name]) {
    throw new Error(`Skill "${name}" not found in manifest. Use "skills skill add" to add it.`);
  }

  const existing = manifest.skills[name];
  console.log(`Upgrading ${name} from ${existing.version} to ${version}...`);

  const resolvedCommit = await performUpgrade(name, existing, version, manifest, projectRoot);
  console.log(`Upgraded ${name} to ${version} (${resolvedCommit.slice(0, 8)})`);
}

async function upgradeAllCommand(projectRoot) {
  const manifest = readManifest(projectRoot);
  if (!manifest) throw new Error('.claude/skills.json not found.');

  const skills = Object.entries(manifest.skills);
  if (skills.length === 0) {
    console.log('No skills to upgrade.');
    return;
  }

  let upgraded = 0;
  let upToDate = 0;
  let failed = 0;

  for (const [name, skill] of skills) {
    process.stdout.write(`${name}: checking... `);
    try {
      const tags = await listTags(skill.source, 1);
      if (tags.length === 0) {
        console.log('no tags found, skipped.');
        continue;
      }

      const latest = tags[0];
      if (latest === skill.version) {
        console.log(`up to date (${latest})`);
        upToDate++;
        continue;
      }

      console.log(`${skill.version} → ${latest}`);
      const resolvedCommit = await performUpgrade(name, skill, latest, manifest, projectRoot);
      console.log(`  ✓ done (${resolvedCommit.slice(0, 8)})`);
      upgraded++;
    } catch (err) {
      console.log(`failed: ${err.message}`);
      failed++;
    }
  }

  const failedPart = failed ? `, ${failed} failed` : '';
  console.log(`\n${upgraded} upgraded, ${upToDate} already up to date${failedPart}.`);
}

module.exports = { upgradeCommand, upgradeAllCommand };
