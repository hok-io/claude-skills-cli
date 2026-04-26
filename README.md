[中文版](README.zh-TW.md)

# claude-skills-cli

Manage versioned [Claude Code](https://claude.ai/code) Skills from your own GitHub or GitLab repo.

```bash
npm install -g github:hok-io/claude-skills-cli#v1.0.0
```

---

## What problem does this solve?

Claude Code Skills are `.md` files that give Claude reusable instructions. If your team stores them in a private repo, there is no built-in way to keep every machine on the same version.

**claude-skills-cli** works like a package manager for Skills:

- Pin skills to a git tag — everyone gets the same file
- Verify SHA-256 checksum on every install
- Detect force-pushed tags and stop before corrupting anything
- Works with private **GitHub** and **GitLab** repos

---

## How it works

You keep Skills in a separate repo (the _source repo_). Any project that needs them adds a `.claude/skills.json` manifest. The CLI syncs the files from the manifest.

```
Source repo                        Your project
github.com/myorg/skills            your-project/
  ├── prd.md          ──────────→  .claude/
  ├── review-pr.md    ──────────→  │  ├── skills.json   ← commit
  └── CHANGELOG.md                 │  └── skills/
                                   │       ├── prd.md   ← gitignore
                                   │       └── review-pr.md
```

Only `skills.json` is committed. The `.md` files are generated artifacts.

---

## Quick start

### 1. Set up your skills source repo

Create a repo with `.md` skill files in the root:

```
my-skills/
├── prd.md
├── review-pr.md
└── CHANGELOG.md
```

Tag a version:

```bash
git tag v1.0.0
git push --tags
```

### 2. Install the CLI

```bash
# From GitHub (no npm registry needed)
npm install -g github:hok-io/claude-skills-cli#v1.0.0
```

### 3. Add skills to your project

```bash
cd your-project

# GitHub
GITHUB_TOKEN=ghp_xxx skills add https://github.com/myorg/my-skills \
  --skill prd --version v1.0.0

# GitLab self-hosted
GITLAB_TOKEN=glpat-xxx skills add https://gitlab.mycompany.com/team/my-skills \
  --skill prd --version v1.0.0
```

This writes `.claude/skills.json` and downloads the `.md` file.

### 4. Add to `.gitignore`

```gitignore
.claude/skills/*.md
```

### 5. Team members sync after clone

```bash
GITHUB_TOKEN=ghp_xxx skills install
```

---

## Commands

| Command | Who | Changes `skills.json` | Description |
|---|---|:---:|---|
| `install` | Everyone | No | Sync `.claude/skills/` from manifest |
| `list` | Everyone | No | Show all skills and versions |
| `doctor` | Everyone | No | Diagnose environment and config |
| `add` | Maintainer | Yes | Add a skill |
| `upgrade` | Maintainer | Yes | Upgrade a skill to a new version |
| `remove` | Maintainer | Yes | Remove a skill |

---

## Installation options

### A) From GitHub (simplest)

```bash
# Pinned version (recommended)
npm install -g github:hok-io/claude-skills-cli#v1.0.0

# Always latest
npm install -g github:hok-io/claude-skills-cli
```

### B) From GitHub Packages

```bash
# One-time registry config
npm config set @hok-io:registry https://npm.pkg.github.com

# Install
npm install -g @hok-io/claude-skills-cli

# Or pin to a version
npm install -g @hok-io/claude-skills-cli@1.0.0
```

> Requires a GitHub token with `read:packages` scope.

### C) Local / offline

```bash
git clone https://github.com/hok-io/claude-skills-cli.git
cd claude-skills-cli
npm install
npm link
```

---

## Supported sources

| URL | Token env var |
|---|---|
| `https://github.com/...` | `GITHUB_TOKEN` |
| `https://gitlab.com/...` | `GITLAB_TOKEN` |
| `https://gitlab.yourcompany.com/...` | `GITLAB_TOKEN` |

The provider is detected automatically from the URL.

---

## `.claude/skills.json` schema

```json
{
  "schemaVersion": 1,
  "skills": {
    "prd": {
      "source": "https://github.com/myorg/my-skills",
      "version": "v1.0.0",
      "resolvedCommit": "8f3a9c1b2e4d5f6a7b8c9d0e1f2a3b4c5d6e7f8a",
      "sha256": "b6b5e1f8c2d4..."
    }
  }
}
```

`resolvedCommit` and `sha256` are written by the CLI. Do not edit them by hand.

---

## Safety guarantees

- `install` never modifies `skills.json`
- `install` is atomic — a failed download never corrupts existing skills
- Only git tags are accepted as versions (branches are rejected)
- If a tag is force-pushed after `add`, `install` stops with an error
- Every file is SHA-256 verified before being written

---

## Environment variables

| Variable | Description |
|---|---|
| `GITHUB_TOKEN` | Token for GitHub private repos |
| `GITLAB_TOKEN` | Token for GitLab private repos |
| `SKILLS_ALLOWED_SOURCES` | Comma-separated list of allowed source URL prefixes (optional) |

---

## License

MIT © [hok-io](https://github.com/hok-io)
