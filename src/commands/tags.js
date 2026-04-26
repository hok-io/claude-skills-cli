'use strict';

const { readManifest } = require('../lib/manifest');
const { listTags } = require('../lib/provider');

async function tagsCommand(source, projectRoot) {
  const manifest = readManifest(projectRoot);

  // Find current version of any skill that uses this source
  const installedAtSource = {};
  if (manifest) {
    for (const [name, skill] of Object.entries(manifest.skills)) {
      if (skill.source === source) {
        installedAtSource[name] = skill.version;
      }
    }
  }

  console.log(`Fetching latest tags from ${source}...\n`);

  const tags = await listTags(source, 5);

  if (tags.length === 0) {
    console.log('No tags found.');
    return;
  }

  const installedVersions = new Set(Object.values(installedAtSource));

  for (const tag of tags) {
    const marker = installedVersions.has(tag) ? ' [installed]' : '';
    console.log(`  ${tag}${marker}`);
  }

  if (Object.keys(installedAtSource).length > 0) {
    const pairs = Object.entries(installedAtSource).map(([n, v]) => `${n}@${v}`).join(', ');
    console.log(`\nCurrently installed: ${pairs}`);
  }
}

module.exports = { tagsCommand };
