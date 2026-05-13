'use strict';

const path = require('path');
const fs = require('fs');
const os = require('os');
const { execFile } = require('child_process');
const { promisify } = require('util');
const { readManifest, MANIFEST_PATH } = require('../lib/manifest');
const { resolveTagCommit, downloadSkill } = require('../lib/provider');
const { computeFolderSha256 } = require('../lib/checksum');
const { getAllowlistLayers } = require('../lib/policy');

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

  // Effective source allowlist policy
  let policyLayers = [];
  try {
    policyLayers = getAllowlistLayers(projectRoot);
  } catch (err) {
    fail(`Policy error: ${err.message}`);
  }
  if (policyLayers.length === 0) {
    ok('Source allowlist: none (all sources allowed)');
  } else {
    ok(`Source allowlist active (${policyLayers.length} layer(s)):`);
    for (const layer of policyLayers) {
      console.log(`      • ${layer.name} [${layer.origin}]: ${layer.prefixes.join(', ')}`);
    }
  }

  // .gitignore
  const gitignorePath = path.join(projectRoot, '.gitignore');
  if (fs.existsSync(gitignorePath)) {
    const gitignore = fs.readFileSync(gitignorePath, 'utf8');
    const covered =
      gitignore.includes('.claude/skills/**') ||
      gitignore.includes('.claude/skills/') ||
      gitignore.includes('.claude/skills/*.md'); // legacy entry from v1.x init
    if (covered) {
      ok('.gitignore covers .claude/skills/');
    } else {
      warn('.gitignore does not exclude .claude/skills/ — add: .claude/skills/**');
    }
  } else {
    warn('.gitignore not found — create one and add .claude/skills/**');
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

      const tmpParent = fs.mkdtempSync(path.join(os.tmpdir(), 'skills-doctor-'));
      try {
        const destDir = await downloadSkill(skill.source, name, skill.version, tmpParent);
        const sha256 = computeFolderSha256(destDir);
        if (sha256 !== skill.sha256) {
          fail(
            `sha256 mismatch\n` +
            `      manifest: ${skill.sha256}\n` +
            `      computed: ${sha256}`
          );
        } else {
          ok('sha256 matches');
        }
      } finally {
        fs.rmSync(tmpParent, { recursive: true, force: true });
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
