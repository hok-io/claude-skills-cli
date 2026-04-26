'use strict';

const path = require('path');
const fs = require('fs');
const { execFile } = require('child_process');
const { promisify } = require('util');
const { readManifest, MANIFEST_PATH } = require('../lib/manifest');
const { resolveTagCommit, downloadSkillFile } = require('../lib/provider');
const { computeSha256 } = require('../lib/checksum');

const exec = promisify(execFile);

const BRANCH_LIKE = /^(main|master|develop|dev|staging)|[/\\]/;

async function doctorCommand(projectRoot) {
  let hasIssues = false;

  const ok = (msg) => console.log(`  ✓ ${msg}`);
  const warn = (msg) => { console.log(`  ⚠ ${msg}`); hasIssues = true; };
  const fail = (msg) => { console.log(`  ✗ ${msg}`); hasIssues = true; };

  console.log('Diagnosing...\n');

  // Node.js version
  const [major] = process.versions.node.split('.').map(Number);
  if (major >= 18) {
    ok(`Node.js ${process.versions.node}`);
  } else {
    fail(`Node.js ${process.versions.node} — requires Node.js >= 18`);
  }

  // git is the transport, so it must be installed and reachable.
  try {
    const { stdout } = await exec('git', ['--version']);
    ok(stdout.trim());
  } catch {
    fail('git not found — install git and ensure it is on PATH');
    console.log('\nIssues found.');
    process.exitCode = 1;
    return;
  }

  // Manifest exists
  const manifestPath = path.join(projectRoot, MANIFEST_PATH);
  if (!fs.existsSync(manifestPath)) {
    fail(`${MANIFEST_PATH} not found`);
    console.log('\nIssues found. Run "skills skill add" to initialize.');
    process.exitCode = 1;
    return;
  }
  ok(`${MANIFEST_PATH} exists`);

  // Manifest JSON
  let manifest;
  try {
    manifest = readManifest(projectRoot);
    ok('Manifest JSON is valid');
  } catch (err) {
    fail(`Manifest error: ${err.message}`);
    console.log('\nIssues found.');
    process.exitCode = 1;
    return;
  }

  // .gitignore
  const gitignorePath = path.join(projectRoot, '.gitignore');
  if (fs.existsSync(gitignorePath)) {
    const gitignore = fs.readFileSync(gitignorePath, 'utf8');
    const covered =
      gitignore.includes('.claude/skills/') ||
      gitignore.includes('.claude/skills/*.md');
    if (covered) {
      ok('.gitignore covers .claude/skills/');
    } else {
      warn('.gitignore does not exclude .claude/skills/ — add: .claude/skills/*.md');
    }
  } else {
    warn('.gitignore not found — create one and add .claude/skills/*.md');
  }

  // Per-skill checks
  const skills = Object.entries(manifest.skills);
  for (const [name, skill] of skills) {
    console.log(`\n  Skill: ${name}`);

    if (BRANCH_LIKE.test(skill.version)) {
      fail(`version "${skill.version}" looks like a branch (use a git tag)`);
    } else {
      ok(`version ${skill.version}`);
    }

    if (!skill.resolvedCommit) fail('resolvedCommit is missing');
    if (!skill.sha256) fail('sha256 is missing');

    try {
      const resolvedCommit = await resolveTagCommit(skill.source, skill.version);
      if (resolvedCommit !== skill.resolvedCommit) {
        fail(
          `resolvedCommit mismatch\n` +
          `      manifest: ${skill.resolvedCommit}\n` +
          `      remote:   ${resolvedCommit}`
        );
      } else {
        ok('resolvedCommit matches remote');
      }

      const content = await downloadSkillFile(skill.source, name, skill.version);
      const sha256 = computeSha256(content);
      if (sha256 !== skill.sha256) {
        fail(
          `sha256 mismatch\n` +
          `      manifest: ${skill.sha256}\n` +
          `      computed: ${sha256}`
        );
      } else {
        ok('sha256 matches');
      }
    } catch (err) {
      fail(err.message);
    }
  }

  console.log();
  if (hasIssues) {
    console.log('Issues found. See details above.');
    process.exitCode = 1;
  } else {
    console.log('All checks passed.');
  }
}

module.exports = { doctorCommand };
