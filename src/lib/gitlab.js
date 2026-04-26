'use strict';

function parseGitLabSource(source) {
  const url = new URL(source);
  const host = `${url.protocol}//${url.host}`;
  const projectPath = url.pathname.replace(/^\//, '').replace(/\/$/, '');
  return { host, projectPath };
}

function getHeaders(token) {
  const headers = {
    'User-Agent': 'skills-cli/1.0',
  };
  if (token) {
    headers['PRIVATE-TOKEN'] = token;
  }
  return headers;
}

async function resolveTagCommit(source, version, token) {
  const { host, projectPath } = parseGitLabSource(source);
  const apiBase = `${host}/api/v4`;
  const encodedPath = encodeURIComponent(projectPath);
  const encodedTag = encodeURIComponent(version);

  const url = `${apiBase}/projects/${encodedPath}/repository/tags/${encodedTag}`;

  let response;
  try {
    response = await fetch(url, { headers: getHeaders(token) });
  } catch (err) {
    throw new Error(`Network error reaching ${host}: ${err.message}`);
  }

  if (response.status === 401 || response.status === 403) {
    throw new Error(
      `GitLab permission denied for ${source}.\n` +
      `Next step: set GITLAB_TOKEN or ask the Project maintainer for access.`
    );
  }

  if (response.status === 404) {
    throw new Error(`Tag "${version}" not found in ${source}.`);
  }

  if (!response.ok) {
    throw new Error(`GitLab API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  if (!data.commit || !data.commit.id) {
    throw new Error(`Unexpected response from GitLab API for tag "${version}".`);
  }

  return data.commit.id;
}

async function downloadSkillFile(source, skillName, version, token) {
  const { host, projectPath } = parseGitLabSource(source);
  const apiBase = `${host}/api/v4`;
  const encodedPath = encodeURIComponent(projectPath);
  const encodedFile = encodeURIComponent(`${skillName}.md`);

  const url = `${apiBase}/projects/${encodedPath}/repository/files/${encodedFile}/raw?ref=${encodeURIComponent(version)}`;

  let response;
  try {
    response = await fetch(url, {
      headers: { ...getHeaders(token), Accept: 'text/plain, application/octet-stream' },
    });
  } catch (err) {
    throw new Error(`Network error reaching ${host}: ${err.message}`);
  }

  if (response.status === 401 || response.status === 403) {
    throw new Error(
      `Cannot download ${skillName}@${version}.\n` +
      `Reason: GitLab permission denied.\n` +
      `Next step: set GITLAB_TOKEN or ask the Project maintainer for access.`
    );
  }

  if (response.status === 404) {
    throw new Error(
      `Skill file "${skillName}.md" not found in ${source} at version ${version}.`
    );
  }

  if (!response.ok) {
    throw new Error(
      `Failed to download ${skillName}@${version}: ${response.status} ${response.statusText}`
    );
  }

  return await response.text();
}

module.exports = { resolveTagCommit, downloadSkillFile, parseGitLabSource };
