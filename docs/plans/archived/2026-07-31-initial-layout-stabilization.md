---
artifact_type: plan
status: archived
created: 2026-07-31
updated: 2026-07-31
owner: Codex
---

# 首次打开脑图布局稳定化

## Goal

让脑图首次打开时只在所有节点完成基础渲染和尺寸测量后执行正式布局，并正确合并后续异步尺寸变化，避免图片、表格、长文本或复杂 Markdown 节点重叠。

## Scope

- 分离“一次性节点首次渲染就绪”和“后续节点尺寸变化”两类事件。
- 使用节点对象集合跟踪首次渲染状态，替换可被重复事件污染的简单计数判断。
- 首次渲染完成前延迟正式布局；完成后统一重新测量节点、清除子树几何缓存并在下一帧布局。
- 将同一帧内的图片、表格、MathJax、Markdown 嵌入等尺寸变化合并为一次布局刷新。
- 保持首次打开后的根节点居中、折叠状态、样式模板和现有节点编辑行为。

## Non-goals

- 不重写 `Layout` 的节点排列算法。
- 不改变节点 Markdown、折叠数据或样式模板的持久化格式。
- 不通过固定延时、多次轮询或永久 `ResizeObserver` 掩盖初始化竞态。
- 不重构 `mindmap.ts`、`INode.ts` 的其他存量职责，也不以减少文件行数为目标。
- 不改变用户可见的节点间距、分支方向或画布操作方式。

## Assumptions And Decisions

- 用户确认采用“初始化屏障 + 事件职责拆分”路线。
- `INode.parseText()` 完成基础 Markdown 渲染、图片解码和节点尺寸测量后，只发送一次带当前节点引用的首次就绪事件。
- 表格预览及其他后续内容尺寸变化统一发送布局变化事件，不再参与首次就绪计数。
- `MindMap` 是首次渲染状态、延迟刷新和帧合并的唯一 owner；初始化期间的 `refresh()` 只记录待刷新，不创建或复用布局缓存。
- 初始节点树构建结束且待就绪节点集合为空后，在下一动画帧重新测量节点、清除全部 `boundingRect`，执行一次正式布局并居中根节点。
- 初始化完成后的尺寸变化按动画帧合并；有明确节点来源时清除该节点到根节点的几何缓存，无来源时清除整棵树。
- 样式模板仍在视图初始化阶段应用；其布局刷新请求由 `MindMap` 的初始化屏障自动延后，不增加样式模块的第二套初始化分支。
- 第一版不增加 `ResizeObserver`。若真实 Vault 仍能证明存在当前渲染事件无法覆盖的第三方晚到尺寸变化，再单独评估。
- ADR 不需要：该修复只校正现有视图生命周期和缓存失效时机，不改变数据所有权、公开 API 或持久化结构。

## Fact Sources

- `src/MindMapView.ts`：创建 `MindMap`、设置视图上下文、初始化节点并应用样式模板。
- `src/mindmap/mindmap.ts`：当前 `_nodeNum/_tempNum` 初始化判断、事件监听、布局创建、刷新和根节点居中。
- `src/mindmap/INode.ts`：异步 Markdown 渲染、图片解码、表格预览、节点尺寸测量和渲染事件。
- `src/mindmap/Layout.ts`：使用节点 `box` 与缓存的 `boundingRect` 排列子树。
- `src/mindmap/style/MindMapStyle.ts`：样式应用期间会请求布局刷新。
- `docs/capabilities/mindmap-editing.md`：节点 Markdown 渲染、图片预加载、表格预览和布局刷新现状。

## Split Guidance

- Classification: `no split`
- `src/mindmap/mindmap.ts` 继续拥有首次视图初始化、布局屏障和刷新调度状态；只增加完成当前生命周期职责所需的最小集合与帧调度逻辑。
- `src/mindmap/INode.ts` 只区分并发送首次就绪或后续尺寸变化事件，不拥有全图初始化状态。
- `src/MindMapView.ts` 保持视图接线入口；除非验证证明必要，不在此增加定时器或重复布局逻辑。
- `src/mindmap/Layout.ts` 只消费稳定节点尺寸，不增加异步渲染协调逻辑。
- Do not add to: 通用 `utils`、`helpers`、`common` 模块，或新的第二套布局协调器。
- Future trigger: 若初始化刷新状态继续增长为多阶段协议，或出现两个以上独立消费者，再重新评估具名 `InitialLayoutCoordinator` 模块。

## Steps And Verification

| ID | Status | Step | Verification |
|---|---|---|---|
| PLAN-1 | done | 复核首次打开链路并定位提前布局条件。 | 确认样式应用会在节点异步渲染完成前调用 `refresh()`；`initNode` 同时被基础渲染和表格尺寸回调使用，重复事件可使 `_tempNum` 提前达到或越过 `_nodeNum`；折叠展开会重新测量并清除 `boundingRect`。 |
| PLAN-2 | done | 在 `INode.ts` 分离首次就绪与后续尺寸变化事件，并让首次事件携带节点引用。 | 源码检索确认基础 `parseText()` 是唯一首次就绪发送点且携带节点；表格、图片、MathJax、嵌入内容和编辑刷新均进入 `renderEditNode` 尺寸变化路径。 |
| PLAN-3 | done | 在 `MindMap` 中以待就绪节点集合和树构建状态替代脆弱计数，并在初始化期间延迟布局。 | `Set.delete(node)` 使重复事件幂等；树构建状态、待就绪集合和单帧调度共同阻止提前布局，最后节点就绪后触发正式布局。 |
| PLAN-4 | done | 实现统一几何失效和按动画帧合并的布局刷新；首次正式布局前重新测量全部节点、清除缓存并居中根节点。 | 首次调度遍历节点重新测量并清除 `boundingRect`；后续尺寸事件清除节点祖先链或整树缓存，单个 `renderLayoutFrame` 合并同帧刷新；样式线宽在延迟布局后仍正确传入 `Layout`。 |
| PLAN-5 | done | 执行生产构建并在测试 Vault 回归首次打开及相关交互。 | `npm run build` 成功且无跳过项；最新 `main.js` 备份部署后与工作区 SHA-256 一致，用户确认大型测试导图首次打开及所列回归项目通过。 |
| PLAN-6 | done | 更新用户可见变更日志和当前能力事实，并完成计划生命周期关闭。 | `CHANGELOG.md` 已记录首次打开重叠修复；能力文档已描述初始化屏障与尺寸刷新规则；计划由 `dev-distill` 归档并通过 `validate-docs`。 |

## Risks And Controls

- 风险：初始化屏障阻止布局但未在最终节点就绪时释放，导致画布空白或节点停留在原点。控制：同时跟踪树构建完成和待就绪集合为空，并为重复事件做幂等处理。
- 风险：动态尺寸刷新与布局造成循环。控制：只观察已有渲染事件，按动画帧合并，并在尺寸或缓存无变化时不创建第二套轮询。
- 风险：首次正式布局改变当前居中时机。控制：根节点只在首次稳定布局后居中一次，后续尺寸刷新不强制改变用户视口。
- 风险：局部缓存失效不足导致深层子树仍重叠。控制：首次布局清除整棵树；后续已知节点清除其祖先链，来源未知时回退为整树失效。
- 风险：大型脑图全量重新测量造成打开卡顿。控制：初始化只执行一次全量测量，后续事件合并且优先局部失效；在真实大型导图观察打开耗时和刷新次数。

## Acceptance Criteria

- 首次打开包含图片、表格和长文本的脑图时，任何可见同级子树不得重叠。
- 不需要通过折叠再展开修复布局。
- 初始化完成判断对重复事件和异步完成顺序保持幂等。
- 样式模板应用不会在节点尺寸稳定前创建可复用的布局缓存。
- 后续图片、表格、MathJax 或 Markdown 嵌入尺寸变化会触发一次合并刷新，不造成刷新循环。
- 初始稳定布局后根节点正确居中；后续内容变化不强制重置用户视口。
- 已折叠节点保持折叠，Markdown/脑图切换和关闭重开后布局一致。
- 节点新增、编辑、图片排列、表格预览、折叠展开和撤销/重做无回归。
- `npm run build` 通过，并记录测试 Vault 的实际验证结果。

## Artifact Routing

- Plan: `docs/plans/archived/2026-07-31-initial-layout-stabilization.md`
- Audit: none
- Capability: implementation 后更新 `docs/capabilities/mindmap-editing.md`
- Design system impact: none；这是布局正确性修复，不建立新的视觉组件或交互规则
- Context map: 现有视图生命周期和节点 owner 路由足够，预计无需更新
- Changelog: 在 `CHANGELOG.md` 的 `Fixed` 下记录首次打开节点重叠修复
- Tests: 优先增加初始化状态和刷新合并的确定性检查；仓库无测试框架时至少保留可重复运行的验证脚本或构建内检查方案，不以人工观察替代全部逻辑验证
- ADR: not needed
- Distill: 实现完成后更新稳定能力事实并关闭本计划

## Completion

所有非延期步骤完成、无阻塞步骤、生产构建通过、测试 Vault 首次打开回归通过，并完成能力文档、变更日志和计划生命周期关闭后，本计划才可归档或删除。
