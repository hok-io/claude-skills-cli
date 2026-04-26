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

async function downloadSkillFile(source, name, version) {
  return withTempDir(async (dir) => {
    await shallowClone(source, dir, version);
    const file = path.join(dir, `${name}.md`);
    if (!fs.existsSync(file)) {
      throw new Error(`"${name}.md" not found in ${source}@${version}.`);
    }
    return fs.readFileSync(file, 'utf8');
  });
}

async function listSkillFiles(source) {
  return withTempDir(async (dir) => {
    await shallowClone(source, dir);
    return fs.readdirSync(dir)
      .filter(f => f.endsWith('.md'))
      .map(f => f.slice(0, -3))
      .sort();
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

module.exports = { resolveTagCommit, downloadSkillFile, listSkillFiles, listTags };
