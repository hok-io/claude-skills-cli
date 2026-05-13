'use strict';

const { createHash } = require('crypto');
const fs = require('fs');
const path = require('path');

function computeSha256(content) {
  return createHash('sha256').update(content, 'utf8').digest('hex');
}

function walkFiles(dir, base = dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walkFiles(full, base));
    } else if (entry.isFile()) {
      out.push(path.relative(base, full));
    }
  }
  return out;
}

// Deterministic hash of a skill directory:
// for every file (sorted by POSIX-style relative path), hash its raw bytes,
// then hash the concatenated "<path> <fileSha>" lines. Detects any byte change
// in any file under the skill, including references/, scripts/, assets/.
function computeFolderSha256(folderPath) {
  const rels = walkFiles(folderPath)
    .map((rel) => rel.split(path.sep).join('/'))
    .sort();
  const lines = rels.map((rel) => {
    const buf = fs.readFileSync(path.join(folderPath, ...rel.split('/')));
    const fileHash = createHash('sha256').update(buf).digest('hex');
    return `${rel} ${fileHash}`;
  });
  return createHash('sha256').update(lines.join('\n'), 'utf8').digest('hex');
}

module.exports = { computeSha256, computeFolderSha256 };
