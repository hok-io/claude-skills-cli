[中文版](README.zh-TW.md)

# claude-skills-cli

A CLI tool for managing Claude Skills across your team. One committed manifest file keeps every machine in sync with the same skill versions.

## How it works

```
Your Skills Repo (GitHub / GitLab)     Your Project
──────────────────────────────────     ─────────────────────────────
github.com/myorg/skills                your-project/
  ├── prd.md            ────────────→  .claude/
  ├── review-pr.md      ────────────→  │  ├── skills.json  ← commit this
  └── ...                              │  └── skills/
                                       │       ├── prd.md   ← gitignore
                                       │       └── review-pr.md
```

Only `.claude/skills.json` is committed. The `.md` files are generated — delete and re-run `install` anytime.

## Requirements

- Node.js 18 or above
- A skills repo on **GitHub** or **GitLab** (public or private)
- For private repos: `GITHUB_TOKEN` or `GITLAB_TOKEN`

## Installation

There are three ways to install, depending on your use case.

### A) Install from GitHub (no npm publish required)

Pin to a specific version (recommended):

```bash
npm install -g github:hok-io/claude-skills-cli#v1.0.0
```

Or always get the latest:

```bash
npm install -g github:hok-io/claude-skills-cli
```

After install, use the `skills` command directly:

```bash
skills install
skills list
```

> For private repos, `GITHUB_TOKEN` must be set when installing.

### B) GitHub Packages (recommended for teams)

Publish to your org's GitHub Packages registry so the whole team installs the same version:

```bash
# Configure registry (one time)
npm config set @hok-io:registry https://npm.pkg.github.com

# Install
npm install -g @hok-io/claude-skills-cli

# Use
skills install
```

> Requires `GITHUB_TOKEN` with `read:packages` scope.

### C) Local / offline (clone and link)

```bash
git clone https://github.com/hok-io/claude-skills-cli.git
cd claude-skills-cli
npm install
npm link
```

After linking, the `skills` command is available globally without any registry or internet access.

```bash
skills install
skills list
```

## Supported Sources

| Source | Token env var |
|---|---|
| `https://github.com/...` | `GITHUB_TOKEN` |
| `https://gitlab.com/...` | `GITLAB_TOKEN` |
| `https://gitlab.yourcompany.com/...` | `GITLAB_TOKEN` |

The provider is detected automatically from the URL. No extra config needed.

## Commands

| Command | Who | Modifies `skills.json` | Description |
|---|---|:---:|---|
| `install` | Everyone | No | Sync `.claude/skills/` from manifest |
| `list` | Everyone | No | Show all skills |
| `doctor` | Everyone | No | Diagnose environment and config |
| `add` | Maintainer | Yes | Add a skill |
| `upgrade` | Maintainer | Yes | Upgrade a skill version |
| `remove` | Maintainer | Yes | Remove a skill |

## Usage

**After cloning a project:**

```bash
skills install
```

**Add a skill (GitHub):**

```bash
GITHUB_TOKEN=ghp_xxx skills add https://github.com/myorg/skills \
  --skill prd \
  --version v1.2.0
```

**Add a skill (GitLab self-hosted):**

```bash
GITLAB_TOKEN=glpat-xxx skills add https://gitlab.mycompany.com/team/skills \
  --skill prd \
  --version v1.2.0
```

**Upgrade a skill:**

```bash
skills upgrade prd@v1.3.0
```

**Remove a skill:**

```bash
skills remove prd
```

**List installed skills:**

```bash
skills list
# prd        v1.2.0  https://github.com/myorg/skills
# review-pr  v2.0.0  https://github.com/myorg/skills
```

**Diagnose issues:**

```bash
skills doctor
```

## `.claude/skills.json`

```json
{
  "schemaVersion": 1,
  "skills": {
    "prd": {
      "source": "https://github.com/myorg/skills",
      "version": "v1.2.0",
      "resolvedCommit": "8f3a9c1b2e4d5f6a7b8c9d0e1f2a3b4c5d6e7f8a",
      "sha256": "b6b5e1f8c2d4..."
    }
  }
}
```

Never edit `resolvedCommit` or `sha256` by hand — they are written by the CLI.

## `.gitignore`

```gitignore
.claude/skills/*.md
```

## Safety guarantees

- `install` never modifies `skills.json`
- `install` is atomic — a failed download never corrupts existing skills
- Only git tags are accepted as versions (branches are rejected)
- If a tag is force-pushed, `install` stops with an error
- Every skill file is verified with SHA-256 before being written

## Environment variables

| Variable | Description |
|---|---|
| `GITHUB_TOKEN` | Personal access token for GitHub private repos |
| `GITLAB_TOKEN` | Personal access token for GitLab private repos |
| `SKILLS_ALLOWED_SOURCES` | Comma-separated list of allowed source URL prefixes (optional) |

## License

MIT
