'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

const POLICY_FILENAME = 'skills.policy.json';
const SCHEMA_VERSION = 1;

function projectPolicyPath(projectRoot) {
  return path.join(projectRoot, '.claude', POLICY_FILENAME);
}

function userPolicyPath() {
  return path.join(os.homedir(), '.claude', POLICY_FILENAME);
}

function readPolicyFile(filePath) {
  if (!fs.existsSync(filePath)) return null;

  let content;
  try {
    content = fs.readFileSync(filePath, 'utf8');
  } catch (err) {
    throw new Error(`Cannot read ${filePath}: ${err.message}`);
  }

  let policy;
  try {
    policy = JSON.parse(content);
  } catch {
    throw new Error(`${filePath} is invalid JSON.`);
  }

  if (policy.schemaVersion !== SCHEMA_VERSION) {
    throw new Error(
      `Unsupported schemaVersion in ${filePath}: ${policy.schemaVersion}. Expected ${SCHEMA_VERSION}.`
    );
  }

  return policy;
}

// Each layer contributes a restrictive allowlist. A source must match at least
// one prefix in *every* layer that has rules. Layers without an allowedSources
// list (or with an empty list) do not restrict.
function getAllowlistLayers(projectRoot) {
  const layers = [];

  const userPolicy = readPolicyFile(userPolicyPath());
  if (userPolicy && Array.isArray(userPolicy.allowedSources) && userPolicy.allowedSources.length > 0) {
    layers.push({
      name: 'user policy',
      origin: userPolicyPath(),
      prefixes: userPolicy.allowedSources,
    });
  }

  if (projectRoot) {
    const projectPolicy = readPolicyFile(projectPolicyPath(projectRoot));
    if (projectPolicy && Array.isArray(projectPolicy.allowedSources) && projectPolicy.allowedSources.length > 0) {
      layers.push({
        name: 'project policy',
        origin: projectPolicyPath(projectRoot),
        prefixes: projectPolicy.allowedSources,
      });
    }
  }

  const envValue = process.env.SKILLS_ALLOWED_SOURCES;
  if (envValue) {
    const prefixes = envValue.split(',').map(s => s.trim()).filter(Boolean);
    if (prefixes.length > 0) {
      layers.push({
        name: 'env SKILLS_ALLOWED_SOURCES',
        origin: 'environment',
        prefixes,
      });
    }
  }

  return layers;
}

function checkSourceAllowed(source, projectRoot) {
  const layers = getAllowlistLayers(projectRoot);
  for (const layer of layers) {
    const matches = layer.prefixes.some(p => source.startsWith(p));
    if (!matches) {
      return { allowed: false, layer };
    }
  }
  return { allowed: true };
}

module.exports = {
  checkSourceAllowed,
  getAllowlistLayers,
  projectPolicyPath,
  userPolicyPath,
  POLICY_FILENAME,
};
