# AI 上下文地图

本文件帮助 AI Agent 定位当前事实，避免默认读取过程性噪声。

## 默认入口

1. 读取 `AGENTS.md` 或 `CLAUDE.md`。
2. 读取 `CONTEXT.md`。
3. 只选择与任务相关的 `docs/capabilities/*.md`。
4. 只读取能力文档指出的代码入口。
5. UI 任务先读取 `DESIGN.md`，再读取相关令牌、组件和视觉示例。

## 记忆规则

<!--
- Do not read `docs/plans/` by default.
- Do not read `docs/audits/` by default.
- Do not read any `archived/` directory by default.
-->

- 默认不读取 `docs/plans/`。
- 默认不读取 `docs/audits/`。
- 默认不读取任何 `archived/` 目录。
- 文档与代码或测试冲突时，以代码和测试为最终事实来源。

## 任务路由

| 任务类型 | 优先读取 | 代码入口 | 说明 |
|---|---|---|---|
| 模糊想法 | `CONTEXT.md`、`docs/capabilities/mindmap-editing.md` | `src/mindmap/INode.ts`、`src/mindmap/mindmap.ts` | 使用 `dev-brainstorm`，确认后转入 `dev-plan`。 |
| 功能或缺陷 | `CONTEXT.md`、相关能力文档 | `src/main.ts`、`src/MindMapView.ts`、相关 `src/mindmap/*.ts` | 先使用 `dev-orient`。节点插入、键盘状态机与节点多选、链接操作、图片附件和画布导航分别由 `src/mindmap/insert/`、`src/mindmap/interaction/`、`src/mindmap/link/`、`src/mindmap/image/`、`src/mindmap/navigation/` 负责。 |
| 审计 | `CONTEXT.md`、相关能力文档 | 相关 `src/` 入口及 `package.json` 脚本 | 使用 `dev-audit`，报告写入 `docs/audits/`。 |
| 发布说明 | `CHANGELOG.md` | `manifest.json`、`versions.json`、Git 历史 | 使用 `dev-changelog`。 |
| 架构决策 | `CONTEXT.md`、相关能力文档与 ADR | 公开视图、命令及节点入口 | 仅在 ADR 门禁通过后创建 ADR。 |
| UI、页面或组件 | `DESIGN.md`、相关能力文档 | `styles.css`、`src/mindmap/INode.ts`、`src/mindmap/insert/NodeInsertController.ts`、`src/mindmap/link/NodeLinkController.ts`、`src/mindmap/navigation/MindMapNavigatorController.ts` | 复用 Obsidian UI 语义；可复用规则变化时使用 `dev-design-system`。 |

## 计划就绪规则

写入持久计划前，`dev-plan` 必须确认执行路线已经决定。产品、业务、数据、状态、不可逆清理、用户体验或架构决策未确认时，应先询问用户，不得把未决分支写入 `docs/plans/*.md`。

## 产物位置

| 产物 | 位置 | 默认读取 |
|---|---|---|
| 当前模块事实 | `docs/capabilities/*.md` | 相关时读取 |
| 活跃计划 | `docs/plans/*.md` | 否 |
| 已归档计划 | `docs/plans/archived/*.md` | 否 |
| 活跃审计 | `docs/audits/*.md` | 否 |
| 已归档审计 | `docs/audits/archived/*.md` | 否 |
| 提议或已接受决策 | `docs/adr/*.md` | 仅决策任务 |
| 已归档决策 | `docs/adr/archived/*.md` | 否 |
| 发布说明 | `CHANGELOG.md` | 仅发布或日志任务 |
| 当前 UI 设计规则 | `DESIGN.md` | UI 任务读取 |
| 精确 UI 基础值 | `design-tokens.json` | UI 任务相关时读取 |

## 生命周期摘要

| 产物 | 持久状态 | 关闭方式 |
|---|---|---|
| 计划 | `active`、`archived` | 活跃文件保留在 `docs/plans/`；归档后移入 `docs/plans/archived/`；无后续价值时删除。 |
| 审计 | `active`、`archived` | 活跃文件保留在 `docs/audits/`；所有发现验证或明确关闭后移入 `docs/audits/archived/`。 |
| 能力 | `current` | 原位更新，删除过时事实。 |
| ADR | `proposed`、`accepted`、`archived` | 提议或接受状态保留在 `docs/adr/`；归档后移入 `docs/adr/archived/`。 |

不得使用 `completed`、`distilled`、`superseded` 或 `deprecated` 作为文档最终状态。

## 更新记录

- 2026-07-03：初始化路由并补充项目级脑图入口。
- 2026-07-03：增加节点可视化插入 owner 模块路由。
- 2026-07-03：增加节点键盘状态机和链接操作 owner 模块路由。
- 2026-07-04：增加图片附件 owner 模块路由。
- 2026-07-06：增加画布导航控件 owner 模块路由。
- 2026-07-13：增加节点多选状态与手势 owner 模块路由。
