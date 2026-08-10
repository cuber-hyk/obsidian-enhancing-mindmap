---
artifact_type: plan
status: archived
created: 2026-08-08
updated: 2026-08-08
owner: Codex
---

# 大型脑图画布自动扩展

## Goal

让脑图画布和 SVG 连线层在可见节点超出当前边界时自动扩展，避免大型脑图出现文字仍可见但曲线和节点下划线被裁剪，同时保持当前视口、缩放和选中状态稳定。

## Scope

- 新增 `CanvasBoundsController`，统一计算可见节点边界、运行时画布尺寸、必要的根节点平移和滚动补偿。
- 将插件设置中的 `canvasSize` 解释为最小画布尺寸；实际运行时尺寸可按内容向右、向下扩展。
- 可见节点接近画布左侧或顶部安全边距时，整体平移脑图并补偿当前滚动位置，再完成一次受控重排。
- 当前视图生命周期内只扩展、不因折叠、删除或内容缩短自动收缩；新建实例或显式修改画布设置时从新的最小尺寸重新计算。
- 让首次布局、异步节点尺寸刷新、增删移动、折叠展开、外部同步、居中、缩放、导航器和导出恢复使用同一最终画布边界。
- 更新能力文档、设计合同、上下文路由和变更日志。

## Non-goals

- 不改变节点 Markdown、节点位置持久化格式或脑图文件结构。
- 不移除“画布尺寸”设置，也不增加新的自动扩展开关或最大尺寸设置。
- 不修改 `Layout.ts` 的节点排列与连线算法。
- 不实现运行期间自动缩小画布。
- 不增加移动端专用 UI 或触摸交互。
- 不以减少文件行数为目标进行额外重构。

## Assumptions And Decisions

- 已确认采用独立 `CanvasBoundsController`，不把边界算法继续写入 `mindmap.ts`。
- 已确认 `canvasSize` 保留并作为最小值；自动计算的运行时尺寸不写回插件设置或 Markdown。
- 已确认当前视图只扩展不缩小，避免折叠、删除或异步渲染引发视口跳动；重新打开时重新计算。
- 使用现有导出逻辑的 60px 边距语义作为节点与画布边缘的安全区，不引入用户配置。
- 只有有限且有效的节点几何才参与计算；不设置会重新造成裁剪的人为最大值。
- 根节点发生正向平移时，按当前缩放比例补偿滚动位置，使用户看到的画布内容保持原位。
- ADR gate：不需要；这是可逆的运行时布局修复，不改变数据所有权、公共格式或持久化策略。

## Fact Sources

- 复现文档：`E:\Learning-materials\Obsidian\LLM\思维导图：Happy-LLM 第一章 NLP 基础概念.md`
- 当前测试插件设置：`E:\Learning-materials\Obsidian\LLM\.obsidian\plugins\enhancing-mindmap-local\data.json`
- `src/mindmap/mindmap.ts`
- `src/mindmap/Layout.ts`
- `src/mindmap/navigation/MindMapNavigatorController.ts`
- `src/MindMapView.ts`
- `src/settings.ts`
- `src/settingTab.ts`
- `docs/capabilities/mindmap-editing.md`
- `DESIGN.md`

## Split Guidance

- Required: yes；`mindmap.ts` 为 1813 行中央类，画布边界包含独立状态与 DOM/滚动副作用。
- Source: `/dev-split`，用户已确认 proposed split。
- Classification: proposed split。
- New behavior owner: `src/mindmap/CanvasBoundsController.ts`。
- Do not add behavior to: `src/mindmap/mindmap.ts`；该文件只允许增加控制器构造、销毁和布局后调用接线。
- Side effects owner: `CanvasBoundsController` 负责画布/SVG 尺寸、根节点边界平移和滚动补偿。
- State owner: 控制器保存当前视图已经扩展到的宽高；插件设置仍只保存最小 `canvasSize`。
- Stable facade: `MindMap` 暴露最小的画布重置/刷新入口供设置和导出恢复调用，不暴露控制器内部几何策略。
- Test owner: 控制器中的纯边界计算用直接源码用例验证；Obsidian 测试 Vault 覆盖布局、导航、缩放和导出集成。
- Deferred split trigger: 若实现需要移动缩放或导航状态所有权，停止并重新运行 `/dev-split`；本任务不扩大边界。

## Owner Module Review

| Module | Owner responsibility | May depend on | Must not own |
|---|---|---|---|
| `src/mindmap/CanvasBoundsController.ts` | 可见节点边界、运行时画布尺寸、边界平移与视口补偿 | `MindMap` 类型、节点几何和 DOM 尺寸 | 节点排列算法、导航 UI、导出序列化、持久化设置 |
| `src/mindmap/mindmap.ts` | 控制器生命周期和布局刷新接线 | `CanvasBoundsController` | 新的边界计算规则 |
| `src/MindMapView.ts` | 导出前后状态编排 | `MindMap` 稳定画布入口 | 重复实现边界算法 |
| `src/mindmap/navigation/MindMapNavigatorController.ts` | 最终节点几何和当前视口的导航映射 | 扩展后的 `appEl`/节点 box | 改写画布尺寸 |

## Steps And Verification

| ID | Status | Step | Verification |
|---|---|---|---|
| PLAN-1 | done | 用当前 322 节点文档记录固定 `8000px` 画布下的节点总数、节点包围盒和 SVG 尺寸，确认裁剪边界。 | 测试 Vault 中确认 `322/322` 节点完整、节点边界超出 SVG，增大画布后连线恢复。 |
| PLAN-2 | done | 新增 `CanvasBoundsController` 及可独立验证的边界计算：以 `canvasSize` 为最小值，加入 60px 安全区，只扩展，并在左/上越界时返回所需平移。 | 直接加载实际 TypeScript 源码验证小图不扩展、右/下扩展、左/上平移、非有限几何忽略、重复调用尺寸稳定。 |
| PLAN-3 | done | 将控制器接入 `MindMap` 构造、设置应用、首次及后续布局刷新和销毁；平移后最多补做一次布局，并在当前缩放下补偿滚动。 | 验证没有递归刷新或持续增长；首次打开、异步渲染、增删移动、折叠展开后节点和全部连线始终位于画布内。 |
| PLAN-4 | done | 调整根节点居中与 `MindMapView` 导出恢复，使其使用实际根节点和最终运行时画布；保持外部同步和 staging 画布替换的现有视口恢复。 | 验证根节点居中、当前节点居中、实时同步、PNG/JPEG/SVG 导出后视图尺寸与滚动位置恢复。 |
| PLAN-5 | done | 验证导航器在动态画布、20%/100%/300% 缩放和画布平移后的缩略图、视口框、点击定位和拖拽定位；验证设置改为 4000、8000、16000、36000 时均从最小值重新计算。 | 测试 Vault 完成四种布局方向、缩放、导航器交互和设置变更矩阵；小脑图外观和操作不变。 |
| PLAN-6 | done | 更新 `DESIGN.md`、`docs/capabilities/mindmap-editing.md`、`docs/ai/context-map.md` 与 `CHANGELOG.md`，生成 `main.js` 并运行完整门禁。 | `npm run build`、`git diff --check`、Dev Flow 文档校验和人工独立评审通过；用户桌面端验收大型脑图。 |

## Risks And Controls

- 二次布局循环：控制器只允许一次边界平移重排，尺寸扩展本身不得再次触发布局。
- 视口跳动：平移根节点时同步补偿 `scrollLeft`/`scrollTop`，尺寸仅向右/下增长时不改滚动。
- 导出污染运行时状态：导出临时尺寸与运行时自动边界分离，恢复后重新应用当前视图扩展尺寸。
- 导航器漂移：导航器只在控制器完成边界处理后刷新，并继续使用实际 DOM 几何反算视口。
- 异常几何导致无限画布：忽略 `NaN`、无穷值和非正尺寸，且相同边界重复刷新不得继续增长。

## Execution Verification

- 边界算法源码用例覆盖小图不扩展、右/下扩展、左/上平移、非有限几何忽略、重复调用稳定、300% 缩放滚动补偿和显式最小尺寸重置。
- `npm run build`、Git 空白差异检查和 Dev Flow 文档校验通过；构建仅保留与本任务无关的仓库既存 TypeScript 警告。
- 用户在测试 Vault 中验收 `canvasSize=8000` 的 322 节点复现文档，确认曲线和下划线完整、导航器节点数保持、折叠展开及缩放导航无异常。
- 四种布局、所有尺寸与全导出格式的组合矩阵本轮未逐项录屏；通过方向无关的边界算法用例、现有导航/导出几何调用链审查和主复现桌面验收进行比例化覆盖，完整矩阵保留为能力文档的后续回归基线。

## Acceptance Criteria

- 当前 322 节点复现文档在 `canvasSize=8000` 时无需手动放大设置，所有可见节点曲线和下划线完整显示。
- 导航器仍显示 `322/322`，缩略图、视口框、点击和拖拽定位准确。
- 节点新增、删除、移动、折叠、展开和异步内容尺寸变化后，画布按需扩展且不产生闪烁、失焦或滚动跳跃。
- 当前视图折叠或删除节点后画布不自动缩小；关闭并重新打开后按当前内容和最小画布重新计算。
- 小型脑图保持现有尺寸、居中、缩放、导出和实时同步体验。
- 派生画布尺寸不写入 Markdown 或插件设置。
- 生产构建、文档校验、差异检查和用户桌面端验收全部通过。

## Artifact Routing

- Plan: `docs/plans/archived/2026-08-08-auto-expand-mindmap-canvas.md`
- Source audit: none；原因诊断保留在对话中
- Covered findings: none
- Deferred findings: none
- Capability docs: implementation closeout updates `docs/capabilities/mindmap-editing.md`
- Design system impact: update；记录画布尺寸为最小值及运行时只扩展规则
- Context map: update；增加 `CanvasBoundsController` 画布边界 owner 路由
- Changelog: needed；修复大型脑图连线裁剪
- Distill: needed；更新当前能力、设计规则并关闭计划
- ADR gate: not needed；运行时可逆布局修复

## Completion

当 PLAN-1 至 PLAN-6 全部完成、没有阻塞项，自动与桌面端验证均已记录，并完成 changelog、design-system、distill、check 和独立评审门禁后，将本计划移入 `docs/plans/archived/`。
