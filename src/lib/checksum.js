'use strict';

const { createHash } = require('crypto');

function computeSha256(content) {
  return createHash('sha256').update(content, 'utf8').digest('hex');
}

module.exports = { computeSha256 };
