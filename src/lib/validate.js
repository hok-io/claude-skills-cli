'use strict';

const { checkSourceAllowed } = require('./policy');

const SKILL_NAME_PATTERN = /^[a-zA-Z0-9._-]+$/;
const VERSION_TAG_PATTERN = /^v?\d+\.\d+\.\d+/;
const BRANCH_LIKE_PATTERN = /^(main|master|develop|dev|staging|feature\/|release\/|hotfix\/)/;

function validateSkillName(name) {
  if (!name || typeof name !== 'string') {
    throw new Error('Skill name is required.');
  }
  if (name.includes('..') || name.includes('/') || name.includes('\\')) {
    throw new Error(`Invalid skill name: "${name}". "..", "/" and "\\" are not allowed.`);
  }
  if (!SKILL_NAME_PATTERN.test(name)) {
    throw new Error(`Invalid skill name: "${name}". Only a-z A-Z 0-9 . _ - are allowed.`);
  }
}

// SCP-like git URL: git@host:owner/repo(.git)? — what `git clone` accepts
const SCP_LIKE_PATTERN = /^git@[a-zA-Z0-9.\-]+:[a-zA-Z0-9._\-/]+$/;
const URL_PROTOCOLS = new Set(['https:', 'ssh:', 'file:']);

function validateSource(source, projectRoot) {
  if (!source || typeof source !== 'string') {
    throw new Error('Source is required.');
  }

  if (!SCP_LIKE_PATTERN.test(source)) {
    let url;
    try {
      url = new URL(source);
    } catch {
      throw new Error(
        `Invalid source: "${source}". Use https://, ssh://, or git@host:owner/repo.`
      );
    }

    if (!URL_PROTOCOLS.has(url.protocol)) {
      throw new Error(
        `Source must use https://, ssh://, or git@host:owner/repo: "${source}".`
      );
    }

    if (url.protocol === 'file:' && process.env.SKILLS_DEV !== '1') {
      throw new Error(
        `file:// sources are only allowed in dev mode. ` +
        `Set SKILLS_DEV=1 to enable (for source repo maintainers testing locally).`
      );
    }
  }

  const result = checkSourceAllowed(source, projectRoot);
  if (!result.allowed) {
    throw new Error(
      `Source "${source}" is not allowed by ${result.layer.name} (${result.layer.origin}).\n` +
      `Allowed prefixes: ${result.layer.prefixes.join(', ')}`
    );
  }
}

function validateVersion(version) {
  if (!version || typeof version !== 'string') {
    throw new Error('Version is required.');
  }
  if (BRANCH_LIKE_PATTERN.test(version)) {
    throw new Error(
      `Version "${version}" looks like a branch name. ` +
      `Only git tags are allowed (e.g., v1.2.0).`
    );
  }
  if (!VERSION_TAG_PATTERN.test(version)) {
    throw new Error(
      `Version "${version}" does not look like a tag. ` +
      `Use a semver tag like v1.2.0.`
    );
  }
}

module.exports = { validateSkillName, validateSource, validateVersion };
