---
artifact_type: plan
status: archived
created: 2026-07-14
updated: 2026-07-14
owner: agent
plan_readiness: ready
source_audit: ""
covered_findings: []
deferred_findings: []
design_system_impact: update
---

# 编辑态图片双击预览计划

## 目标

节点处于编辑态时，双击其中的图片可打开适配当前窗口的只读大图预览，并在关闭后继续原节点编辑，同时不改变节点 Markdown、图片宽度或撤销历史。

## 范围

- 范围内：编辑态图片双击事件、Obsidian `Modal` 灯箱、窗口内等比例适配、关闭与焦点恢复、深浅主题和现有图片编辑交互回归。
- 范围外：阅读态图片预览、滚轮缩放、拖拽平移、旋转、下载、图片内容编辑、独立标签页以及移动端专用手势。

## 计划就绪检查

- 目标明确：是；可通过编辑态双击图片并关闭预览观察结果。
- 范围明确：是；第一版只提供只读、窗口适配的灯箱。
- 事实来源已知：是；节点 Markdown 是唯一事实来源，编辑态图片 DOM 由 `INode.createEditableImage()` 创建。
- 关键决策已确认：是；用户确认仅编辑态双击打开只读灯箱的路线。
- 验证路径已知：是；执行生产构建，并在授权测试 Vault 中完成交互与回归检查。

## 假设与决策

- 复用 Obsidian `Modal`，不引入独立弹窗框架或新的图片查看器依赖。
- 预览使用编辑态图片已经解析出的 `img.src` 和 `alt`，不重新解析或修改节点 Markdown。
- 图片默认按可视窗口等比例适配；第一版不提供缩放倍率状态、滚轮缩放或平移。
- `Escape`、Obsidian Modal 关闭按钮和点击遮罩遵循宿主默认关闭行为。
- 预览关闭后，仅当原节点仍处于同一编辑会话且图片元素仍存在时恢复图片焦点；否则不跨节点恢复焦点。
- 双击图片必须阻止事件冒泡到 `MindMap.appDblclickFn()`；单击选中、拖拽缩放和键盘删除语义保持不变。
- 阅读态双击图片仍沿用当前节点双击行为，不扩展本次功能范围。

## 已检查的决策点

| 决策 | 已选路线 | 确认者 | ADR 门禁 |
|---|---|---|---|
| 放大查看的呈现方式 | Obsidian Modal 只读灯箱，不在节点内放大 | 用户 | not needed；局部、可逆的 UI 选择 |
| 生效状态 | 仅节点编辑态 | 用户 | not needed |
| 第一版查看能力 | 窗口适配，无滚轮缩放和拖拽平移 | 用户 | not needed |
| 数据来源 | 复用已解析图片资源，不写回 Markdown | 代码事实与用户目标 | not needed |

## 拆分指导

- Required：no。
- Classification：not applicable；功能边界小且已有明确的图片 owner。
- Code-placement constraints：新增预览 Modal 放入 `src/mindmap/image/`；`src/mindmap/INode.ts` 只保留双击事件与编辑会话接线；样式放入 `styles.css`。
- Deferred split trigger：只有后续增加缩放、平移、旋转或多图导航等独立查看器状态时，才重新评估提取完整图片预览控制器。

## 步骤与验证

步骤状态只允许 `todo`、`done`、`blocked`。

| ID | Status | 步骤 | 验证 |
|---|---|---|---|
| PLAN-1 | done | 在测试 Vault 复现编辑态图片当前仅能选中/缩放、双击不预览的基线，并记录 Vault 图片与普通 Markdown 图片的现状。 | 代码与运行态确认当前无预览 Modal，节点单击、缩放和删除行为正常。 |
| PLAN-2 | done | 在 `src/mindmap/image/` 新增职责单一的图片预览 Modal，使用现有图片 `src`、`alt` 和 Obsidian 宿主关闭语义；在 `styles.css` 中实现不超出视口的等比例展示。 | 静态检查确认 Modal 不持有或写入节点 Markdown；用户确认测试 Vault 显示通过。 |
| PLAN-3 | done | 在 `INode.createEditableImage()` 中接入图片双击，排除缩放手柄，阻止画布双击冒泡，并在 Modal 关闭后按编辑会话有效性恢复焦点。 | 用户确认运行态交互通过；代码守卫确保关闭后只恢复仍有效的编辑图片。 |
| PLAN-4 | done | 运行生产构建并检查变更范围。 | `npm run build` 成功，仅有仓库既有警告；`git -c core.whitespace=cr-at-eol diff --check` 通过。 |
| PLAN-5 | done | 将构建产物更新到授权测试 Vault，验证 Vault 图片、Markdown 图片、多图片节点以及 `Escape`、关闭按钮、遮罩关闭。 | `main.js`、`styles.css` 与测试 Vault 哈希一致，用户确认运行态验证通过。 |
| PLAN-6 | done | 回归单击选中、缩放手柄、`Backspace`/`Delete` 删除、节点双击进入编辑、深浅主题和异常图片加载，并记录结果。 | 用户按交付验证清单确认通过，未报告现有交互回归。 |
| PLAN-7 | done | 在实现验证通过后更新图片编辑能力说明、设计规则和用户可见变更记录，并执行 Dev Flow closeout 检查。 | 已更新 `docs/capabilities/mindmap-editing.md`、`DESIGN.md` 和 `CHANGELOG.md`；文档检查在评审前执行。 |

## 验收标准

- 只有节点编辑态的图片双击会打开大图预览。
- 预览图片使用原资源、保持比例并限制在当前窗口可视区域内。
- `Escape`、关闭按钮和遮罩均可关闭预览，关闭后原编辑会话仍可继续。
- 打开或关闭预览不会修改节点 Markdown、图片宽度、脑图布局或撤销/重做历史。
- 单击选中、图片缩放、图片删除和节点双击进入编辑行为没有回归。
- `npm run build` 通过，并完成授权测试 Vault 的深浅主题与 Markdown/脑图往返验证。

## 产物路由

- 计划：`docs/plans/2026-07-14-edit-image-preview.md`。
- 能力文档更新：实现验证通过后更新 `docs/capabilities/mindmap-editing.md`。
- 设计系统影响：`update`；实现验证通过后在 `DESIGN.md` 增加编辑态图片预览交互规则，不新增设计令牌。
- Changelog：needed；这是用户可见的图片交互能力。
- Distill：needed；同步能力和设计规则，并决定计划归档或删除。
- Context map：none；现有图片 owner 路由已覆盖本功能。
- 审计输出：none。
- 来源审计：none。
- 覆盖发现：none。
- 延后发现：none。
- ADR 门禁：`not needed`；不改变数据模型、公共 API 或长期架构。
- 测试：生产构建与授权测试 Vault 人工交互矩阵；仓库当前没有自动化测试框架。

## Git 可见性

- 计划创建后已运行 `git status --short --branch --untracked-files=all`，Git 可见性正常。
- 实施完成后按计划归档到 `docs/plans/archived/2026-07-14-edit-image-preview.md`。

## 关闭方式

`dev-distill` 已选择归档本计划，因为它记录了用户确认的图片预览交互边界和验证矩阵；归档后位于 `docs/plans/archived/` 且状态为 `archived`。

仅当所有未延后步骤均为 `done`、没有 `blocked` 步骤且验证已有记录时，才可关闭计划。

不得使用 `completed` 或 `superseded` 作为最终状态。
