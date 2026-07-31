---
artifact_type: audit
status: archived
created: 2026-07-30
updated: 2026-07-31
scope: "节点图片排序在真实 Obsidian 中触发节点拖动和展开/收缩"
source_of_truth: code_and_runtime_artifact
---

# 节点图片排序运行时探索性审查

## 范围

审查当前任务分支、脑图节点拖动事件、Obsidian 命令热键，以及 `LLM` Vault 实际加载的本地插件产物。

## 事实来源

- 代码：`src/main.ts`、`src/mindmap/INode.ts`、`src/mindmap/mindmap.ts`、`src/mindmap/interaction/NodeSelectionController.ts`、`src/mindmap/image/NodeImageReorderController.ts`
- 测试：用户在真实 Obsidian 中复测图片拖动和 `Alt+↑/↓`
- 文档：`CONTEXT.md`、`DESIGN.md`、`docs/capabilities/mindmap-editing.md`
- 运行时检查：比较开发构建与 `E:\Learning-materials\Obsidian\LLM\.obsidian\plugins\enhancing-mindmap-local\main.js` 的时间、哈希和功能标记

## 发现

| ID | Severity | Status | Finding | Evidence | Owner Plan | Branch/Commit | Verification | Closeout |
|---|---|---|---|---|---|---|---|---|
| IMG-RUNTIME-1 | P1 | verified | 真实 Obsidian 加载的本地插件产物未同步当前任务构建，导致此前复测没有执行任何图片排序代码。 | Vault bundle 更新时间为 18:46:11、SHA-256 为 `6FF9FB...73FE`，且不含 `NodeImageReorderController`；开发 bundle 更新时间为 23:15:10、SHA-256 为 `94E87F...A294A`。 | `docs/plans/archived/2026-07-30-node-image-vertical-reorder.md` | `task/20260730-node-image-vertical-reorder` | 最新构建已备份部署，源文件与 Vault 文件哈希一致；用户在重新加载后确认功能通过。 | 已修复部署验证链路并完成运行时确认。 |
| IMG-RUNTIME-2 | P1 | verified | `Alt+↑/↓` 已由 Obsidian 全局命令注册为收缩/展开，图片 DOM 局部键盘监听不能可靠覆盖宿主热键路由。 | `src/main.ts` 的 `Expand one level` 和 `Collapse one level` 分别注册 `Alt+ArrowDown`、`Alt+ArrowUp`，用户运行时观察到对应命令执行。 | `docs/plans/archived/2026-07-30-node-image-vertical-reorder.md` | `task/20260730-node-image-vertical-reorder` | 图片四向布局改为四个独立 Obsidian 命令，用户确认 `Alt+↑/↓/←/→` 与快捷键面板行为通过。 | 已移除旧命令默认键冲突并完成运行时确认。 |
| IMG-RUNTIME-3 | P1 | verified | 编辑态节点仍可能保持原生 `draggable=true`，图片排序不应依赖 pointer 手势期间临时覆盖节点拖动状态。 | `INode.select()` 和 `NodeSelectionController.syncNodeVisual()` 不区分编辑态并启用 draggable；HTML DnD 会优先从 draggable 源启动，用户运行时观察到节点整体拖动。 | `docs/plans/archived/2026-07-30-node-image-vertical-reorder.md` | `task/20260730-node-image-vertical-reorder` | 编辑态节点统一关闭原生 draggable；用户确认拖动图片不再触发节点整体拖动。 | 已建立编辑态节点不可整体拖动的不变量并完成运行时确认。 |

三个发现均已完成代码修复、构建产物核对和真实 Obsidian 验证。

## ADR 门禁

- 是否需要：`no`
- 原因：修复现有事件所有权和部署验证缺口，不改变数据源或长期架构。

## 验证

- 已运行命令：开发与 Vault bundle 哈希/时间/标记检查；相关事件和命令注册代码检索；官方 HTML DnD、DOM 事件阶段与 Obsidian 命令文档核对。
- 运行时验证：用户确认图片拖动、四向快捷键及快捷键面板行为通过。

## Git 可见性

- 创建后通过 `git status --short --branch --untracked-files=all` 检查。

## 关闭方式

- 三个发现均为 `verified`；稳定事实已写入能力文档和设计约束，审计归档保留问题定位与运行时部署证据。
