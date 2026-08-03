---
artifact_type: audit
status: active
created: 2026-07-31
updated: 2026-08-02
scope: "桌面端脑图高频使用流程：首次加载、选择编辑、键盘导航、撤销重做、剪贴板、列表编号和视图同步"
source_of_truth: code
---

# 思维导图使用体验探索审查

## 范围

本轮以 Obsidian 桌面端为主要使用环境，审查打开脑图、选择与编辑节点、新增删除、拖放、粘贴、撤销重做、保存与视图同步等高频流程。

目标是找出会让用户中断操作、误解状态或需要额外手工修复的问题。非目标包括整体视觉风格重做、移动端适配、导入导出增强和未经基准测试的性能优化。本轮只审查，不修改实现。

## 事实来源

- 代码：`src/main.ts`、`src/MindMapView.ts`、`src/mindmap/`、`styles.css`
- 测试：仓库没有自动化测试；执行生产构建作为静态集成门禁
- 文档：`README.md`、`DESIGN.md`、`CONTEXT.md`、`docs/capabilities/mindmap-editing.md`
- 运行时检查：未连接隔离测试 Vault；涉及真实 DOM 布局、宿主事件时序和大图性能的结论均未升级为确认发现

## 审查过程

1. Project Mapper：建立 Markdown 持久化、视图重建、运行时节点树、布局、History 和交互控制器之间的调用图。
2. Risk Prober：围绕首次加载、编辑退出、键盘、剪贴板、有序列表和视图同步做静态代码探针，并运行生产构建。
3. Adversarial Verifier：追踪直接调用者、守卫和宿主兜底，排除快捷键面板遗漏 Redo、视图切换命令写反等误报。
4. Judge：只保留能由完整调用链证明、且影响高频用户流程的发现；性能猜测保留为后续探针，不作为缺陷结论。

## 体验风险图

- 首次加载与视图生命周期：异步渲染、延迟初始化和视图关闭/替换可能交错。
- 编辑与 History：退出编辑、方向导航和撤销由多个入口维护，容易出现不可见的历史操作。
- 选择与剪贴板：单选、多选和编辑态限制不同，但失败反馈不足。
- 结构化内容：有序编号只覆盖“新增同级节点”，没有覆盖删除与移动生命周期。
- 外部同步：Markdown 更新依赖 `quick-preview`，当前监听链没有真正调用处理器。

## 发现

发现状态只允许：

- `open`：已确认或证据充分，仍需分派或处理。
- `planned`：已交由计划和后续工作处理。
- `resolved`：已处理，并记录 `fixed`、`accepted_risk`、`wont_fix` 或 `not_reproducible` 等关闭原因。
- `verified`：修复或处置已验证，发现已关闭。

| ID | Severity | Status | Finding | Evidence | Owner Plan | Branch/Commit | Verification | Closeout |
|---|---|---|---|---|---|---|---|---|
| UX-01 | P1 | verified | 在已有节点中进入编辑但不修改文字时，Escape 和“Cancel edit”仍无条件执行一次 `undo()`，会撤销上一条无关操作。若文字有变化，`cancelEdit()` 会先创建文本变更命令再撤销，说明真正缺失的是“本次编辑是否产生历史命令”的判断。 | `src/mindmap/mindmap.ts:493-503`；`src/main.ts:502-516`；`src/mindmap/INode.ts:832-864` | `docs/plans/archived/2026-07-31-mindmap-reliability-ux-fixes.md` | `task/20260731-fix-mindmap-reliability` | 已移除全部画布 Escape 分支及 `Cancel edit` 命令；构建通过，用户在测试 Vault 重载新包后确认编辑态和多选态 Escape 均不再触发画布行为 | fixed and verified |
| UX-02 | P1 | verified | 首次 `setViewData()` 使用不可取消的 100ms 定时器，且回调读取的是届时的 `this.mindmap`。100ms 内再次载入会让多个回调初始化同一个新实例；关闭视图则可能在实例被置空后继续访问。结果可能是重复事件/节点初始化或关闭后异常。 | `src/MindMapView.ts:358-422`；`src/MindMapView.ts:425-438` | `docs/plans/archived/2026-07-31-mindmap-reliability-ux-fixes.md` | `task/20260731-fix-mindmap-reliability` | 已移除固定 timer 和双初始化分支；构建通过，用户在测试 Vault 同步新包并完成首次打开与交互回归后确认通过 | fixed and verified |
| UX-03 | P2 | verified | `quick-preview` 监听器返回 `this.onQuickPreview` 函数本身而没有调用它，外部 Markdown 或分栏编辑产生的实时变化不会沿预期路径刷新脑图。 | `src/MindMapView.ts` | `docs/plans/archived/2026-08-02-mindmap-sync-collapse-numbering-fixes.md` | `task/20260802-fix-sync-collapse-numbering` | 已转发宿主事件参数；后台实例完成布局和视图状态恢复后原子替换旧画布。构建通过，用户确认实时刷新、定位保持及无明显界面切换 | fixed and verified |
| UX-04 | P2 | verified | 根节点执行“Collapse one level”时会把显示层级设为 `-1`，随后无条件调用空的 `parent.select()`，造成命令异常。 | `src/main.ts` | `docs/plans/archived/2026-08-02-mindmap-sync-collapse-numbering-fixes.md` | `task/20260802-fix-sync-collapse-numbering` | 命令已增加活动脑图、单选、非根和父节点守卫；构建与测试 Vault 回归通过 | fixed and verified |
| UX-05 | P2 | verified | 撤销/重做体验存在三处不一致：`Ctrl/Cmd+Z` 只在已选节点且事件目标位于该节点时生效；左右方向导航会无条件记录 `ExpandNode`，即使节点已展开或没有子节点也污染撤销栈；README 的 Redo 是 `Ctrl/Cmd+Y`，实际默认键为 `Alt+Shift+Y`。 | `src/mindmap/interaction/NodeKeyboardController.ts`；`src/main.ts`；`src/mindmap/interaction/PluginShortcutCatalog.ts`；`src/mindmap/interaction/MindMapShortcutInspector.ts` | `docs/plans/archived/2026-08-01-mindmap-keyboard-focus-ux.md` | `task/20260801-mindmap-keyboard-focus-ux` | Undo/Redo 已收敛为带活动视图和交互目标守卫的命令；Windows/Linux Redo 为 `Ctrl+Y`，macOS 为 `Cmd+Shift+Z`；无效导航不写 History；构建通过且用户在测试 Vault 确认快捷键和面板行为 | fixed and verified |
| UX-06 | P2 | verified | 有序列表自动编号只在 `AddSiblingNode` 中执行。删除、批量删除、单节点移动和多节点移动均不重排受影响的同级组，用户会重新遇到 `1、3` 或拖动后 `3、1、2` 的序号。 | `src/mindmap/Cmds.ts`；`src/mindmap/interaction/OrderedSiblingNumbering.ts` | `docs/plans/archived/2026-08-02-mindmap-sync-collapse-numbering-fixes.md` | `task/20260802-fix-sync-collapse-numbering` | 编号 owner 与四条结构 History 命令已覆盖删除、移动、撤销和重做；纯计算及命令级脚本通过，用户完成测试 Vault 验收 | fixed and verified |
| UX-07 | P2 | open | 多选状态下按复制、剪切或粘贴会被直接消费但不显示原因；剪贴板权限错误和解析失败也只写控制台或返回 `false`。从用户视角表现为“按了没有反应”。 | `src/mindmap/interaction/NodeClipboardController.ts:20-35`；`src/mindmap/interaction/NodeClipboardController.ts:38-93` | none | `main@62ae531` | 确认：失败路径没有 Notice、状态提示或调用方反馈 | pending fix and regression verification |
| UX-08 | P2 | verified | 旧的 document `keyup` 路由只检查延迟维护的 `isFocused`，没有排除 input、button、range 和 contenteditable 等交互目标。焦点进入使用 100ms 延迟且依据旧事件的 `relatedTarget`，快速离开后仍可能把状态改回 true；因此导航器滑杆或其他控件的方向键可能同时触发节点导航。 | `src/mindmap/mindmap.ts`；`src/mindmap/interaction/NodeKeyboardController.ts`；`src/mindmap/interaction/NodeSelectionController.ts` | `docs/plans/archived/2026-08-01-mindmap-keyboard-focus-ux.md` | `task/20260801-mindmap-keyboard-focus-ux` | 已移除延迟焦点状态和 document 级旧 keyup 路由，画布容器与交互目标即时守卫成为唯一入口；构建通过且用户在测试 Vault 确认行为正常 | fixed and verified |
| UX-09 | P3 | open | “Replace by the previous text”命令读取从未维护的 `node.data.oldText`；实际编辑快照存放在私有 `_oldText`。命令会把 `undefined` 传给 `setText()`，后续渲染访问 `text.length` 时异常。 | `src/main.ts:168-185`；`src/mindmap/INode.ts:93`；`src/mindmap/INode.ts:181-185`；`src/mindmap/INode.ts:1622-1625` | none | `main@62ae531` | 确认：字段写入已被注释，数据模型没有有效来源 | pending fix or command removal |

## 已排除或降级的候选

- 快捷键面板“缺少 Redo”：排除。面板会动态枚举插件命令及其有效热键，Redo 可从插件命令区出现；保留的实际问题是 README 与默认热键不一致。
- Markdown/脑图切换命令调用方向写反：排除。`WorkspaceLeaf.setViewState` 的拦截器会根据 frontmatter 和 `mindmapFileModes` 转换视图状态，这是现有间接实现，不是简单笔误。
- 异步 `ChangeNodeText` 必然发生渲染覆盖：排除。节点通过 render promise/version 机制等待最新渲染，本轮未找到可闭合的错误时序。
- 导航器每帧重建 marker、大图全树布局必然卡顿：降级为性能探针。静态复杂度值得关注，但没有 100/500/1000 节点基准数据，不判为缺陷。

## 建议优化顺序

1. UX-01、UX-02 已修复并验证：画布 Escape 不再触发编辑撤销或多选清理，视图装载使用单一初始化路径。
2. UX-05、UX-08 已修复并验证：键盘事件已收敛到画布容器，Undo/Redo 与有效 History 规则一致。
3. UX-03、UX-04、UX-06 已修复并验证：外部同步、根节点命令和结构化编号在完整生命周期内保持一致。
4. 后续完善 UX-07、UX-09：给受限/失败操作明确反馈，移除或修复失效的低频命令。

建议下一步为 UX-07、UX-09 创建计划并执行修复。

## ADR 门禁

- 是否需要：`no`
- 原因：当前问题可以在既有模块职责内修复，不需要改变 Markdown 事实来源、公开命令或持久化架构。若后续决定统一重构全部键盘路由，再单独评估 ADR。

## 验证

- 已运行命令：`npm run build`（退出码 0；仍有仓库既存的 `WorkspaceLeaf.id` 与 xmind 隐式 `any` TypeScript 警告）
- 已运行审查：Project Mapper、Risk Prober、Adversarial Verifier、Judge 四轮审查
- 未验证内容：100、500、1000 节点性能基准；移动端和触摸交互

## Git 可见性

- 创建本文件后运行 `git status --short --branch --untracked-files=all`，确认审查文件可见且除本文件外没有产生实现改动。

## 关闭方式

本审查包含 `open` 发现，保持 `status: active`。发现修复并完成 Obsidian 人工回归后更新为 `verified`；若完整转入活跃计划，可由 `dev-distill` 按仓库规则归档。
