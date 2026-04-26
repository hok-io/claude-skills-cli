'use strict';

const path = require('path');
const fs = require('fs');
const { readManifest } = require('../lib/manifest');
const { resolveTagCommit, downloadSkillFile, detectProvider, getToken } = require('../lib/provider');
const { computeSha256 } = require('../lib/checksum');

async function installCommand(projectRoot) {
  const manifest = readManifest(projectRoot);

  if (!manifest) {
    throw new Error(
      '.claude/skills.json not found. Run "skills add" to add a skill first.'
    );
  }

  const skills = Object.entries(manifest.skills);

  if (skills.length === 0) {
    console.log('No skills to install.');
    return;
  }

  // token is resolved per-skill based on provider (github.com → GITHUB_TOKEN, else → GITLAB_TOKEN)
  const token = null;
  const skillsDir = path.join(projectRoot, '.claude', 'skills');
  const tmpDir = path.join(projectRoot, '.claude', '.skills-tmp');
  const backupDir = path.join(projectRoot, '.claude', '.skills-backup');

  if (fs.existsSync(tmpDir)) fs.rmSync(tmpDir, { recursive: true });
  if (fs.existsSync(backupDir)) fs.rmSync(backupDir, { recursive: true });

  fs.mkdirSync(tmpDir, { recursive: true });

  try {
    for (const [name, skill] of skills) {
      process.stdout.write(`Downloading ${name}@${skill.version}... `);

      const resolvedCommit = await resolveTagCommit(skill.source, skill.version, token);

      if (resolvedCommit !== skill.resolvedCommit) {
        throw new Error(
          `\nSkill ${name}@${skill.version} is not stable.\n` +
          `The tag now points to a different commit.\n` +
          `Expected: ${skill.resolvedCommit}\n` +
          `Got:      ${resolvedCommit}\n` +
          `Contact the Project maintainer.`
        );
      }

      const content = await downloadSkillFile(skill.source, name, skill.version, token);
      const sha256 = computeSha256(content);

      if (sha256 !== skill.sha256) {
        throw new Error(
          `\nChecksum mismatch for ${name}@${skill.version}.\n` +
          `Expected: ${skill.sha256}\n` +
          `Got:      ${sha256}\n` +
          `Contact the Project maintainer.`
        );
      }

      fs.writeFileSync(path.join(tmpDir, `${name}.md`), content, 'utf8');
      console.log('done');
    }

    if (fs.existsSync(skillsDir)) {
      fs.renameSync(skillsDir, backupDir);
    }

    fs.renameSync(tmpDir, skillsDir);

    if (fs.existsSync(backupDir)) {
      fs.rmSync(backupDir, { recursive: true });
    }

    console.log(`\nInstalled ${skills.length} skill(s).`);
  } catch (err) {
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true });
    }
    if (fs.existsSync(backupDir) && !fs.existsSync(skillsDir)) {
      fs.renameSync(backupDir, skillsDir);
    }
    throw err;
  }
}

module.exports = { installCommand };
