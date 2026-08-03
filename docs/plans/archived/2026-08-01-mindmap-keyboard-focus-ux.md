---
artifact_type: plan
status: archived
created: 2026-08-01
updated: 2026-08-01
owner: codex
---

# 脑图键盘与焦点体验优化

## 目标

统一脑图画布的键盘事件作用域、方向导航和撤销/重做入口，使空白画布可撤销、交互控件不误触发节点操作、导航不产生无效 History，并使重做快捷键与文档一致。

## 范围

- 覆盖审计发现 UX-05 和 UX-08。
- 统一处理画布空白区域的撤销、重做、方向导航、`Home` 导航和交互控件焦点守卫。
- 更新快捷键面板数据来源的重复项、README、能力文档、CHANGELOG 和审计状态。
- 非目标：修复 UX-03、UX-04、UX-06、UX-07 或 UX-09；全面重写键盘架构；改变 Escape 已确认的无画布行为；新增自动化测试框架。

## 假设与已确认决策

- 用户确认默认重做快捷键按平台区分：Windows/Linux 使用 `Ctrl+Y`，macOS 使用 `Cmd+Shift+Z`，避免 Windows 本地截图快捷键冲突。
- 撤销与重做通过 Obsidian 插件命令作为单一可配置入口；命令仅在当前活动 leaf 是脑图视图、没有节点正在编辑，且焦点不在输入或交互控件时可执行。
- 画布空白处点击作为明确的画布键盘激活行为；清空节点选择后仍可撤销或重做。
- 方向键只在无修饰键、单选、非编辑且事件目标属于画布时导航。只有“存在子节点且当前折叠”时才执行 `ExpandNode` 并写入 History；已展开节点和叶节点不写入 History。
- Escape 仅保留快捷键录制取消和 Obsidian Modal 原生关闭，不恢复节点编辑或多选行为。
- 不需要 ADR：本轮沿用既有交互控制器和 Obsidian 命令机制，不改变 Markdown 事实来源或对外数据结构。

## 事实来源

- 源审计：`docs/audits/archived/2026-07-31-mindmap-ux-exploratory-review.md`
- 交互合同：`DESIGN.md`
- 能力事实：`docs/capabilities/mindmap-editing.md`
- 键盘状态机：`src/mindmap/interaction/NodeKeyboardController.ts`
- 多选守卫：`src/mindmap/interaction/NodeSelectionController.ts`
- 快捷键面板：`src/mindmap/interaction/MindMapShortcutInspector.ts`、`src/MindMapView.ts`
- 事件接线与导航基础操作：`src/mindmap/mindmap.ts`
- History 命令：`src/mindmap/Execute.ts`、`src/mindmap/Cmds.ts`
- Obsidian 命令注册：`src/main.ts`
- 快捷键文档：`README.md`

## Dev Split 约束

- 分类：`local cleanup`。`src/mindmap/mindmap.ts` 约 2400 行，但本轮已有明确的现有 owner，无需新建模块。
- `src/mindmap/interaction/NodeKeyboardController.ts` 拥有方向键与 `Home` 节点导航的判定和处理。
- `src/main.ts` 只拥有 Obsidian Undo/Redo 命令注册与活动视图可用性守卫。
- `src/mindmap/mindmap.ts` 只保留脑图容器级事件绑定、解绑和控制器委派；不再添加新的 document 级键盘路由或具体快捷键分支。
- `src/mindmap/interaction/NodeSelectionController.ts` 仅修正多选状态的事件目标守卫，不承接单节点导航。
- 副作用继续由 `MindMap`/History 现有入口执行，不在控制器复制节点树变更逻辑。
- 延后拆分触发器：若后续还要迁移节点移动、折叠层级等大量旧 keyup 命令，再单独评估导航 owner 边界；本轮不以减少行数为目标。

## 实施步骤与验证

| ID | 状态 | 步骤 | 验证 |
|---|---|---|---|
| PLAN-1 | done | 在隔离测试 Vault 记录基线：空白画布撤销、导航器 range/input/button 方向键、快速焦点进出、已展开节点和叶节点的撤销栈变化。 | 用户复现空白画布、Escape 与快捷键面板相关问题，静态调用链确认 UX-05/UX-08。 |
| PLAN-2 | done | 删除 `isFocused` 的 100ms 延迟状态和对应 focus 监听，以当前活动 MindMapView、事件 DOM 作用域及交互目标守卫作为唯一即时判定；使空白画布点击能明确激活画布键盘作用域。 | 测试 Vault 重载后，用户确认焦点与 Escape 行为符合预期。 |
| PLAN-3 | done | 将无修饰键的四向导航和 `Home` 从旧 document `keyup` 分支移入 `NodeKeyboardController` 的 `keydown` 状态机；保留现有左右分支导航语义，仅在折叠且有子节点时记录 `ExpandNode`。 | 生产构建通过；用户完成测试 Vault 交互验证。 |
| PLAN-4 | done | 将 Undo/Redo 收敛到带可用性守卫的 Obsidian 命令，默认使用 `Mod+Z`，重做按平台使用 Windows/Linux `Ctrl+Y` 与 macOS `Cmd+Shift+Z`；移除重复硬编码 Undo，使面板从 Obsidian 当前热键注册表显示真实绑定。 | 用户确认快捷键及右侧面板行为；右侧只显示简洁 `Undo`、`Redo`，完整目录移至设置页。 |
| PLAN-5 | done | 更新 README、DESIGN、能力文档、CHANGELOG 和源审计，生成 `main.js`并执行完整回归。 | `npm run build` 退出码为 0；测试 bundle 与授权 Vault 同步哈希一致，用户确认通过。 |

## 风险与控制

- Obsidian 全局命令热键可能与编辑器默认撤销/重做冲突；使用 `checkCallback` 类可用性守卫，并在编辑态和非脑图 leaf 验证宿主原生行为。
- 方向导航从 `keyup` 转为 `keydown` 后可能出现长按重复；保留浏览器标准重复语义，并确认不会重复写入无效 History。
- 多个脑图 leaf 同时打开时，全局 document 监听可能被多个实例接收；以活动 leaf 和 DOM 作用域双重守卫，验证非活动脑图不变化。

## 验收标准

- 画布空白处清空选择后，`Ctrl/Cmd+Z` 仍撤销最后一条真实脑图 History 操作。
- Windows/Linux 的 `Ctrl+Y` 与 macOS 的 `Cmd+Shift+Z` 重做脑图 History，README 和快捷键面板显示与 Obsidian 当前有效绑定一致。
- 节点编辑器、导航器滑杆/按钮、快捷键检查器控件和其他 leaf 不误触发节点导航或脑图 History。
- 方向导航的可见行为保持不变；已展开节点和叶节点不产生无效 `ExpandNode` History。
- 快速切换焦点不依赖延时状态，非活动脑图不响应键盘事件。
- Escape 在节点编辑和多选状态下仍无画布行为。
- `npm run build` 通过，不新增 TypeScript 或 Rollup 错误。

## 产物路由与收尾

- Plan：本文件，实施验证完成后移入 `docs/plans/archived/`。
- Source audit：`docs/audits/archived/2026-07-31-mindmap-ux-exploratory-review.md`。
- Covered findings：UX-05、UX-08。
- Deferred findings：UX-03、UX-04、UX-06、UX-07、UX-09。
- Capability docs：实施后更新 `docs/capabilities/mindmap-editing.md`。
- Design system impact：`update`；只更新键盘作用域和 Undo/Redo 的可复用交互规则，不改变视觉令牌或组件。
- Context map：预计无需更新，现有键盘状态机路由不变。
- Changelog：需要，用户可见的默认热键和导航/撤销行为发生变化。
- Distill：需要，实施后关闭计划并更新审计发现状态。
- ADR gate：不需要，除非实施中被迫改变全局键盘所有权边界。
- Completion：PLAN-1 至 PLAN-5 全部完成、无 blocked 步骤、构建与人工验证记录齐全后完成。
