[English](README.md)

# claude-skills-cli

從你自己的 GitHub 或 GitLab repo 管理版本化的 [Claude Code](https://claude.ai/code) Skills。

```bash
npm install -g github:hok-io/claude-skills-cli#v1.0.0
```

---

## 這個工具解決什麼問題？

Claude Code Skills 是給 Claude 使用的 `.md` 指令檔。如果你的團隊把它們存在 private repo，沒有內建的方法讓每台機器保持同一個版本。

**claude-skills-cli** 像是 Skills 的套件管理器：

- 釘住 git tag — 所有人拿到相同的檔案
- 每次安裝都驗證 SHA-256 checksum
- 偵測 force-push 的 tag，避免損壞現有檔案
- 支援 private **GitHub** 和 **GitLab** repo

---

## 運作方式

Skills 放在獨立的 source repo。需要使用它們的 project 加一個 `.claude/skills.json` manifest，CLI 根據 manifest 同步檔案。

```
Source repo                        你的 Project
github.com/myorg/skills            your-project/
  ├── prd.md          ──────────→  .claude/
  ├── review-pr.md    ──────────→  │  ├── skills.json   ← 要 commit
  └── CHANGELOG.md                 │  └── skills/
                                   │       ├── prd.md   ← 不 commit
                                   │       └── review-pr.md
```

只有 `skills.json` 需要 commit，`.md` 檔是產物。

---

## 快速開始

### 1. 建立 Skills source repo

在 repo 根目錄放 `.md` 技能檔：

```
my-skills/
├── prd.md
├── review-pr.md
└── CHANGELOG.md
```

打版本 tag：

```bash
git tag v1.0.0
git push --tags
```

### 2. 安裝 CLI

```bash
# 從 GitHub 直接安裝（不需要 npm registry）
npm install -g github:hok-io/claude-skills-cli#v1.0.0
```

### 3. 在你的 Project 新增 Skills

```bash
cd your-project

# GitHub
GITHUB_TOKEN=ghp_xxx skills add https://github.com/myorg/my-skills \
  --skill prd --version v1.0.0

# GitLab self-hosted
GITLAB_TOKEN=glpat-xxx skills add https://gitlab.mycompany.com/team/my-skills \
  --skill prd --version v1.0.0
```

這會寫入 `.claude/skills.json` 並下載 `.md` 檔。

### 4. 加入 `.gitignore`

```gitignore
.claude/skills/*.md
```

### 5. 團隊成員 clone 後同步

```bash
GITHUB_TOKEN=ghp_xxx skills install
```

---

## 指令總覽

| 指令 | 使用者 | 修改 `skills.json` | 說明 |
|---|---|:---:|---|
| `install` | 所有人 | 否 | 根據 manifest 同步 `.claude/skills/` |
| `list` | 所有人 | 否 | 查看所有 Skills 和版本 |
| `doctor` | 所有人 | 否 | 診斷環境與設定 |
| `add` | 維護者 | 是 | 新增 Skill |
| `upgrade` | 維護者 | 是 | 升級 Skill 版本 |
| `remove` | 維護者 | 是 | 移除 Skill |

---

## 安裝方式

### A) 從 GitHub 直接安裝（最簡單）

```bash
# 釘住版本（推薦）
npm install -g github:hok-io/claude-skills-cli#v1.0.0

# 永遠安裝最新版
npm install -g github:hok-io/claude-skills-cli
```

### B) 從 GitHub Packages 安裝

```bash
# 設定 registry（一次性）
npm config set @hok-io:registry https://npm.pkg.github.com

# 安裝最新版
npm install -g @hok-io/claude-skills-cli

# 或釘住特定版本
npm install -g @hok-io/claude-skills-cli@1.0.0
```

> 需要 GitHub token，並開啟 `read:packages` 權限。

### C) 本機 / Offline

```bash
git clone https://github.com/hok-io/claude-skills-cli.git
cd claude-skills-cli
npm install
npm link
```

---

## 支援的來源

| URL | Token 環境變數 |
|---|---|
| `https://github.com/...` | `GITHUB_TOKEN` |
| `https://gitlab.com/...` | `GITLAB_TOKEN` |
| `https://gitlab.yourcompany.com/...` | `GITLAB_TOKEN` |

CLI 從 URL 自動偵測 provider，不需要額外設定。

---

## `.claude/skills.json` 格式

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

`resolvedCommit` 和 `sha256` 由 CLI 寫入，不要手動修改。

---

## 安全保證

- `install` 不修改 `skills.json`
- `install` 是原子操作：下載失敗不會破壞現有 Skills
- 只接受 git tag 作為版本（branch 一律拒絕）
- 若 tag 在 `add` 後被 force push，`install` 會停止並報錯
- 每個檔案在寫入前都經過 SHA-256 驗證

---

## 環境變數

| 變數 | 說明 |
|---|---|
| `GITHUB_TOKEN` | GitHub private repo 的 token |
| `GITLAB_TOKEN` | GitLab private repo 的 token |
| `SKILLS_ALLOWED_SOURCES` | 允許的來源 URL 前綴，逗號分隔（選填） |

---

## License

MIT © [hok-io](https://github.com/hok-io)
