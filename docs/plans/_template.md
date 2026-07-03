---
artifact_type: plan
status: active
created: 2026-07-03
updated: 2026-07-03
owner: agent
plan_readiness: ready
source_audit: ""
covered_findings: []
deferred_findings: []
---

# 计划标题

## 目标

用一句话说明可验证结果。

## 范围

- 范围内：
- 范围外：

## 计划就绪检查

- 目标明确：
- 范围明确：
- 事实来源已知：
- 关键决策已确认：
- 验证路径已知：

关键决策未确认时不得使用本模板，应先询问用户，确认后再创建或更新计划。

## 假设与决策

- 

## 已检查的决策点

| 决策 | 已选路线 | 确认者 | ADR 门禁 |
|---|---|---|---|

## 步骤与验证

步骤状态只允许 `todo`、`done`、`blocked`。

| ID | Status | 步骤 | 验证 |
|---|---|---|---|
| PLAN-1 | todo |  |  |

## 验收标准

- 

## 产物路由

- 能力文档更新：
- 审计输出：
- 来源审计：
- 覆盖发现：
- 延后发现：
- ADR 门禁：`needed`、`not needed` 或 `maybe`；说明原因。
- 测试：

## Git 可见性

- 创建本文件后运行 `git status --short --branch --untracked-files=all`。
- 若文件被忽略，添加最小允许规则，或明确报告计划未被跟踪。

## 关闭方式

执行 `dev-distill` 时选择一种最终操作：

- 归档：计划具有追溯价值时，将其移至 `docs/plans/archived/` 并设置 `status: archived`。
- 删除：计划没有独立的后续价值时删除。

仅当所有未延后步骤均为 `done`、没有 `blocked` 步骤、验证已有记录且关联审计已更新时，才可关闭计划。

不得使用 `completed` 或 `superseded` 作为最终状态。
