---
artifact_type: plan
status: archived
created: 2026-08-04
updated: 2026-08-04
owner: Codex
---

# 批量编号直接子节点

## Goal

为已有的普通同级节点提供一次性有序编号能力，并让转换后的节点继续复用现有自动重排规则，避免用户逐个手工添加序号。

## Scope

- 注册“批量编号子节点”插件命令；当前节点作为父节点，按现有子节点顺序处理其全部直接子节点。
- 普通节点增加 `1. `、`2. ` 等前缀；已匹配 `数字. ` 或 `数字) ` 的节点替换原前缀并保留正文。
- 全组统一从 `1. ` 开始，转换后继续参与已有的新增、删除和移动自动重排。
- 整次转换作为一条 History 命令，支持一次撤销和一次重做；没有文本变化时不写入历史。
- 命令不提供默认热键，用户通过 Obsidian 快捷键设置绑定；右侧快捷键面板将其作为高频操作显示，并读取宿主当前有效绑定。
- 更新简体中文、繁体中文和英文界面文本，以及当前能力和快捷键面板设计事实。

## Non-goals

- 不递归编号孙节点或更深层节点。
- 不处理多选节点、任意范围选择或只编号部分同级节点。
- 不新增独立工具箱、节点右键菜单、编号格式弹窗或移除编号命令。
- 不增加移动端专用交互。
- 不改变当前自动编号对 `数字. `、`数字) ` 连续组的既有行为。

## Assumptions And Decisions

- 用户已确认采用“选中父节点，处理其直接子节点”的明确作用范围。
- 用户已确认该能力属于高频操作，应纳入右侧快捷键面板。
- 快捷键仍以 Obsidian 命令注册表为唯一事实来源；面板只展示当前绑定，不建立第二套配置。
- 第一版固定规范化为从 `1. ` 开始，避免引入起始编号和分隔符配置。
- 命令只识别与现有解析器相同且带空格的有序前缀，减少把普通数字文本误判为编号的概率。
- ADR gate：不需要；这是可逆的局部交互扩展，没有更换数据源或公共架构。

## Fact Sources

- `docs/capabilities/mindmap-editing.md`
- `DESIGN.md`
- `src/mindmap/interaction/OrderedSiblingNumbering.ts`
- `src/mindmap/Cmds.ts`
- `src/mindmap/Execute.ts`
- `src/main.ts`
- `src/mindmap/interaction/MindMapShortcutInspector.ts`
- `src/mindmap/interaction/PluginShortcutCatalog.ts`
- `src/lang/locale/en.ts`
- `src/lang/locale/zh-cn.ts`
- `src/lang/locale/zh-tw.ts`

## Split Guidance

- Required: no。
- Classification: no split。
- Code placement: 编号解析和文本更新继续归 `OrderedSiblingNumbering.ts`；可撤销状态变更归 `Cmds.ts`，`Execute.ts` 仅接线，`main.ts` 仅注册命令，快捷键展示归 `MindMapShortcutInspector.ts`。
- Guardrail: 不把批量编号算法直接写入体量较大的 `main.ts` 或视图模块。
- Deferred split trigger: 若实现需要在 `Cmds.ts` 增加与编号无关的通用批量文本框架，再单独使用 `/dev-split` 评估；本任务不提前抽象。

## Steps And Verification

| ID | Status | Step | Verification |
|---|---|---|---|
| PLAN-1 | done | 用纯文本输入覆盖普通、已编号、混合和无需变更四种直接子节点集合，确认现有解析边界与目标输出。 | 已直接加载实际 TypeScript 源码验证四类输入，最终完整节点集合和增量更新数量均符合预期。 |
| PLAN-2 | done | 在 `OrderedSiblingNumbering.ts` 增加批量生成编号文本更新的单一入口，复用现有前缀解析语义。 | 普通、`.`/`)` 混合前缀、多行 Markdown 和数字开头但无合法前缀的源码用例通过。 |
| PLAN-3 | done | 增加批量编号 History 命令并接入 `Execute.ts`，统一应用文本、刷新尺寸与布局，保存前后文本快照。 | 测试 Vault 已验证批量执行和界面刷新；无变化操作在进入 History 前拦截。 |
| PLAN-4 | done | 注册标准插件命令，仅在活动脑图存在单选、非编辑且具有直接子节点时可用，不配置默认热键。 | 测试 Vault 已确认命令可用；热键由 Obsidian 宿主设置管理。 |
| PLAN-5 | done | 在右侧快捷键面板的高频节点操作中展示该命令的当前有效绑定，复用 `PluginShortcutCatalog`；补充三套语言文本。 | 修复未绑定时整行隐藏的问题后，测试 Vault 已确认面板显示通过。 |
| PLAN-6 | done | 更新 `mindmap-editing.md` 与 `DESIGN.md` 的当前事实，并完成构建和桌面端回归。 | `npm run build`、Dev Flow 文档校验和用户桌面端验收均通过。 |

## Acceptance Criteria

- 选中父节点执行命令后，其全部直接子节点按当前顺序变为从 `1. ` 开始的连续有序节点。
- 已有合法编号仅替换编号前缀，节点 Markdown 正文和所有后代结构保持不变。
- 后续新增、删除和移动仍由现有有序同级节点逻辑自动重排。
- 批量转换可一次撤销、一次重做，重复执行不产生可观察变化。
- 命令可在 Obsidian 中自定义热键，并在右侧快捷键面板显示当前有效绑定。
- `npm run build` 通过，桌面端手动验证无节点失焦、尺寸陈旧或布局必须折叠后恢复的问题。

## Artifact Routing

- Plan: `docs/plans/2026-08-04-bulk-number-child-nodes.md`
- Source audit: none
- Capability docs: implementation closeout updates `docs/capabilities/mindmap-editing.md`
- Design system: implementation closeout updates `DESIGN.md` 的高频快捷键面板规则
- Context map: no update expected; owner modules不变
- Changelog: needed；新增用户可见命令和快捷键入口
- Distill: needed；更新能力文档并运行 ADR gate，预期无需 ADR

## Completion

当 PLAN-1 至 PLAN-6 全部完成、构建和手动验证结果已记录、没有阻塞项，并完成 Dev Flow 的 changelog、distill、check 与评审门禁后，本计划可归档。
