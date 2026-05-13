'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { readManifest, MANIFEST_PATH } = require('../lib/manifest');
const { resolveTagCommit, downloadSkill } = require('../lib/provider');
const { computeFolderSha256 } = require('../lib/checksum');

function checkEntryShape(name, skill) {
  const errors = [];
  if (!skill.source) errors.push('missing "source"');
  if (!skill.version) errors.push('missing "version"');
  if (!skill.resolvedCommit) errors.push('missing "resolvedCommit"');
  if (!skill.sha256) errors.push('missing "sha256"');
  return errors.length ? `${name}: ${errors.join(', ')}` : null;
}

async function checkRemote(name, skill) {
  const resolvedCommit = await resolveTagCommit(skill.source, skill.version);
  if (resolvedCommit !== skill.resolvedCommit) {
    return (
      `${name}@${skill.version}: tag points to a different commit ` +
      `(expected ${skill.resolvedCommit}, got ${resolvedCommit}). ` +
      `Source repo likely force-pushed the tag.`
    );
  }

  const tmpParent = fs.mkdtempSync(path.join(os.tmpdir(), 'skills-verify-'));
  try {
    const destDir = await downloadSkill(skill.source, name, skill.version, tmpParent);
    const sha256 = computeFolderSha256(destDir);
    if (sha256 !== skill.sha256) {
      return (
        `${name}@${skill.version}: folder sha256 mismatch ` +
        `(expected ${skill.sha256.slice(0, 12)}…, got ${sha256.slice(0, 12)}…).`
      );
    }
    return null;
  } finally {
    fs.rmSync(tmpParent, { recursive: true, force: true });
  }
}

async function verifyCommand(projectRoot, options = {}) {
  const offline = !!options.offline;
  const manifest = readManifest(projectRoot);

  if (!manifest) {
    throw new Error(`${MANIFEST_PATH} not found. Run "skills init" first.`);
  }

  const skills = Object.entries(manifest.skills);
  if (skills.length === 0) {
    console.log('Manifest valid. No skills to verify.');
    return;
  }

  const errors = [];

  for (const [name, skill] of skills) {
    const shapeError = checkEntryShape(name, skill);
    if (shapeError) {
      errors.push(shapeError);
      continue;
    }

    if (offline) continue;

    process.stdout.write(`Verifying ${name}@${skill.version}... `);
    try {
      const remoteError = await checkRemote(name, skill);
      if (remoteError) {
        console.log('FAIL');
        errors.push(remoteError);
      } else {
        console.log('ok');
      }
    } catch (err) {
      console.log('FAIL');
      errors.push(`${name}@${skill.version}: ${err.message}`);
    }
  }

  if (errors.length > 0) {
    console.error('');
    for (const e of errors) console.error(`  - ${e}`);
    throw new Error(`Verify failed: ${errors.length} issue(s).`);
  }

  const mode = offline ? ' (offline, schema only)' : '';
  console.log(`\nVerified ${skills.length} skill(s)${mode}.`);
}

module.exports = { verifyCommand };
