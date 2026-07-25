---
artifact_type: plan
status: archived
created: 2026-07-25
updated: 2026-07-25
owner: codex
---

# 节点表格预览缩放与可视化编辑

## Goal

让节点内标准 Markdown 表格在不撑坏脑图布局的前提下支持局部预览缩放，并以 Obsidian 风格网格编辑器代替默认的源码编辑。

## Scope

- 在阅读态为表格提供默认自动适应的受限预览框；仅在悬停、选中或键盘聚焦时显示右上角图标工具条，提供缩放、适应、重置、展开和编辑操作。
- 局部缩放只作用于当前打开的脑图视图，不修改节点 Markdown，也不跨重开持久化。
- 使用 Modal 提供表头与单元格的网格编辑、行列增删和 TSV 粘贴。
- 通过既有节点 History 保存一次完整表格修改，并序列化为标准 Markdown 表格。
- 提供“编辑源码”作为复杂 Markdown 的兜底入口，不再把它作为普通表格的默认编辑体验。

## Non-goals

- 不实现节点画布内的可编辑单元格、公式、合并单元格、数据库属性或 Excel 文件导入。
- 不保存渲染 HTML、缩放比例或第二份表格状态。
- 不改变非表格节点、链接、图片或全局画布缩放的语义。

## Assumptions And Decisions

- 用户已确认采用节点内缩放预览配合 Modal 网格编辑器。
- 用户已确认采用内容优先的表格工具条：不常驻文本按钮，使用带 tooltip 的悬停/选中图标工具条。
- 表格节点标题保留为 Markdown 结构锚点，但不在脑图阅读态或网格编辑器中显示；节点预览最大约 760px，展开预览最大约 90vw × 85vh 且不继承节点内的缩放比例，表格自动撑满可用宽度。
- 节点 Markdown 仍是表格唯一事实来源；解析、编辑和保存均为确定性代码处理。
- 表格局部缩放默认是当前视图临时状态；`适应` 以预览框宽度计算，手动比例可重置为 100%。
- 编辑器首版支持普通单元格文本和原始行内 Markdown；复杂或不被网格模型支持的内容可转入源码编辑。
- ADR gate: not needed；该能力不改变存储格式和跨模块事实来源，只扩展节点表格的本地交互。
- 前置条件：先完成并合并 `2026-07-25-node-markdown-tables.md` 的基础表格能力；本计划不与该任务的提交混合。

## Fact Sources

- `src/mindmap/table/NodeTableMarkdown.ts`：现有表格识别、保护和序列化入口。
- `src/mindmap/INode.ts`：节点阅读态渲染、编辑态和 History 保存接线。
- `src/mindmap/insert/NodeInsertController.ts`：节点编辑工具栏的现有生命周期模式。
- `src/mindmap/image/NodeImagePreviewModal.ts`、`src/mindmap/link/EditNodeLinkModal.ts`：Obsidian Modal 的现有实现模式。
- `styles.css`、`DESIGN.md`：节点内容容器和已确认 UI 交互规则。

## Split Guidance

- Required: yes.
- Source: `dev-split`, 2026-07-25.
- Classification: proposed split, confirmed by user.
- `src/mindmap/table/NodeTableMarkdown.ts` owns table数据模型、GFM 表格解析和 Markdown 序列化；不得拥有 DOM、Modal 或节点 History。
- 新建 `src/mindmap/table/NodeTablePreviewController.ts`，只负责阅读态预览框、局部缩放、展开和编辑入口的 DOM 生命周期；可依赖表格模型与 Obsidian DOM API，不得直接保存节点数据。
- 新建 `src/mindmap/table/NodeTableEditorModal.ts`，只负责 Modal 网格、行列操作、TSV 粘贴和提交/取消回调；可依赖表格模型，不得直接操作 `INode` 或 History。
- `src/mindmap/INode.ts` 只创建和销毁预览控制器，并把编辑器提交内容交给既有 `ChangeNodeText` 保存路径；不得新增表格语法解析或网格事件逻辑。
- Do not add to: `src/mindmap/mindmap.ts`、`src/MindMapView.ts`，除非集成验证显示已有表格转换接口无法满足需求。
- 测试归属：表格模型规则由 `table/` 的针对性测试或可执行脚本覆盖；节点保存、撤销和阅读态交互使用集成验证。

## Owner Module Review

| Module | Owner responsibility | May depend on | Must not own |
|---|---|---|---|
| `src/mindmap/table/NodeTableMarkdown.ts` | 表格 Markdown 与内存模型转换 | TypeScript 标准库 | DOM、Modal、节点状态 |
| `src/mindmap/table/NodeTablePreviewController.ts` | 节点阅读态表格预览与临时缩放 | 表格模型、Obsidian DOM API | Markdown 保存、History、Modal 表格数据 |
| `src/mindmap/table/NodeTableEditorModal.ts` | 表格 Modal 编辑工作流 | 表格模型、Obsidian `Modal` | `INode` 生命周期、节点 History |
| `src/mindmap/INode.ts` | 节点生命周期与已有保存接线 | 上述 table 模块 | 表格解析、网格实现 |

## Steps And Verification

| ID | Status | Step | Verification |
|---|---|---|---|
| TABLE-UI-1 | done | 为现有表格 Markdown 建立行列模型、转义和序列化规则，覆盖空单元格、对齐分隔行、单元格内竖线与 TSV 输入。 | 表格模型往返验证了转义竖线、对齐、行列扩展和序列化。 |
| TABLE-UI-2 | done | 实现表格预览控制器，将阅读态表格放入受限视口并加入默认自动适应、悬停图标工具条、缩放、重置、展开与编辑入口。 | 用户在目标 Vault 验证标题锚点隐藏、预览与全宽展开预览。 |
| TABLE-UI-3 | done | 实现 Modal 网格编辑器，支持单元格、行列增删和 TSV 粘贴，并用提交回调交还 Markdown。 | Modal 通过模型序列化回调提交标准 Markdown，源码入口保留。 |
| TABLE-UI-4 | done | 将控制器和 Modal 接入 `INode` 的表格节点工作流，复用现有 `ChangeNodeText` 与焦点恢复行为。 | 表格提交只调用既有 `changeNodeText` 命令，用户完成实际 Vault 验收。 |
| TABLE-UI-5 | done | 更新设计系统和能力文档，执行构建、模型验证与 Obsidian 深浅主题交互回归。 | 构建、表格模型脚本、文档校验和目标 Vault 验收通过。 |

## Risks And Mitigations

- CSS `transform` 会让滚动几何与节点测量不一致：预览控制器必须用可测量的缩放策略，并在比例变更后请求节点布局刷新。
- 表格单元格可包含复杂 Markdown：首版只保证普通行内内容；不能无损建模时不静默改写，转入源码编辑。
- Modal 焦点和节点编辑态可能相互竞争：打开前结束或冻结当前编辑会话，关闭后仅在原节点仍有效时恢复焦点。
- 表格过大影响性能：预览与 Modal 均限制在当前节点生命周期，销毁时解除监听和 DOM 引用。

## Acceptance Criteria

- 宽表在脑图中保持在受限预览框内，不再把节点推到画布外。
- 用户可以适应、缩小、放大、重置和展开单个表格，且不修改 Markdown。
- 用户无需编辑表格源码即可完成常见单元格、行列与 TSV 粘贴操作。
- 保存、取消、撤销/重做、视图往返和重新打开文件均保持标准 Markdown 表格正确。
- 普通节点和现有链接、图片编辑工作流无回归。

## Artifact Routing

- Plan: `docs/plans/2026-07-25-table-preview-editor.md`。
- Design system impact: update `DESIGN.md`，以已确认的表格预览与 Modal 编辑规则替换“源码编辑为默认体验”的规则。
- Capability docs: update `docs/capabilities/mindmap-editing.md`。
- Changelog: needed；这是用户可见交互能力。
- Tests: needed；表格模型的回归规则必须可执行，节点工作流通过集成验证覆盖。
- Distill: needed；更新 `table/` 模块归属和能力事实，并关闭本计划。
- Check: needed；文档与生命周期产物变更后运行验证。

## Completion

已于 2026-07-25 归档。

## Verification Record

- `npm run build` 通过；仅报告仓库既有的 `WorkspaceLeaf.id` 与 `xmindZen.ts` 隐式 `any` 警告。
- 表格模型脚本验证转义竖线、对齐和序列化往返。
- 用户在目标 Vault 中验证节点标题隐藏、自适应预览、悬停工具条和展开预览撑满可用宽度。
