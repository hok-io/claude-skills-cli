Language: [English](#english) | [中文](#中文)

---

<h2 id="english">Skills CLI</h2>

A CLI tool for managing [Claude](https://claude.ai) Skills in your project. It keeps `.claude/skills/` in sync across machines from a single committed manifest file.

### How it works

```
Skills Repo (GitLab)      CLI                          Your Project
myorg/skills              npx skills-cli               your-project/
├── prd.md          →     install / add / upgrade  →   .claude/
├── review-pr.md                                        ├── skills.json  ← commit
└── CHANGELOG.md                                        └── skills/
Tagged: v1.0.0, v1.1.0                                      ├── prd.md   ← gitignore
                                                             └── review-pr.md
```

Only `.claude/skills.json` is committed. The `.md` files are generated artifacts.

### Requirements

- Node.js 18 or above
- GitLab access token for private repos (`GITLAB_TOKEN`)

### Installation

```bash
npm install -g skills-cli
# or use directly with npx:
npx skills-cli <command>
```

### Commands

| Command | Who | Modifies `skills.json` | Description |
|---|---|:---:|---|
| `install` | Everyone | No | Sync `.claude/skills/` from manifest |
| `list` | Everyone | No | Show all skills in manifest |
| `doctor` | Everyone | No | Diagnose environment and config |
| `add` | Maintainer | Yes | Add a new skill |
| `upgrade` | Maintainer | Yes | Upgrade a skill version |
| `remove` | Maintainer | Yes | Remove a skill |

### Usage

**First-time setup after clone:**

```bash
npx skills-cli install
```

**Add a skill:**

```bash
npx skills-cli add https://gitlab.example.com/myorg/skills \
  --skill prd \
  --version v1.2.0
```

**Upgrade a skill:**

```bash
npx skills-cli upgrade prd@v1.3.0
```

**Remove a skill:**

```bash
npx skills-cli remove prd
```

**List skills:**

```bash
npx skills-cli list
# prd        v1.2.0  https://gitlab.example.com/myorg/skills
# review-pr  v2.0.0  https://gitlab.example.com/myorg/skills
```

**Diagnose issues:**

```bash
npx skills-cli doctor
```

### GitLab Token

For private repositories, pass your token via environment variable:

```bash
GITLAB_TOKEN=xxxxx npx skills-cli install
```

The token is never written to any file or logged.

### `.claude/skills.json` schema

```json
{
  "schemaVersion": 1,
  "skills": {
    "prd": {
      "source": "https://gitlab.example.com/myorg/skills",
      "version": "v1.2.0",
      "resolvedCommit": "8f3a9c1b2e4d5f6a7b8c9d0e1f2a3b4c5d6e7f8a",
      "sha256": "b6b5e1f8c2d4..."
    }
  }
}
```

Do not edit `resolvedCommit` or `sha256` by hand — they are managed by the CLI.

### Project `.gitignore`

```gitignore
# Skills are generated from .claude/skills.json
.claude/skills/*.md
```

### Source allowlist

By default, any `https://` GitLab URL is allowed. To restrict to specific hosts:

```bash
SKILLS_ALLOWED_SOURCES="https://gitlab.example.com/" npx skills-cli add ...
```

### Safety guarantees

- `install` never modifies `.claude/skills.json`.
- `install` is atomic — a failed download never corrupts the existing `.claude/skills/`.
- Only git tags are accepted as versions (branches are rejected).
- Tag-to-commit pinning: if the tag is force-pushed, `install` will refuse with an error.
- SHA-256 checksum verification for every skill file.

---

<h2 id="中文">Skills CLI</h2>

為 [Claude](https://claude.ai) Skills 設計的 CLI 管理工具，讓團隊可以透過一份版本控制的 manifest 檔案，在不同機器上同步相同的 Skill 內容。

### 運作方式

```
Skills Repo (GitLab)      CLI                          你的 Project
myorg/skills              npx skills-cli               your-project/
├── prd.md          →     install / add / upgrade  →   .claude/
├── review-pr.md                                        ├── skills.json  ← 要 commit
└── CHANGELOG.md                                        └── skills/
Tagged: v1.0.0, v1.1.0                                      ├── prd.md   ← 不 commit
                                                             └── review-pr.md
```

只需要 commit `.claude/skills.json`，`.md` 檔案是 CLI 產生的產物。

### 環境需求

- Node.js 18 以上
- 存取 private repo 需要 GitLab Token（`GITLAB_TOKEN`）

### 安裝

```bash
npm install -g skills-cli
# 或直接用 npx：
npx skills-cli <指令>
```

### 指令總覽

| 指令 | 使用者 | 是否修改 `skills.json` | 說明 |
|---|---|:---:|---|
| `install` | 所有人 | 否 | 根據 manifest 同步本機 Skills |
| `list` | 所有人 | 否 | 查看 Project 使用哪些 Skills |
| `doctor` | 所有人 | 否 | 檢查環境與設定 |
| `add` | Project 維護者 | 是 | 新增 Skill |
| `upgrade` | Project 維護者 | 是 | 升級 Skill 版本 |
| `remove` | Project 維護者 | 是 | 移除 Skill |

### 使用方式

**第一次 clone 後同步：**

```bash
npx skills-cli install
```

**新增 Skill：**

```bash
npx skills-cli add https://gitlab.example.com/myorg/skills \
  --skill prd \
  --version v1.2.0
```

**升級 Skill：**

```bash
npx skills-cli upgrade prd@v1.3.0
```

**移除 Skill：**

```bash
npx skills-cli remove prd
```

**查看已安裝的 Skills：**

```bash
npx skills-cli list
# prd        v1.2.0  https://gitlab.example.com/myorg/skills
# review-pr  v2.0.0  https://gitlab.example.com/myorg/skills
```

**診斷問題：**

```bash
npx skills-cli doctor
```

### GitLab Token

存取 private repo 時，透過環境變數傳入 token：

```bash
GITLAB_TOKEN=xxxxx npx skills-cli install
```

Token 不會寫入任何檔案，也不會出現在 log 中。

### `.claude/skills.json` 格式

```json
{
  "schemaVersion": 1,
  "skills": {
    "prd": {
      "source": "https://gitlab.example.com/myorg/skills",
      "version": "v1.2.0",
      "resolvedCommit": "8f3a9c1b2e4d5f6a7b8c9d0e1f2a3b4c5d6e7f8a",
      "sha256": "b6b5e1f8c2d4..."
    }
  }
}
```

不要手動修改 `resolvedCommit` 和 `sha256`，這些欄位由 CLI 管理。

### 加入 `.gitignore`

```gitignore
# Skills 由 .claude/skills.json 產生
.claude/skills/*.md
```

### Source Allowlist

預設允許任何 `https://` 的 GitLab URL。如果要限制只允許特定 host：

```bash
SKILLS_ALLOWED_SOURCES="https://gitlab.example.com/" npx skills-cli add ...
```

### 安全保證

- `install` 不修改 `.claude/skills.json`。
- `install` 是原子操作：下載失敗時不會破壞現有的 `.claude/skills/`。
- 只允許 git tag 作為版本（branch 會被拒絕）。
- Tag commit 釘選：如果 tag 被 force push，`install` 會停止並報錯。
- 對每個 Skill 檔案進行 SHA-256 checksum 驗證。
