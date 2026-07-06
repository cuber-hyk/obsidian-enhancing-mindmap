---
artifact_type: plan
status: archived
created: 2026-07-06
updated: 2026-07-06
owner: agent
---

# 右下角导航视图与缩放条计划

## 目标

在脑图视图右下角增加一个轻量导航控件：包含脑图小视图、当前可视区域提示，以及缩放滑动条。用户可以通过滑动条、加减按钮和当前滚轮缩放能力调整脑图缩放比例，并让控件状态与现有 `mindScale` 保持一致。

## 范围

- 范围内：
  - 增加右下角固定导航容器。
  - 增加缩放滑动条、减号按钮、加号按钮和百分比显示。
  - 复用现有 `MindMap.mindScale`、`scale()`、`setScale()`，不新建第二套缩放状态。
  - 小视图显示当前脑图内容范围和当前视口范围。
  - 小视图支持点击定位视口；拖拽视口框可作为第一版可选增强，若实现成本过高则后置。
  - 滚轮缩放、按钮缩放、滑动条缩放后 UI 状态同步。
  - 更新样式、能力文档、设计规则和变更日志。
- 范围外：
  - 不做完整 Canvas 重绘引擎。
  - 不改变节点布局算法。
  - 不改变 Markdown 数据结构。
  - 不新增导出能力。
  - 不做移动端触摸专用交互。
  - 不做独立设置项；第一版默认在脑图视图显示，可在实现验证后再决定是否增加开关。

## 假设与决策

- 右下角小视图是脑图视图的一部分，不属于节点编辑工具栏。
- 缩放范围沿用现有 `scale()` 限制：20% 到 300%。
- 缩放步进沿用现有 `setScale()` 的 10%。
- 滑动条显示当前百分比，例如 `73%`；按钮显示 `-` 和 `+`。
- 控件固定在脑图视图右下角，不跟随画布缩放。
- 小视图第一版以 DOM/SVG 摘要方式呈现节点边界和视口框，优先保证定位、缩放同步和性能。
- ADR 门禁：暂不需要；这是局部 UI 控件和模块所有权调整，不改变核心数据模型。

## Dev Split 结果

- 分类：proposed split。
- 原因：`src/mindmap/mindmap.ts` 约 2294 行，是大型核心文件；本任务会增加独立 UI、事件、状态同步和视口换算，继续写入核心文件会扩大维护风险。
- 新 owner 模块：

| Module | Owner responsibility | May depend on | Must not own |
|---|---|---|---|
| `src/mindmap/navigation/MindMapNavigatorController.ts` | 右下角导航控件 DOM、缩放条事件、小视图渲染、视口点击定位 | `MindMap` 实例、Obsidian CSS 变量、浏览器 DOM API | 节点布局、Markdown 数据、命令历史、节点编辑 |
| `src/mindmap/mindmap.ts` | 画布状态、缩放状态、滚动容器、生命周期接线 | navigator controller 类型 | 导航控件内部 DOM、滑动条细节、小视图绘制细节 |
| `styles.css` | 导航控件视觉样式 | Obsidian CSS 变量 | 业务状态和视口换算逻辑 |

- 代码放置约束：
  - 不把导航控件主体逻辑加入 `src/mindmap/mindmap.ts`。
  - `mindmap.ts` 只负责创建、销毁 controller，并在 `scale()`、滚动、刷新后通知 controller。
  - 不创建 `utils`、`helpers`、`common` 这类泛化模块。
  - 视口换算如果只有导航控件使用，应留在 `MindMapNavigatorController` 内。

## 事实来源

- 视图生命周期：`src/MindMapView.ts`
- 画布与缩放状态：`src/mindmap/mindmap.ts`
- 节点尺寸与布局：`src/mindmap/INode.ts`、`src/mindmap/Layout.ts`
- UI 样式：`styles.css`
- 设计规则：`DESIGN.md`
- 能力文档：`docs/capabilities/mindmap-editing.md`
- 上下文路由：`CONTEXT.md`、`docs/ai/context-map.md`

## 步骤与验证

步骤状态只允许 `todo`、`done`、`blocked`。

| ID | Status | 步骤 | 验证 |
|---|---|---|---|
| PLAN-1 | done | 新增 `MindMapNavigatorController`，由 `MindMap` 生命周期创建和销毁右下角导航容器。 | 控件由 `MindMap` 创建和销毁；全局拖拽事件在 destroy 中清理。 |
| PLAN-2 | done | 接入缩放滑动条、加减按钮和百分比显示，复用 `mindScale`、`scale()`、`setScale()`。 | 控件直接调用 `scale()`，并在 `scale()` 后同步百分比。 |
| PLAN-3 | done | 绘制小视图：根据当前可见节点 bounding rect 与容器 viewport 计算缩略比例，显示内容范围和视口框。 | 小视图使用可见节点 box 几何摘要；视口框按滚动位置和缩放比例计算。 |
| PLAN-4 | done | 增加小视图点击定位；若复杂度可控，增加拖拽视口框定位。 | 点击小视图定位主画布；拖拽视口框按缩略比例换算滚动距离并阻止事件冒泡。 |
| PLAN-5 | done | 增加样式：右下角固定、紧凑、使用 Obsidian CSS 变量，深浅主题可读，避免遮挡节点编辑工具栏。 | 样式使用 Obsidian CSS 变量；控件绝对定位在脑图视图容器右下角。 |
| PLAN-6 | done | 更新文档和构建验证，同步到本地私人插件目录。 | `npm run build` 通过；本地插件目录同步完成；最终静态检查和 Dev Flow 校验在 review gate 执行。 |

## 验收标准

- 脑图视图右下角出现导航控件和缩放条。
- 当前缩放百分比与实际 `mindScale` 一致。
- 加减按钮、滑动条和滚轮缩放不会产生两个不同缩放状态。
- 小视图能显示当前脑图整体范围和当前视口范围。
- 点击小视图可移动主视图到对应区域。
- 控件不跟随画布缩放，不影响节点编辑、链接点击、图片缩放和节点拖拽。
- 控件销毁干净，切换文件和关闭视图后不残留事件监听。

## 风险

- 现有缩放通过 `transform: scale()` 实现，视口换算需要同时考虑滚动位置、缩放比例和 transform origin。
- 现有滚动容器与画布尺寸较大，小视图需要节流刷新，避免滚动时频繁重算造成卡顿。
- 小视图如果直接复制节点 DOM，性能和样式风险较高；第一版应使用简化几何摘要。
- 视口拖拽容易和主画布拖拽冲突，必须阻止事件冒泡。

## 产物路由

- 计划：`docs/plans/2026-07-06-mindmap-navigator.md`
- 新模块：`src/mindmap/navigation/MindMapNavigatorController.ts`
- 生命周期接线：`src/mindmap/mindmap.ts`
- 样式：`styles.css`
- 能力文档：更新 `docs/capabilities/mindmap-editing.md`
- 设计规则：更新 `DESIGN.md`
- 变更日志：更新 `CHANGELOG.md`
- 上下文地图：如新增 `navigation/` owner 目录，实施后更新 `docs/ai/context-map.md`
- 测试：仓库暂无自动化测试；使用构建、静态检查和 Obsidian 本地交互矩阵。

## 后续

实施建议使用 `/dev-branch`。若实现中发现视口换算需要改变核心缩放模型，应停止实施并重新评估是否需要 ADR。
