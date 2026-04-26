'use strict';

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

function validateSource(source) {
  if (!source || typeof source !== 'string') {
    throw new Error('Source is required.');
  }

  let url;
  try {
    url = new URL(source);
  } catch {
    throw new Error(`Invalid source URL: "${source}".`);
  }

  if (url.protocol !== 'https:') {
    throw new Error(`Source must use HTTPS: "${source}".`);
  }

  const allowedSources = process.env.SKILLS_ALLOWED_SOURCES;
  if (allowedSources) {
    const allowed = allowedSources.split(',').map(s => s.trim());
    const isAllowed = allowed.some(prefix => source.startsWith(prefix));
    if (!isAllowed) {
      throw new Error(
        `Source "${source}" is not in the allowed sources list.\n` +
        `Allowed: ${allowed.join(', ')}`
      );
    }
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
