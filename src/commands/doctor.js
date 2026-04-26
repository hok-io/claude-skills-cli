'use strict';

const path = require('path');
const fs = require('fs');
const { readManifest, MANIFEST_PATH } = require('../lib/manifest');
const { resolveTagCommit, downloadSkillFile, detectProvider, getToken } = require('../lib/provider');
const { computeSha256 } = require('../lib/checksum');

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

  // Manifest exists
  const manifestPath = path.join(projectRoot, MANIFEST_PATH);
  if (!fs.existsSync(manifestPath)) {
    fail(`${MANIFEST_PATH} not found`);
    console.log('\nIssues found. Run "skills add" to initialize.');
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

  // Tokens (report once per provider actually used)
  const usedProviders = new Set(
    Object.values(manifest.skills).map(s => detectProvider(s.source))
  );
  for (const provider of usedProviders) {
    const envVar = provider === 'github' ? 'GITHUB_TOKEN' : 'GITLAB_TOKEN';
    if (getToken(provider)) {
      ok(`${envVar} is set (${provider})`);
    } else {
      warn(`${envVar} is not set — private ${provider} repos will fail`);
    }
  }

  // Per-skill checks
  const skills = Object.entries(manifest.skills);
  for (const [name, skill] of skills) {
    console.log(`\n  Skill: ${name} [${detectProvider(skill.source)}]`);

    if (BRANCH_LIKE.test(skill.version)) {
      fail(`version "${skill.version}" looks like a branch (use a git tag)`);
    } else {
      ok(`version ${skill.version}`);
    }

    if (!skill.resolvedCommit) fail('resolvedCommit is missing');
    if (!skill.sha256) fail('sha256 is missing');

    try {
      const resolvedCommit = await resolveTagCommit(skill.source, skill.version, null);
      if (resolvedCommit !== skill.resolvedCommit) {
        fail(
          `resolvedCommit mismatch\n` +
          `      manifest: ${skill.resolvedCommit}\n` +
          `      remote:   ${resolvedCommit}`
        );
      } else {
        ok('resolvedCommit matches remote');
      }

      const content = await downloadSkillFile(skill.source, name, skill.version, null);
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
      const isAuth =
        err.message.includes('permission denied') ||
        err.message.includes('GitLab permission') ||
        err.message.includes('GitHub permission');
      if (isAuth) {
        warn(err.message);
      } else {
        fail(err.message);
      }
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
