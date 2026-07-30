---
artifact_type: plan
status: archived
created: 2026-07-29
updated: 2026-07-30
owner: codex
---

# 新节点全选编辑与 Markdown 快捷键

## Goal

任何入口创建的新节点都立即进入编辑态并全选默认文本；在节点编辑态支持常用 Markdown 格式快捷键，并在快捷键检查器中完整展示脑图节点实际支持的快捷键。

## Scope

- 通过 `AddNode` 的子节点、下方同级和上方同级创建路径统一标记新节点编辑意图，并在编辑表面完成初始化后全选默认文本。
- 为编辑态节点支持跨平台 `Ctrl`/`Cmd+B` 加粗、`Ctrl`/`Cmd+I` 斜体和 `Ctrl`/`Cmd+Shift+S` 删除线；以 Markdown 标记作为唯一保存格式。
- 将可配置的新建快捷键、固定节点/剪贴板/撤销操作和 Markdown 格式快捷键分组展示在快捷键检查器中，并读取 Obsidian 当前热键注册表展示全部插件命令绑定。

## Non-goals

- 不改变已有节点通过 `Space`、双击等方式进入编辑时的光标位置。
- 不支持浏览器富文本 HTML、未确认的格式语法或格式快捷键自定义。
- 不修改非脑图视图中的 Obsidian 全局快捷键。

## Assumptions And Decisions

- 用户已确认所有创建入口的新节点应立即进入编辑态并全选默认文本；这是单一连续用户操作。
- 用户已确认采用确定性 Markdown 转换，而不是保存浏览器富文本；`Ctrl`/`Cmd` 依据操作系统匹配。
- 有选区时格式快捷键包裹或取消 Markdown 标记；无选区时插入成对标记并将光标置于中间。
- 快捷键检查器展示脑图视图实际处理的节点快捷键和新增格式快捷键，并展示宿主当前热键注册表内本插件的全部命令绑定；不混入无关 Obsidian 全局命令。
- ADR gate: not needed；不改变存储格式、数据所有权或架构边界。

## Fact Sources

- `src/mindmap/Cmds.ts`：`AddNode.execute()` 是所有新节点的统一创建后编辑入口。
- `src/mindmap/INode.ts`：编辑表面、选区、Markdown 文本保存和现有格式包裹方法。
- `src/MindMapView.ts`：脑图视图级 `Scope`，用于在编辑态优先处理 Markdown 格式快捷键。
- `src/mindmap/interaction/MindMapShortcutInspector.ts`：快捷键检查器的固定与可配置分组。
- `DESIGN.md`、`docs/capabilities/mindmap-editing.md`：节点键盘交互和检查器的当前合同。

## Code Placement

- `INode.ts` 只提供显式的编辑选区和 Markdown 标记操作；不得使“文本恰好等于新节点”成为全选条件。
- `Cmds.ts` 只传递“由创建进入编辑”的明确意图；不得自行操作 DOM 选区。
- `MindMapView.ts` 通过视图级 `Scope` 在节点编辑态拦截并消费格式快捷键；不得处理面板 UI 或直接保存节点。
- `MindMapShortcutInspector.ts` 只展示固定快捷键和既有可配置项；不得重复键盘分发逻辑。

## Steps And Verification

| ID | Status | Step | Verification |
|---|---|---|---|
| NODE-SELECT-1 | done | 将新建节点的全选意图从默认文案判断改为 `AddNode` 到 `INode` 的显式参数。 | 已在测试 Vault 通过：子节点、下方同级、上方同级创建后，首次输入直接替换默认文本。 |
| MD-KEY-1 | done | 通过脑图视图级 `Scope` 将三组跨平台格式快捷键转换为 Markdown 包裹/取消包裹，并处理空选区。 | 已在测试 Vault 通过 `Ctrl+B`；Markdown 渲染及手动 `**` 输入保持正常。 |
| SHORTCUTS-1 | done | 将检查器扩展为可配置、新建/编辑/剪贴板与格式三个可读分组，并读取宿主当前热键注册表。 | 标题栏键盘入口打开后，所有脑图实际处理的快捷键与当前插件命令绑定可见，格式项清楚标明仅编辑态生效。 |
| DOC-1 | done | 更新设计系统、能力说明、变更日志并归档计划。 | 文档校验与最终构建通过，行为描述与实现一致。 |

## Risks And Mitigations

- `Ctrl/Cmd+B` 与宿主默认行为冲突：仅在脑图编辑态、有效节点目标且非 IME 组合输入时消费事件。
- 空选区格式化若保留错误 Range 会插入到节点外：使用节点内容范围验证，并在插入后恢复节点内光标。
- 快捷键面板误称“全部”而遗漏动态全局绑定：仅展示脑图状态机实际消费的操作，并保持两项可配置绑定动态读取。

## Acceptance Criteria

- 任意方式创建的新节点在出现时已处于编辑态，默认文本处于全选状态。
- `Ctrl/Cmd+B`、`Ctrl/Cmd+I`、`Ctrl/Cmd+Shift+S` 仅在编辑态操作 Markdown 文本，且可切换回未格式化文本。
- 快捷键检查器能让用户查看所有脑图节点支持的快捷键及其适用状态。
- 不回归 Enter/Tab 创建、Shift+Enter 换行、撤销/重做、剪贴板和 Markdown/脑图往返。

## Artifact Routing

- Plan: 当前文件，完成后移入 `docs/plans/archived/`。
- Design system: update；快捷键检查器增加确认的可复用分组和编辑格式规则。
- Capability docs: update；节点创建选区与 Markdown 快捷键是稳定行为。
- Changelog: needed；这是用户可见交互变化。
- Tests: 当前仓库没有自动化测试框架；通过 `npm run build` 与隔离测试 Vault 交互矩阵验证。
- Distill and check: needed；完成前运行相应门禁。
