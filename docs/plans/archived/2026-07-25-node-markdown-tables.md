---
artifact_type: plan
status: archived
created: 2026-07-25
updated: 2026-07-25
owner: codex
---

# 节点内 Markdown 表格支持

## Goal

让一个节点中的标准 Markdown 表格可在脑图阅读态渲染、编辑态以源码编辑，并在 Markdown 与脑图视图往返及重新打开后保持不损坏。

## Scope

- 支持节点标题后附带的 GFM Markdown 表格。
- 表格仍属于该节点的 `data.text`，不转换为脑图子节点。
- 宽表在节点内横向滚动，不撑坏画布分支布局。

## Non-goals

- 不提供单元格级可视化编辑、增删行列、合并单元格、公式或独立的表格节点类型。
- 不改变链接、图片或普通多行节点的现有语义。

## Assumptions And Decisions

- 用户已确认第一版采用“标准 Markdown 源码编辑 + 阅读态表格渲染 + 宽表横向滚动”。
- 节点 Markdown 是唯一事实来源；不保存渲染 HTML 或表格的第二份状态。
- 表格块与其标题共同属于一个节点，Markdown/脑图往返不得把表格拆成节点树。
- ADR gate: not needed；这是局部内容能力，不改变持久化格式的事实来源或跨模块架构。

## Fact Sources

- `src/MindMapView.ts`：Markdown 到节点树的转换入口 `mdToData()`。
- `src/mindmap/mindmap.ts`：节点树回写 Markdown 的 `getMarkdown()`。
- `src/mindmap/INode.ts`：节点阅读态渲染、编辑态源码恢复与保存。
- `styles.css`：节点宽度及内容布局。
- `docs/capabilities/mindmap-editing.md`、`DESIGN.md`：节点 Markdown 和宿主 UI 约束。

## Split Guidance

- Required: yes.
- Source: `dev-split`，2026-07-25。
- Classification: proposed split.
- New owner: `src/mindmap/table/NodeTableMarkdown.ts` 只负责识别、保留、嵌入和序列化节点表格 Markdown；不得承担 DOM 渲染、编辑事件或脑图状态。
- Integration constraints:
  - `src/MindMapView.ts` 只调用表格编解码模块，保留视图生命周期与 Transformer 接线。
  - `src/mindmap/mindmap.ts` 只调用表格序列化模块，保留树遍历与 Markdown 写回。
  - `src/mindmap/INode.ts` 只保留阅读态渲染与编辑态接线；不得新增表格语法解析。
  - `styles.css` 只负责表格容器、滚动和主题变量。
- Deferred split trigger: 若表格开始需要单元格级交互或独立状态，再评估 `table/` 下的编辑控制器；本任务不提前建立它。

## Steps And Verification

| ID | Status | Step | Verification |
|---|---|---|---|
| TABLE-1 | done | 在隔离 Vault 复现当前表格在保存、重开和 Markdown/脑图切换后的损坏路径，并覆盖带标题、无标题、对齐列及宽表。 | 已以目标 Vault 文档复现 Markmap 将表格拆成节点树的路径。 |
| TABLE-2 | done | 新建 `NodeTableMarkdown` 编解码模块，定义节点表格块的识别、保护和恢复规则，并由 `mdToData()` 接入。 | 目标 Vault 文档、标题节点和列表节点均经转换检查，表格不会成为结构节点。 |
| TABLE-3 | done | 通过该模块更新 `getMarkdown()` 的节点正文序列化及 `INode` 编辑态恢复，保证表格源码逐行保留。 | 标题与列表节点的 Markdown 序列化调用同一模块；编辑态保留原始 Markdown 源码。 |
| TABLE-4 | done | 为节点阅读态表格增加受限宽度与横向滚动样式，沿用 Obsidian 主题变量。 | 已部署到 Vault，用户确认阅读态显示原生表格并可横向滚动。 |
| TABLE-5 | done | 更新能力与设计文档，执行构建和完整交互回归。 | `npm run build` 通过；目标 Vault 文档转换测试通过，用户完成脑图显示与编辑态源码检查。 |

## Acceptance Criteria

- 标准 GFM 表格可以作为节点正文保存。
- 表格在阅读态显示为表格，在编辑态显示为可修改的 Markdown 源码。
- 保存、脑图/Markdown 切换、重开文件后，表格仍属于原节点且内容不变。
- 宽表可在节点内滚动，不破坏脑图布局。

## Artifact Routing

- Plan: `docs/plans/2026-07-25-node-markdown-tables.md`。
- Source audit: none。
- Capability docs: 实现后更新 `docs/capabilities/mindmap-editing.md`。
- Design system: update `DESIGN.md`，记录节点内表格滚动与源码编辑规则。
- Changelog: needed；新增用户可见内容能力。
- Distill: needed；更新稳定能力事实并关闭本计划。
- Check: needed；文档与生命周期产物变更后验证。

## Completion

已于 2026-07-25 归档。进阶的受限预览、局部缩放和网格编辑由 `docs/plans/2026-07-25-table-preview-editor.md` 继续跟进。

## Verification Record

- 使用 `C:\Users\胡运宽\.codex\plugins\cache\cuberhyk-plugins\cuberhyk-dev-flow\0.9.1\bin\dev-flow.js validate-docs .` 验证文档路由。
- 使用实际 Vault 文档 `视觉多模态/基础知识/经典CNN/思维导图：经典卷积神经网络.md` 验证表格保护、Markmap 转换与恢复结果。
- `npm run build` 通过；构建仅报告仓库既有的 `WorkspaceLeaf.id` 和 `xmindZen.ts` 隐式 `any` 警告。
