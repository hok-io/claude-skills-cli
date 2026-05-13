'use strict';

const { execFile } = require('child_process');
const { promisify } = require('util');
const fs = require('fs');
const os = require('os');
const path = require('path');

const exec = promisify(execFile);

async function git(args) {
  try {
    const { stdout } = await exec('git', args, { maxBuffer: 50 * 1024 * 1024 });
    return stdout;
  } catch (err) {
    if (err.code === 'ENOENT') {
      throw new Error('git command not found. Install git and ensure it is on PATH.');
    }
    const msg = (err.stderr || err.message).trim();
    throw new Error(`git ${args[0]} failed: ${msg}`);
  }
}

async function withTempDir(fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'skills-cli-'));
  try {
    return await fn(dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

async function shallowClone(source, dir, ref) {
  // core.autocrlf=false / core.eol=lf keep file bytes identical across OSes,
  // so SHA-256 verification stays stable on Windows.
  const args = [
    '-c', 'core.autocrlf=false',
    '-c', 'core.eol=lf',
    'clone', '--depth', '1', '--quiet',
  ];
  if (ref) args.push('--branch', ref);
  args.push(source, dir);
  await git(args);
}

async function resolveTagCommit(source, version) {
  const stdout = await git(['ls-remote', '--tags', source, version]);
  const lines = stdout.trim().split('\n').filter(Boolean);
  if (lines.length === 0) {
    throw new Error(`Tag "${version}" not found in ${source}.`);
  }
  // For annotated tags, ls-remote returns both refs/tags/X and refs/tags/X^{};
  // the peeled (^{}) line is the underlying commit SHA.
  const deref = lines.find(l => l.endsWith('^{}'));
  const line = deref || lines[0];
  return line.split(/\s+/)[0];
}

function copyDirectory(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirectory(s, d);
    } else if (entry.isFile()) {
      fs.copyFileSync(s, d);
    }
    // Symlinks and special files are intentionally skipped.
  }
}

// Download a skill directory from the source repo into <destParent>/<name>/.
// Requires Anthropic Agent Skills spec layout: <source-root>/<name>/SKILL.md.
// Returns the absolute path of the copied directory.
async function downloadSkill(source, name, version, destParent) {
  return withTempDir(async (cloneDir) => {
    await shallowClone(source, cloneDir, version);
    const srcDir = path.join(cloneDir, name);
    const skillMd = path.join(srcDir, 'SKILL.md');
    if (!fs.existsSync(skillMd)) {
      throw new Error(
        `"${name}/SKILL.md" not found in ${source}@${version}. ` +
        `Source repo must follow the Agent Skills spec (folder-per-skill, uppercase SKILL.md).`
      );
    }
    const destDir = path.join(destParent, name);
    if (fs.existsSync(destDir)) fs.rmSync(destDir, { recursive: true, force: true });
    copyDirectory(srcDir, destDir);
    return destDir;
  });
}

// List skill names available in a source repo: root-level directories
// that contain a SKILL.md.
async function listSkillDirs(source) {
  return withTempDir(async (dir) => {
    await shallowClone(source, dir);
    const out = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      if (entry.name.startsWith('.')) continue; // skip .git, .github, etc.
      if (fs.existsSync(path.join(dir, entry.name, 'SKILL.md'))) {
        out.push(entry.name);
      }
    }
    return out.sort();
  });
}

async function listTags(source, limit = 5) {
  const stdout = await git(['ls-remote', '--tags', '--refs', source]);
  const tags = stdout.trim().split('\n').filter(Boolean).map(line =>
    line.split(/\s+/)[1].replace('refs/tags/', '')
  );
  tags.sort(compareSemverDesc);
  return tags.slice(0, limit);
}

function compareSemverDesc(a, b) {
  const parts = v => v.replace(/^v/, '').split(/[.+-]/);
  const ap = parts(a), bp = parts(b);
  for (let i = 0; i < Math.max(ap.length, bp.length); i++) {
    const ai = ap[i], bi = bp[i];
    if (ai === bi) continue;
    // shorter wins: 1.0.0 > 1.0.0-rc1 (release > prerelease)
    if (ai === undefined) return -1;
    if (bi === undefined) return 1;
    const an = parseInt(ai, 10), bn = parseInt(bi, 10);
    if (!isNaN(an) && !isNaN(bn) && an !== bn) return bn - an;
    return ai < bi ? 1 : -1;
  }
  return 0;
}

module.exports = { resolveTagCommit, downloadSkill, listSkillDirs, listTags };
