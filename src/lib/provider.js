'use strict';

// Detect provider from URL host
function detectProvider(source) {
  const { host } = new URL(source);
  if (host === 'github.com' || host.endsWith('.github.com')) return 'github';
  return 'gitlab';
}

function getToken(provider) {
  if (provider === 'github') return process.env.GITHUB_TOKEN;
  return process.env.GITLAB_TOKEN;
}

function getHeaders(provider, token) {
  const headers = { 'User-Agent': 'skills-cli/1.0' };
  if (!token) return headers;
  if (provider === 'github') {
    headers['Authorization'] = `Bearer ${token}`;
    headers['X-GitHub-Api-Version'] = '2022-11-28';
  } else {
    headers['PRIVATE-TOKEN'] = token;
  }
  return headers;
}

// ---------- GitLab ----------

function parseGitLabSource(source) {
  const url = new URL(source);
  const host = `${url.protocol}//${url.host}`;
  const projectPath = url.pathname.replace(/^\//, '').replace(/\/$/, '');
  return { host, projectPath };
}

async function gitlabResolveTagCommit(source, version, token) {
  const { host, projectPath } = parseGitLabSource(source);
  const encodedPath = encodeURIComponent(projectPath);
  const url = `${host}/api/v4/projects/${encodedPath}/repository/tags/${encodeURIComponent(version)}`;

  let res;
  try {
    res = await fetch(url, { headers: getHeaders('gitlab', token) });
  } catch (err) {
    throw new Error(`Network error reaching ${host}: ${err.message}`);
  }

  if (res.status === 401 || res.status === 403) {
    throw new Error(
      `GitLab permission denied for ${source}.\n` +
      `Next step: set GITLAB_TOKEN or ask the Project maintainer for access.`
    );
  }
  if (res.status === 404) throw new Error(`Tag "${version}" not found in ${source}.`);
  if (!res.ok) throw new Error(`GitLab API error: ${res.status} ${res.statusText}`);

  const data = await res.json();
  if (!data.commit?.id) throw new Error(`Unexpected GitLab API response for tag "${version}".`);
  return data.commit.id;
}

async function gitlabDownloadFile(source, skillName, version, token) {
  const { host, projectPath } = parseGitLabSource(source);
  const encodedPath = encodeURIComponent(projectPath);
  const encodedFile = encodeURIComponent(`${skillName}.md`);
  const url = `${host}/api/v4/projects/${encodedPath}/repository/files/${encodedFile}/raw?ref=${encodeURIComponent(version)}`;

  let res;
  try {
    res = await fetch(url, {
      headers: { ...getHeaders('gitlab', token), Accept: 'text/plain, application/octet-stream' },
    });
  } catch (err) {
    throw new Error(`Network error: ${err.message}`);
  }

  if (res.status === 401 || res.status === 403) {
    throw new Error(
      `Cannot download ${skillName}@${version}.\n` +
      `Reason: GitLab permission denied.\n` +
      `Next step: set GITLAB_TOKEN or ask the Project maintainer for access.`
    );
  }
  if (res.status === 404) throw new Error(`"${skillName}.md" not found in ${source}@${version}.`);
  if (!res.ok) throw new Error(`Failed to download ${skillName}@${version}: ${res.status}`);
  return res.text();
}

// ---------- GitHub ----------

function parseGitHubSource(source) {
  const url = new URL(source);
  const parts = url.pathname.replace(/^\//, '').replace(/\/$/, '').split('/');
  if (parts.length < 2) throw new Error(`Invalid GitHub URL: "${source}".`);
  const owner = parts[0];
  const repo = parts[1];
  return { owner, repo };
}

async function githubResolveTagCommit(source, version, token) {
  const { owner, repo } = parseGitHubSource(source);
  const tag = version.startsWith('refs/') ? version : `refs/tags/${version}`;
  const url = `https://api.github.com/repos/${owner}/${repo}/git/${encodeURIComponent(tag)}`;

  let res;
  try {
    res = await fetch(url, {
      headers: { ...getHeaders('github', token), Accept: 'application/vnd.github+json' },
    });
  } catch (err) {
    throw new Error(`Network error reaching GitHub: ${err.message}`);
  }

  if (res.status === 401 || res.status === 403) {
    throw new Error(
      `GitHub permission denied for ${source}.\n` +
      `Next step: set GITHUB_TOKEN or ask the Project maintainer for access.`
    );
  }
  if (res.status === 404) throw new Error(`Tag "${version}" not found in ${source}.`);
  if (!res.ok) throw new Error(`GitHub API error: ${res.status} ${res.statusText}`);

  const data = await res.json();

  // Lightweight tag → object.type === "commit"
  // Annotated tag → object.type === "tag", need to dereference
  if (data.object?.type === 'commit') return data.object.sha;

  if (data.object?.type === 'tag') {
    const tagUrl = `https://api.github.com/repos/${owner}/${repo}/git/tags/${data.object.sha}`;
    const tagRes = await fetch(tagUrl, {
      headers: { ...getHeaders('github', token), Accept: 'application/vnd.github+json' },
    });
    const tagData = await tagRes.json();
    return tagData.object?.sha ?? (() => { throw new Error(`Cannot resolve annotated tag "${version}".`); })();
  }

  throw new Error(`Unexpected GitHub API response for tag "${version}".`);
}

async function githubDownloadFile(source, skillName, version, token) {
  const { owner, repo } = parseGitHubSource(source);
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${skillName}.md?ref=${encodeURIComponent(version)}`;

  let res;
  try {
    res = await fetch(url, {
      headers: { ...getHeaders('github', token), Accept: 'application/vnd.github.raw+json' },
    });
  } catch (err) {
    throw new Error(`Network error: ${err.message}`);
  }

  if (res.status === 401 || res.status === 403) {
    throw new Error(
      `Cannot download ${skillName}@${version}.\n` +
      `Reason: GitHub permission denied.\n` +
      `Next step: set GITHUB_TOKEN or ask the Project maintainer for access.`
    );
  }
  if (res.status === 404) throw new Error(`"${skillName}.md" not found in ${source}@${version}.`);
  if (!res.ok) throw new Error(`Failed to download ${skillName}@${version}: ${res.status}`);
  return res.text();
}

// ---------- Unified API ----------

async function resolveTagCommit(source, version, token) {
  const provider = detectProvider(source);
  const tok = token ?? getToken(provider);
  if (provider === 'github') return githubResolveTagCommit(source, version, tok);
  return gitlabResolveTagCommit(source, version, tok);
}

async function downloadSkillFile(source, skillName, version, token) {
  const provider = detectProvider(source);
  const tok = token ?? getToken(provider);
  if (provider === 'github') return githubDownloadFile(source, skillName, version, tok);
  return gitlabDownloadFile(source, skillName, version, tok);
}

module.exports = { resolveTagCommit, downloadSkillFile, detectProvider, getToken };
