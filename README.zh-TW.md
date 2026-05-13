[English](README.md)

# claude-skills-cli

從你自己的 GitHub 或 GitLab repo 管理版本化的 [Claude Code](https://claude.ai/code) Skills。

```bash
npm install -g github:hok-io/claude-skills-cli#v2.0.0-alpha
```

---

## 這個工具解決什麼問題？

Claude Code Skills 遵循 [Anthropic Agent Skills 規格](https://agentskills.io/specification) — 每個 skill 是一個資料夾，內含 `SKILL.md`（YAML frontmatter）加可選的 `references/`、`scripts/`、`assets/` 子目錄。如果你的團隊把它們存在 private repo，沒有內建的方法讓每台機器保持同一個版本。

**claude-skills-cli** 像是 skills 的套件管理器：

- 釘住 git tag — 所有人拿到相同內容
- 每次安裝都驗證**整個資料夾**的 SHA-256（涵蓋 `SKILL.md` 跟所有附屬資源）
- 偵測 force-push 的 tag，避免損壞現有檔案
- **不用管 token** — 沿用你電腦上的 `git` 認證（SSH key、credential helper、`gh auth`、SSO…只要 `git clone` 過得去就行）

---

## 這工具給誰用？

Claude Skills 周邊有三種角色，**這個 CLI 涵蓋前兩種** — 第三種就只是純 git 操作，不需要特別工具。

| 角色 | 工作的地方 | 負責什麼 |
|---|---|---|
| **團隊成員 Team member** | 一個用了 skills 的 project | clone 後跑 `skills install` — 拿到 project 釘住的那版 `.md` 檔 |
| **Project maintainer** | 同個 project 的 `.claude/skills.json` | 決定這 project 用哪些 skills、釘哪個版本 |
| **Skill source maintainer** | 另一個獨立的 skills repo（_source repo_） | 寫 `.md` skill 檔本身、打新 tag |

Skill source maintainer 不需要這個 CLI — 他們只用 `git tag` 和 `git push`。看 **[team skills template](https://github.com/hok-io/team-skills-template)** 了解那邊長什麼樣（檔案結構、frontmatter、tag 慣例）。

---

## 運作方式

Skills 放在獨立的 source repo，一個 skill 一個資料夾。需要使用它們的 project 加一個 `.claude/skills.json` manifest，CLI 根據 manifest 同步資料夾。

```
Source repo                          你的 Project
github.com/myorg/skills              your-project/
  ├── prd/                           .claude/
  │   ├── SKILL.md     ──────────→   │  ├── skills.json   ← 要 commit
  │   └── references/                │  └── skills/
  ├── review-pr/                     │       ├── prd/
  │   └── SKILL.md     ──────────→   │       │   ├── SKILL.md
  └── CHANGELOG.md                   │       │   └── references/
                                     │       └── review-pr/
                                     │           └── SKILL.md   ← 全部 gitignore
```

只有 `skills.json` 需要 commit，`.claude/skills/` 底下全是產物。

---

## 快速開始

### 1. 建立 Skills source repo

在 repo 根目錄一個 skill 一個資料夾，每個資料夾內放一個 `SKILL.md`（大寫，遵循 Agent Skills 規格）：

```
my-skills/
├── prd/
│   ├── SKILL.md
│   ├── references/        ← 可選
│   ├── scripts/           ← 可選
│   └── assets/            ← 可選
├── review-pr/
│   └── SKILL.md
└── CHANGELOG.md
```

資料夾名必須等於 `SKILL.md` frontmatter 裡的 `name:`。完整的 `name` / `description` 規則見[規格文件](https://agentskills.io/specification)。

打版本 tag：

```bash
git tag v1.0.0
git push --tags
```

> 想要起手板？用 **[team-skills-template repo](https://github.com/hok-io/team-skills-template)** — 裡面示範了標準檔案結構、frontmatter 和版號慣例。

### 2. 安裝 CLI

```bash
# 從 GitHub 直接安裝（不需要 npm registry）
npm install -g github:hok-io/claude-skills-cli#v2.0.0-alpha
```

### 3. 初始化 project

```bash
cd your-project
skills init                                          # 建立 .claude/skills.json 同更新 .gitignore
```

### 4. 加 Skills

```bash
# GitHub、GitLab、self-hosted、SSH — 任何 git clone 得到嘅都行
skills skill add https://github.com/myorg/my-skills --skill prd --version v1.0.0
```

只要你電腦上 `git clone <url>` 通得過，呢個指令就通得過。唔使 set token。

呢個會寫入 `.claude/skills.json` 並下載整個 skill 資料夾（`SKILL.md` 加所有 `references/`、`scripts/`、`assets/`）。

### 5. 團隊成員 clone 後同步

```bash
skills install
```

---

## 指令總覽

依角色分組。可以跑 `skills --help`、`skills skill --help`、`skills remote --help`，或在任何子指令後加 `--help` 看範例。

### 給團隊成員（唯讀）

| 指令 | 說明 |
|---|---|
| `skills install` | 根據 manifest 同步 `.claude/skills/` |
| `skills list` | 顯示本機已安裝的 Skills 與版本 |
| `skills verify` | 檢查 manifest 完整性 + source tag 仲對得上（CI gate） |
| `skills doctor` | 診斷環境與設定 |

### Project 初始化（每個 project 跑一次）

| 指令 | 說明 |
|---|---|
| `skills init` | 建立 `.claude/skills.json` 並更新 `.gitignore` |

### 給 Project maintainer（會修改 `skills.json`）

| 指令 | 說明 |
|---|---|
| `skills skill add <source> --skill <name> --version <tag>` | 新增 Skill |
| `skills skill upgrade <name>@<version>` | 升級單一 Skill 到指定版本 |
| `skills skill upgrade --all` | 把所有 Skills 升到最新 tag |
| `skills skill remove <name>` | 移除 Skill |

### 探索（所有人，會打 remote、唯讀）

| 指令 | 說明 |
|---|---|
| `skills remote search <source>` | 列出 remote repo 裡有哪些 skill 資料夾（含 `SKILL.md`） |
| `skills remote tags <source>` | 顯示 remote repo 最新 5 個 tag |
| `skills remote outdated` | 檢查已安裝 Skills 在 remote 有沒有新版 |
| `skills remote available` | 列出 manifest source 裡還沒裝的 Skills |

---

## 常見工作流程

### 加 Skill 前先探索有什麼可選

```bash
# 這個 repo 提供哪些 Skills？
skills remote search https://github.com/myorg/my-skills

# 有哪些版本？
skills remote tags https://github.com/myorg/my-skills

# 加你要的
skills skill add https://github.com/myorg/my-skills --skill prd --version v1.2.0
```

### 例行升級

```bash
# 一次看完所有已安裝 Skills 哪些落後
skills remote outdated

# 只升一個
skills skill upgrade prd@v1.3.0

# 或一次把全部都升到最新
skills skill upgrade --all
```

### 看看你已用的 source repo 還提供什麼

```bash
skills remote available
```

維護者每次改完，記得 commit `.claude/skills.json`，團隊成員才能用 `skills install` 同步。

---

## 安裝方式

### A) 從 GitHub 直接安裝（最簡單）

```bash
# 釘住版本（推薦）
npm install -g github:hok-io/claude-skills-cli#v2.0.0-alpha

# 永遠安裝最新版
npm install -g github:hok-io/claude-skills-cli
```

### B) 本機 / Offline

```bash
git clone https://github.com/hok-io/claude-skills-cli.git
cd claude-skills-cli
npm install
npm link
```

---

## 系統需求

- Node.js >= 18
- PATH 上要有 `git`

CLI 每次 fetch 都會呼叫 `git`。你的 `git` 怎麼認證（SSH key、OS credential helper、`gh auth`、企業 SSO…），CLI 就跟著用，不需要任何額外設定。

---

## 支援的來源

任何 `git clone` 接受嘅形式：

- `https://github.com/owner/repo`
- `https://gitlab.yourcompany.com/team/repo`
- `git@github.com:owner/repo.git`（SCP-like SSH）
- `ssh://git@gitlab.internal/team/repo`
- `file:///abs/path/to/repo`（dev mode only — 要 set `SKILLS_DEV=1`，俾 source maintainer 本機試裝）

Self-hosted git server 一樣得，只要你 `git` 已經認得到。

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

`resolvedCommit` 和 `sha256` 由 CLI 寫入。`sha256` 是整個 skill 資料夾的 deterministic hash（依 POSIX 風格相對路徑排序後計算）。不要手動修改。

---

## 安全保證

- `install` 不修改 `skills.json`
- `install` 是原子操作：下載失敗不會破壞現有 Skills
- 只接受 git tag 作為版本（branch 一律拒絕）
- 若 tag 在 `skills skill add` 後被 force push，`install` 會停止並報錯
- 整個 skill 資料夾用 deterministic SHA-256（依 sorted 相對路徑 hash 每個檔案內容後再 hash 清單）驗證，涵蓋 `SKILL.md` 和所有附屬資源

---

## Source allowlist policy

收窄 CLI 可以接受嘅 source repo。三層疊住 — source 要喺**每一層有規則嘅** layer 都至少 match 一個 prefix：

1. **User policy** — `~/.claude/skills.policy.json`（每台機一份，例如用 dotfiles 派）
2. **Project policy** — `.claude/skills.policy.json` 喺 project 入面（commit 入 git）
3. **Env override** — `SKILLS_ALLOWED_SOURCES` env var（CI / 臨時）

Schema（三層 file 用同一 format；env 用逗號分隔 prefix）：

```json
{
  "schemaVersion": 1,
  "allowedSources": [
    "https://github.com/myorg/",
    "git@gitlab.internal:"
  ]
}
```

Source 要**每一層 active layer** 都 match 至少一個 prefix 先准。空 file / 唔存在 = 唔限制。跑 `skills doctor` 睇邊啲 layer 在生效。

---

## 環境變數

| 變數 | 說明 |
|---|---|
| `SKILLS_ALLOWED_SOURCES` | 來源 URL 前綴，逗號分隔。同 policy file 疊住生效（見上面） |
| `SKILLS_DEV` | Set 做 `1` 就開啟 `file://` 來源。俾 source repo maintainer 喺打 tag 前本機試裝用 |

---

## License

MIT © [hok-io](https://github.com/hok-io)
