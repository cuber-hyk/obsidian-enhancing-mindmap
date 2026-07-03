---
artifact_type: audit
status: active
created: 2026-07-03
updated: 2026-07-03
scope: ""
source_of_truth: code
---

# 审计标题

## 范围

准确说明审查范围。

## 事实来源

- 代码：
- 测试：
- 文档：
- 运行时检查：

## 发现

发现状态只允许：

- `open`：已确认或证据充分，仍需分派或处理。
- `planned`：已交由计划和后续工作处理。
- `resolved`：已处理，并记录 `fixed`、`accepted_risk`、`wont_fix` 或 `not_reproducible` 等关闭原因。
- `verified`：修复或处置已验证，发现已关闭。

| ID | Severity | Status | Finding | Evidence | Owner Plan | Branch/Commit | Verification | Closeout |
|---|---|---|---|---|---|---|---|---|
| AUD-1 | P1/P2/P3 | open |  |  |  |  |  |  |

存在 `open`、`planned`，或没有明确关闭原因且仍需验证的 `resolved` 发现时，不得归档审计。

## ADR 门禁

- 是否需要：`yes`、`no` 或 `maybe`
- 原因：

## 验证

- 已运行命令：
- 未验证内容：

## Git 可见性

- 创建本文件后运行 `git status --short --branch --untracked-files=all`。
- 若文件被忽略，添加最小允许规则，或明确报告审计未被跟踪。

## 关闭方式

执行 `dev-distill` 时选择一种最终操作：

- 保持活跃：仍有 `open`、`planned`，或没有明确关闭原因且仍需验证的 `resolved` 发现时，保留 `status: active`。
- 归档：所有发现均为 `verified`，或以 `accepted_risk`、`wont_fix`、`not_reproducible` 关闭，或已完整转入活跃计划后，设置 `status: archived` 并移至 `docs/audits/archived/`。
- 删除：稳定结论已由其他文档承载、所有发现均已关闭或转移，且原始证据无后续价值时删除。

不得使用 `distilled` 作为最终状态。
