'use strict';

const path = require('path');
const fs = require('fs');

const MANIFEST_PATH = '.claude/skills.json';
const SCHEMA_VERSION = 1;

function getManifestPath(projectRoot) {
  return path.join(projectRoot, MANIFEST_PATH);
}

function readManifest(projectRoot) {
  const filePath = getManifestPath(projectRoot);

  if (!fs.existsSync(filePath)) {
    return null;
  }

  let content;
  try {
    content = fs.readFileSync(filePath, 'utf8');
  } catch (err) {
    throw new Error(`Cannot read ${MANIFEST_PATH}: ${err.message}`);
  }

  let manifest;
  try {
    manifest = JSON.parse(content);
  } catch {
    throw new Error(`${MANIFEST_PATH} is invalid JSON.`);
  }

  if (manifest.schemaVersion !== SCHEMA_VERSION) {
    throw new Error(
      `Unsupported schemaVersion: ${manifest.schemaVersion}. Expected: ${SCHEMA_VERSION}.`
    );
  }

  if (!manifest.skills || typeof manifest.skills !== 'object') {
    throw new Error(`${MANIFEST_PATH} is missing the "skills" field.`);
  }

  return manifest;
}

function writeManifest(projectRoot, manifest) {
  const filePath = getManifestPath(projectRoot);
  const dir = path.dirname(filePath);

  fs.mkdirSync(dir, { recursive: true });

  const content = JSON.stringify(manifest, null, 2) + '\n';
  const tmpPath = filePath + '.tmp';
  fs.writeFileSync(tmpPath, content, 'utf8');
  fs.renameSync(tmpPath, filePath);
}

function createEmptyManifest() {
  return {
    schemaVersion: SCHEMA_VERSION,
    skills: {},
  };
}

module.exports = { readManifest, writeManifest, createEmptyManifest, MANIFEST_PATH };
