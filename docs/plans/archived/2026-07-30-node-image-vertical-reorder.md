---
artifact_type: plan
status: archived
created: 2026-07-30
updated: 2026-07-31
owner: Codex
---

# 节点图片上下排列与拖拽换位

## Goal

让脑图节点中的选中图片可在整段文字上方或下方拖拽换位，并将结果继续保存为节点 Markdown，使阅读态、重新打开、撤销和重做保持一致。

## Scope

- 编辑态选中图片后，允许将该图片拖到节点正文上方或下方。
- 拖动时显示明确的上方或下方插入指示。
- 松开后立即更新编辑态 DOM 和节点布局；结束编辑时通过现有节点文本历史链路保存。
- 阅读态按保存后的 Markdown 顺序显示“上图下文”或“上文下图”。
- 多张图片存在时，仅把当前图片移动到可编辑正文（文字与图片）最前或最后，其余正文相对顺序不变；独立链接附件层不参与图片落点计算。
- 更新当前能力文档和项目级图片交互规则。

## Non-goals

- 不支持把图片拖入文字的任意字符位置。
- 不支持自由画布、图片重叠、网格布局或节点之间拖图。
- 不增加独立的节点布局字段、兼容分支或第二数据源。
- 不重构现有图片缩放、删除和预览行为。
- 不以减少 `INode.ts` 行数为目标。

## Assumptions And Decisions

- 用户已确认拖拽仅提供“整段文字上方”和“整段文字下方”两个落点，键盘命令另提供上、下、左、右四向布局。
- 节点 Markdown 继续作为唯一事实源；上下位置通过必要的 `<br>` 分隔表达，左右位置通过同行 Markdown 顺序表达。
- 拖动仅在节点编辑态且图片已被选中后开始，图片手势必须阻止冒泡到现有节点拖拽。
- 编辑态节点统一禁止原生节点拖动；结束编辑后才按节点选择状态恢复 draggable，不再由图片控制器临时切换。
- `Alt+↑/↓/←/→` 分别注册为四个独立 Obsidian 图片布局命令，可在快捷键面板重新绑定；原展开/收缩命令不再占用 `Alt+↑/↓` 默认键。
- 无效拖动或落回原位置不写入内容变更，也不产生历史记录。
- 多图场景下，上方落点表示移动到可编辑正文之前，下方落点表示移动到可编辑正文之后；链接附件继续使用现有独立链接层和保存语义。
- ADR 不需要：该交互可逆，且没有改变数据所有权或公开 API。

## Fact Sources

- `CONTEXT.md`：节点 Markdown 是节点富文本显示的唯一事实来源。
- `docs/capabilities/mindmap-editing.md`：图片保存、编辑态图片控件、历史记录和预加载行为。
- `DESIGN.md`：节点编辑控件、图片交互、单一数据源、主题和可访问性规则。
- `src/mindmap/INode.ts`：编辑态图片 DOM、选择、缩放、删除、序列化和布局刷新入口。
- `src/mindmap/image/NodeImageMarkdown.ts`：图片 Markdown 解析与序列化。
- `src/mindmap/mindmap.ts`：节点级拖放事件委托，图片拖动必须与其隔离。
- `styles.css`：当前图片为行内块并与文本基线对齐。

## Split Guidance

- Classification: no split
- `src/mindmap/INode.ts` 保持节点生命周期和编辑接线入口，不拆分存量行为。
- 新增 `src/mindmap/image/NodeImageReorderController.ts`，只负责图片边界拖动状态、落点指示和排序回调。
- 控制器可以依赖 DOM 与调用方提供的回调，不得拥有节点 Markdown、History 或脑图布局状态。
- `INode.ts` 不得新增完整的 pointer 状态机；它只创建/销毁控制器、执行受控 DOM 换位、标记编辑结构变化并刷新布局。
- `NodeImageMarkdown.ts` 只承载必要的确定性 Markdown 规范化，不承载 DOM 或交互状态。
- 若实现需要迁移现有图片缩放、预览或删除职责，停止当前路线并重新进行 split 决策。

## Steps And Verification

| ID | Status | Step | Verification |
|---|---|---|---|
| PLAN-1 | done | 复现并确认当前图文只按行内顺序排列，同时定位图片编辑、序列化和节点拖拽入口。 | 检查 `styles.css`、`INode.ts`、`NodeImageMarkdown.ts` 与 `mindmap.ts`；确认图片为 `inline-block`，图片原生拖动被禁用，节点外层已有拖放处理。 |
| PLAN-2 | done | 在 `NodeImageMarkdown.ts` 中补充最小的边界排序/分隔规范化逻辑，确保上方和下方结果只由 Markdown 顺序表达，并保持其余内容相对顺序。 | 通过 11 个运行时检查覆盖单图、多图、带空格的原位不变、无效索引、图片宽度、句中空格和手动 `<br>` 保留。 |
| PLAN-3 | done | 修正图片排序的事件所有权：编辑态节点统一关闭原生 draggable，控制器仅处理 pointer 排序；四向图片布局通过 Obsidian 命令单一路由。 | 编辑开始/结束、多选视觉同步和控制器状态已检查；部署后用户确认图片拖动与 `Alt+↑/↓` 运行正常。 |
| PLAN-4 | done | 在 `INode.ts` 接入控制器，完成图片 DOM 边界换位、编辑结构变更标记、焦点恢复和实时布局刷新；阅读态应用对应的块级排列样式。 | 通过 Markdown 顺序和 `<br>` 复用现有阅读态渲染；构建及 Obsidian 运行时验证通过。 |
| PLAN-5 | done | 补充样式、翻译与可访问状态，并更新 `DESIGN.md` 和 `docs/capabilities/mindmap-editing.md` 为最终行为。 | 使用 Obsidian 主题变量实现指示和状态，补充中英文可访问说明、`aria-grabbed` 与四向布局命令。 |
| PLAN-6 | done | 执行生产构建和 Obsidian 手工回归。 | `npm run build` 成功且无跳过项；构建产物部署到测试 Vault 并核对哈希后，用户确认图片拖动、四向快捷键及快捷键面板行为通过。 |

## Acceptance Criteria

- 只有编辑态已选中的图片可以启动内部排序拖动。
- 拖动时仅出现两个清晰落点：正文上方和正文下方。
- 图片拖动不会触发节点移动、画布平移或文字选择。
- 上方落点保存后稳定显示图片在上、文字在下；下方落点反之。
- 保存、重新打开以及 Markdown/脑图视图切换后位置不变。
- 一次有效换位通过现有节点文本变更进入撤销/重做；无效换位不创建变更。
- 多张图片只移动当前图片到内容首端或尾端，其余内容顺序不变。
- 现有图片插入、缩放、预览、删除和节点拖动行为无回归。
- `npm run build` 通过，并记录完整的 Obsidian 手工验证结果。

## Artifact Routing

- Plan: `docs/plans/archived/2026-07-30-node-image-vertical-reorder.md`
- Source audit: `docs/audits/archived/2026-07-30-node-image-reorder-runtime-exploratory-review.md`
- Covered findings: `IMG-RUNTIME-1`、`IMG-RUNTIME-2`、`IMG-RUNTIME-3`
- Capability docs: implementation完成后更新 `docs/capabilities/mindmap-editing.md`
- Design system: implementation完成后更新 `DESIGN.md`
- Context map: 现有图片 owner 路由已足够，预计无需更新
- Changelog: 功能完成后需要新增用户可见功能条目
- Distill: 实现完成后需要关闭计划并同步稳定能力事实
- ADR: not needed

## Completion

所有非延期步骤完成、无阻塞步骤、生产构建通过，并记录测试 Vault 中的手工回归结果后，计划才可关闭。
