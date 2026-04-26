[中文版](README.zh-TW.md)

# claude-skills-cli

Manage versioned [Claude Code](https://claude.ai/code) Skills from your own GitHub or GitLab repo.

```bash
npm install -g github:hok-io/claude-skills-cli#v1.1.0-alpha
```

---

## What problem does this solve?

Claude Code Skills are `.md` files that give Claude reusable instructions. If your team stores them in a private repo, there is no built-in way to keep every machine on the same version.

**claude-skills-cli** works like a package manager for Skills:

- Pin skills to a git tag — everyone gets the same file
- Verify SHA-256 checksum on every install
- Detect force-pushed tags and stop before corrupting anything
- **No tokens to manage** — uses your existing `git` auth (SSH key, credential helper, `gh auth`, SSO… anything `git clone` accepts)

---

## Who is this for?

Three roles work around Claude Skills. **This CLI covers the first two** — the third is just plain git, no special tooling required.

| Role | Works in | Responsible for |
|---|---|---|
| **Team member** | A project that uses skills | Runs `skills install` after pulling new commits — gets the `.md` files matching what the project pinned |
| **Project maintainer** | The same project's `.claude/skills.json` | Decides which skills the project uses and which versions it pins |
| **Skill source maintainer** | A separate skills repo (the _source repo_) | Writes the `.md` skill files; tags new versions |

Skill source maintainers don't use this CLI — they just `git tag` and `git push`. See the **[team skills template](https://github.com/hok-io/team-skills-template)** for what that side looks like (file layout, frontmatter, tagging conventions).

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

> Need a starting point? Use the **[team-skills-template repo](https://github.com/hok-io/team-skills-template)** — it shows the expected file layout, frontmatter, and versioning conventions.

### 2. Install the CLI

```bash
# From GitHub (no npm registry needed)
npm install -g github:hok-io/claude-skills-cli#v1.1.0-alpha
```

### 3. Add skills to your project

```bash
cd your-project

# GitHub, GitLab, self-hosted — anything git can clone
skills skill add https://github.com/myorg/my-skills --skill prd --version v1.0.0
```

If `git clone <url>` works on your machine, this works too. No tokens to set up.

This writes `.claude/skills.json` and downloads the `.md` file.

### 4. Add to `.gitignore`

```gitignore
.claude/skills/*.md
```

### 5. Team members sync after clone

```bash
skills install
```

---

## Commands

Grouped by who uses them. Run `skills --help`, `skills skill --help`, `skills remote --help`, or any subcommand with `--help` for examples.

### For team members (read-only)

| Command | Description |
|---|---|
| `skills install` | Sync `.claude/skills/` from manifest |
| `skills list` | Show locally installed skills and versions |
| `skills doctor` | Diagnose environment and config |

### For project maintainers (modifies `skills.json`)

| Command | Description |
|---|---|
| `skills skill add <source> --skill <name> --version <tag>` | Add a new skill |
| `skills skill upgrade <name>@<version>` | Upgrade one skill to a specific version |
| `skills skill upgrade --all` | Upgrade every skill to its latest tag |
| `skills skill remove <name>` | Remove a skill |

### Discover (everyone, hits remote, read-only)

| Command | Description |
|---|---|
| `skills remote search <source>` | List `.md` skills available in a remote repo |
| `skills remote tags <source>` | Show the latest 5 tags of a remote repo |
| `skills remote outdated` | Check installed skills for newer tags on their remote |
| `skills remote available` | List skills in your manifest sources that are not installed locally |

---

## Common workflows

### Discover what's available before adding

```bash
# What skills does this repo offer?
skills remote search https://github.com/myorg/my-skills

# What versions exist?
skills remote tags https://github.com/myorg/my-skills

# Add the one you want
skills skill add https://github.com/myorg/my-skills --skill prd --version v1.2.0
```

### Upgrade routinely

```bash
# What's behind latest across all installed skills?
skills remote outdated

# Upgrade just one
skills skill upgrade prd@v1.3.0

# Or bump everything to latest
skills skill upgrade --all
```

### See what else the repos you already use offer

```bash
skills remote available
```

After any maintainer change, commit the updated `.claude/skills.json` so teammates can `skills install`.

---

## Installation options

### A) From GitHub (simplest)

```bash
# Pinned version (recommended)
npm install -g github:hok-io/claude-skills-cli#v1.1.0-alpha

# Always latest
npm install -g github:hok-io/claude-skills-cli
```

### B) Local / offline

```bash
git clone https://github.com/hok-io/claude-skills-cli.git
cd claude-skills-cli
npm install
npm link
```

---

## Requirements

- Node.js >= 18
- `git` on PATH

The CLI shells out to `git` for every fetch. Whatever auth your `git` is configured with (SSH key, OS credential helper, `gh auth`, corporate SSO…) is what the CLI uses. There is nothing extra to configure.

---

## Supported sources

Any HTTPS URL that `git clone` accepts:

- `https://github.com/owner/repo`
- `https://gitlab.com/group/repo`
- `https://gitlab.yourcompany.com/team/repo`
- Any self-hosted git server

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
- If a tag is force-pushed after `skills skill add`, `install` stops with an error
- Every file is SHA-256 verified before being written

---

## Environment variables

| Variable | Description |
|---|---|
| `SKILLS_ALLOWED_SOURCES` | Comma-separated list of allowed source URL prefixes (optional, for org policy) |

---

## License

MIT © [hok-io](https://github.com/hok-io)
