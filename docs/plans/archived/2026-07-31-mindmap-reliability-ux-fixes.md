---
artifact_type: plan
status: archived
created: 2026-07-31
updated: 2026-07-31
owner: Codex
---

# 脑图编辑与首次加载可靠性修复计划

## 目标

移除编辑态 Escape 取消入口，避免误撤销用户历史；同时消除首次加载的固定延迟初始化竞态，使脑图在重复载入、快速切换和关闭视图时只初始化当前有效实例。

## 范围

- 覆盖审查发现 UX-01、UX-02。
- 删除编辑态 Escape 取消处理、`Cancel edit` 插件命令及其失去用途的翻译键。
- 移除画布层的 Escape 多选清理；保留快捷键录制取消和 Obsidian 弹窗的原生关闭行为。
- 将 `MindMapView.setViewData()` 的首次与后续初始化收敛为一条同步、实例明确的路径。
- 使用传入的 Markdown 数据提取 frontmatter，不依赖固定时间等待 metadata cache。

## 非目标

- 不处理审查中的 UX-03 至 UX-09。
- 不重构整个键盘路由或 History 架构。
- 不拆分 `main.ts`、`mindmap.ts`、`MindMapView.ts` 或创建通用 helper 模块。
- 不改变 Enter、Tab、点击画布结束编辑和静止空白单击清空多选的既有行为。
- 不处理仓库既有 TypeScript 构建警告。

## 假设与已确认决策

- 用户已确认不保留编辑态 Escape 快捷命令。
- 用户已确认画布层不保留 Escape 多选清理，只保留快捷键录制取消和 Obsidian 原生弹窗关闭。
- 编辑态按 Escape 不退出编辑、不保存、不撤销；用户继续使用 Enter、Tab 或既有点击流程结束编辑。
- `Cancel edit` 命令与 Escape 旧实现属于同一失效入口，一并删除，避免命令面板仍能触发误撤销。
- Markdown 文本是事实来源；首次初始化所需 frontmatter 直接从 `setViewData(data)` 的数据提取。
- 采用单一初始化路径，不保留首次/后续双轨兼容逻辑。
- ADR 门禁为 `no`：不改变持久化模型或长期架构。

## 事实来源

- 来源审查：`docs/audits/archived/2026-07-31-mindmap-ux-exploratory-review.md`
- 编辑事实：`docs/capabilities/mindmap-editing.md`
- UI 合同：`DESIGN.md`
- 编辑与键盘入口：`src/main.ts`、`src/mindmap/mindmap.ts`、`src/mindmap/interaction/NodeSelectionController.ts`、`src/mindmap/interaction/NodeKeyboardController.ts`
- 视图生命周期：`src/MindMapView.ts`
- 节点编辑收尾：`src/mindmap/INode.ts`
- 构建门禁：`package.json` 中的 `npm run build`

## Dev Split 约束

- 分类：`no split`。
- 原因：扫描确认 `mindmap.ts`、`main.ts`、`MindMapView.ts` 均为大文件，但当前任务只需删除旧入口并收敛一个已有生命周期分支；拆分会扩大范围并增加共享状态传递。
- 新行为 owner：`src/MindMapView.ts`，只负责当前视图实例的初始化与销毁边界。
- `src/main.ts`：只删除 `Cancel edit` 命令，不增加编辑状态逻辑。
- `src/mindmap/mindmap.ts`：只删除编辑态 Escape 分支，保留事件委托和多选处理。
- 共享模块：不允许；没有两个真实消费者需要新抽象。
- 延后触发条件：后续若统一迁移 document `keyup` 键盘路由，再单独使用 `dev-split` 评估 `NodeKeyboardController` 的所有权边界。

| 模块 | Owner responsibility | May depend on | Must not own |
|---|---|---|---|
| `src/MindMapView.ts` | 当前脑图视图的数据装载、实例初始化和销毁 | Obsidian view/file API、`MindMap`、样式模板 | 节点键盘语义、History 命令 |
| `src/mindmap/mindmap.ts` | 画布生命周期与事件委托 | 交互控制器、运行时节点树 | 新的 Escape 编辑取消状态机 |
| `src/main.ts` | 插件命令注册与视图入口 | Obsidian command API | 节点编辑取消实现 |

## 实施步骤与验证

| ID | Status | Step | Verification |
|---|---|---|---|
| PLAN-1 | done | 通过审查调用链确认基线：已有节点无改动按 Escape 会撤销上一条 History；100ms 内连续 `setViewData()` 或关闭视图存在旧回调。本环境没有可自动控制的 Obsidian 测试 Vault，运行时复现留在 PLAN-4 人工矩阵。 | UX-01、UX-02 的直接调用链已记录在来源审查。 |
| PLAN-2 | done | 删除 `main.ts` 的 `Cancel edit` 命令、`mindmap.ts` 的编辑态 Escape 分支、`NodeSelectionController` 的多选 Escape 分支，以及英文、法文未再使用的翻译键。保留快捷键录制和 Obsidian 原生弹窗的 Escape。 | 搜索确认画布事件链无 `Cancel edit`、`firstInit`、`keyCode == 27` 或多选 Escape 残留；快捷键检查器的局部 Escape 分支仍存在。 |
| PLAN-3 | done | 在 `MindMapView.setViewData()` 中移除 `firstInit` 和固定 100ms timer，将 frontmatter、path、view、`init()`、样式应用及检查器恢复收敛为一次当前实例初始化；文件尚不可用时从 `data` 完成可确定初始化，不访问空 file/mindmap。 | 首次和后续加载只剩同一条同步初始化路径；生产构建通过。 |
| PLAN-4 | done | 运行生产构建，并在隔离 Vault 回归首次打开、快速切换 leaf、打开后立即关闭、Markdown/脑图往返、图片/公式/表格混合节点、Enter/Tab/点击结束编辑、撤销重做和画布 Escape。 | `npm run build` 退出码 0；用户确认测试 Vault 中同步新构建并重载插件后行为通过，画布 Escape 不再退出编辑、撤销或清空多选。 |
| PLAN-5 | done | 更新设计合同、能力文档与来源审查：写明画布 Escape 入口已移除；UX-01、UX-02 在人工回归通过后标记 `verified`。运行 Dev Flow 文档校验并更新 changelog。 | `validate-docs` 无问题；审查、DESIGN、能力文档和 changelog 与当前实现一致。 |

## 风险与控制

- 风险：移除 Escape 编辑退出后，用户可能仍按习惯尝试退出。控制：这是用户明确选择；保留 Enter、Tab 与点击结束编辑，不额外增加替代快捷键。
- 风险：立即初始化时 `this.file` 尚为空。控制：初始化不得要求 file 存在；path 和 metadata cache 使用空值守卫，frontmatter 直接从传入 data 提取。
- 风险：样式模板或检查器恢复顺序变化导致首次布局回归。控制：保持 `init()`、模板应用与检查器恢复的相对顺序，只消除等待与双分支。
- 风险：首次布局包含异步图片、公式和表格。控制：继续复用现有 pending node/rendered layout 门禁，不在本计划修改其算法。

## 验收标准

- 画布层按 Escape 不退出编辑、不改变节点文本、不改变 History，也不清空多选。
- `Cancel edit` 不再出现在插件命令中，未留下无用翻译键。
- 多选状态通过静止空白单击清空；快捷键录制和 Obsidian 原生弹窗仍可使用 Escape 取消或关闭。
- `setViewData()` 不包含首次初始化固定 timer 或 `firstInit` 双分支。
- 每次装载只初始化当前 `MindMap` 实例，快速重复装载和关闭视图不触发旧实例回调。
- 首次打开混合内容脑图布局正常，无需折叠再展开修复。
- 生产构建和 Dev Flow 文档校验通过；隔离 Vault 回归结果被记录。

## 产物路由

- Plan：`docs/plans/archived/2026-07-31-mindmap-reliability-ux-fixes.md`
- Source audit：`docs/audits/archived/2026-07-31-mindmap-ux-exploratory-review.md`
- Covered findings：UX-01、UX-02
- Deferred findings：UX-03、UX-04、UX-05、UX-06、UX-07、UX-08、UX-09
- Capability docs：实现完成后更新 `docs/capabilities/mindmap-editing.md`
- DESIGN.md：`design_system_impact: none`，不建立新的可复用 UI 模式
- Context map：预计不更新，代码入口和模块所有权不变
- Changelog：需要；属于用户可见的编辑快捷键移除和首次加载可靠性修复
- Distill：需要；关闭计划并更新来源审查状态
- ADR：不需要；没有长期架构或事实来源变更
- Dev Check：需要；计划、审查和能力文档会发生生命周期变化

## 完成条件

所有非延后步骤已完成且无 blocked 项；构建与人工验证有记录，UX-01、UX-02 的审查状态与证据已更新，本计划由 `dev-distill` 归档。

## 下一步

计划已实施并完成验证，进入 `dev-branch` 提交、合并和分支清理门禁。
