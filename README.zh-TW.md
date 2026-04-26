[English](README.md)

# skills-cli

管理團隊 Claude Skills 的 CLI 工具。只需 commit 一份 manifest 檔，每台機器都能同步到相同版本的 Skills。

## 運作方式

```
你的 Skills Repo（GitHub / GitLab）    你的 Project
────────────────────────────────────   ─────────────────────────────
github.com/myorg/skills                your-project/
  ├── prd.md            ────────────→  .claude/
  ├── review-pr.md      ────────────→  │  ├── skills.json  ← 要 commit
  └── ...                              │  └── skills/
                                       │       ├── prd.md   ← 不 commit
                                       │       └── review-pr.md
```

只需要 commit `.claude/skills.json`。`.md` 檔是產物，刪掉後重新執行 `install` 即可重建。

## 環境需求

- Node.js 18 以上
- 放 Skills 的 repo（GitHub 或 GitLab，公開或私有皆可）
- 私有 repo 需要：`GITHUB_TOKEN` 或 `GITLAB_TOKEN`

## 安裝

```bash
npm install -g skills-cli
# 或不安裝直接使用：
npx skills-cli <指令>
```

## 支援的來源

| 來源 | Token 環境變數 |
|---|---|
| `https://github.com/...` | `GITHUB_TOKEN` |
| `https://gitlab.com/...` | `GITLAB_TOKEN` |
| `https://gitlab.yourcompany.com/...` | `GITLAB_TOKEN` |

CLI 從 URL 自動偵測 provider，不需要額外設定。

## 指令總覽

| 指令 | 使用者 | 是否修改 `skills.json` | 說明 |
|---|---|:---:|---|
| `install` | 所有人 | 否 | 根據 manifest 同步本機 Skills |
| `list` | 所有人 | 否 | 查看目前的 Skills |
| `doctor` | 所有人 | 否 | 診斷環境與設定 |
| `add` | 維護者 | 是 | 新增 Skill |
| `upgrade` | 維護者 | 是 | 升級 Skill 版本 |
| `remove` | 維護者 | 是 | 移除 Skill |

## 使用方式

**Clone 專案後同步：**

```bash
npx skills-cli install
```

**新增 Skill（GitHub）：**

```bash
GITHUB_TOKEN=ghp_xxx npx skills-cli add https://github.com/myorg/skills \
  --skill prd \
  --version v1.2.0
```

**新增 Skill（GitLab self-hosted）：**

```bash
GITLAB_TOKEN=glpat-xxx npx skills-cli add https://gitlab.mycompany.com/team/skills \
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
# prd        v1.2.0  https://github.com/myorg/skills
# review-pr  v2.0.0  https://github.com/myorg/skills
```

**診斷問題：**

```bash
npx skills-cli doctor
```

## `.claude/skills.json` 格式

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

不要手動修改 `resolvedCommit` 和 `sha256`，這兩個欄位由 CLI 寫入。

## `.gitignore`

```gitignore
.claude/skills/*.md
```

## 安全保證

- `install` 不修改 `skills.json`
- `install` 是原子操作：下載失敗不會破壞現有 Skills
- 只接受 git tag 作為版本（branch 一律拒絕）
- 若 tag 被 force push，`install` 會停止並報錯
- 每個 Skill 檔案在寫入前都經過 SHA-256 驗證

## 環境變數

| 變數 | 說明 |
|---|---|
| `GITHUB_TOKEN` | GitHub private repo 的 Personal access token |
| `GITLAB_TOKEN` | GitLab private repo 的 Personal access token |
| `SKILLS_ALLOWED_SOURCES` | 允許的來源 URL 前綴，逗號分隔（選填） |

## License

MIT
