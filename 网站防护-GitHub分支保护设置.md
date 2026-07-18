# 网站防护：GitHub 分支保护设置指南

> 防止任何操作（包括 AI 会话、GitHub 网页编辑）绕过审查直接改网站。

---

## ⚠️ 为什么需要这个

2026-07-18，网站首页被某个操作覆盖成 3KB 残缺版（标题变成错误的"沃顿超薄岩板"），差点前功尽弃。原因是 main 分支**任何人/任何操作都能直接 push**，没有审查环节。

**分支保护能让 main 分支禁止直接 push，所有改动必须走 Pull Request 流程，你审查后才能合并。**

---

## 操作步骤（5 分钟，一次性）

### 第 1 步：打开仓库设置

1. 浏览器打开：https://github.com/chinasinteredstone-cmd/sinteredstoneworld/settings/branches
   -（路径：你的仓库页面 → **Settings** → 左侧 **Branches**）

### 第 2 步：添加分支保护规则

1. 点 **"Add branch protection rule"**（添加分支保护规则）
2. **Branch name pattern**（分支名）：填 `main`
3. 勾选以下选项：

#### 必勾（核心保护）：
- ☑️ **Require a pull request before merging**（合并前要求 PR）
  - ☑️ **Require approvals**: 设为 `1`（需要 1 人审批，即你自己审）
  - 这样：任何改动必须先开 PR，你审批后才能合并到 main

#### 推荐勾选（额外保险）：
- ☑️ **Restrict who can push to matching branches**（限制能 push 的人）—— 留空或只留你自己
- ☐ **Allow force pushes**: **不要勾**（禁止强制推送，防止覆盖）

#### 不要勾（否则我会推不了）：
- ☐ **Require status checks to pass** —— 别勾，我们没有 CI
- ☐ **Require signed commits** —— 别勾，太麻烦

### 第 3 步：保存

点页面底部的 **"Create"**（创建）按钮。

### 完成后效果

| 操作 | 之前 | 保护后 |
|------|:---:|:---:|
| 我（AI）直接 push main | ✅ 能 | ❌ 被拒 |
| 你在 GitHub 网页编辑 main | ✅ 能 | ❌ 被拒（必须开 PR） |
| 别的 AI 会话改 main | ✅ 能 | ❌ 被拒 |
| 开 PR → 你审查 → 合并 | — | ✅ 唯一能改 main 的方式 |

---

## 保护后，我（AI）怎么改网站？

我不能直接 push main 了，但工作流是：

1. 我在**新分支**上改代码（比如 `update-xxx` 分支）
2. 我推送这个分支（这是允许的）
3. 我告诉你"开了 PR，请审查"
4. 你在 GitHub 看改动，点 **Merge**
5. Vercel 自动部署

**这多了一步你的审查，但换来的是网站再也不会被偷偷改坏。**

---

## 🆘 紧急恢复（万一又被破坏）

我已经建了备份。万一网站又被改坏，**一条命令恢复**：

```bash
cd C:\Users\AppleLo\ZCodeProject\sinteredstoneworld
git checkout main
git reset --hard stable-backup-20260718
git push --force origin main
```

这会把网站恢复到 2026-07-18 的正确版本。

如果分支保护已开启，上面的 force push 会被拒。届时你需要：
1. 临时关掉分支保护
2. 执行恢复命令
3. 重新开启分支保护

---

## 已做的备份

| 备份 | 位置 | 说明 |
|------|------|------|
| Git tag `stable-backup-20260718` | 远程 + 本地 | 2026-07-18 正确版本快照 |
| 本地分支 `backup-stable` | 本地 | 同上，本地副本 |

---

## 关于其他 AI 会话

如果你同时在用别的 AI（Codex 别的会话、ChatGPT 等）操作这个仓库：

**强烈建议**：让所有 AI 都只在**独立分支**上工作，不要直接动 main。每个 AI 改完开 PR，你统一审查合并。这样：
- AI 之间不会互相覆盖
- 你能掌控所有改动
- 出问题能快速回滚
