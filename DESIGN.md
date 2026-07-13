---
artifact_type: design_system
status: current
updated: 2026-07-13
token_source: design-tokens.json
---

# obsidian-enhancing-mindmap 设计系统

<!--
## Authority And Scope
-->
## 权威性与范围

- 本文件是 Agent 与贡献者当前遵循的 UI 设计和实现合同。
- 只记录已确认的可复用规则；未确认场景写入“已知缺口”。
- 精确基础值存放在 `design-tokens.json`。
- 组件行为以组件代码和视觉示例为准。

<!--
## Sources
-->
## 来源

- 令牌：`design-tokens.json`
- 节点插入 UI：`src/mindmap/insert/NodeInsertController.ts`、`src/mindmap/INode.ts`、`styles.css`
- 节点键盘交互：`src/mindmap/interaction/NodeKeyboardController.ts`
- 链接操作 UI：`src/mindmap/link/NodeLinkController.ts`、`src/mindmap/link/EditNodeLinkModal.ts`
- 图片附件编辑：`src/mindmap/image/NodeImageMarkdown.ts`、`src/mindmap/INode.ts`
- 画布导航控件：`src/mindmap/navigation/MindMapNavigatorController.ts`
- 画布节点多选：`src/mindmap/interaction/NodeSelectionController.ts`、`styles.css`
- 已确认视觉示例：`docs/assets/node-insert-toolbar-concept.png`

## 设计原则

- 遵循 Obsidian 宿主 UI 语义，不引入独立视觉语言。
- 节点编辑控件保持紧凑且与上下文关联，不永久占用画布空间。

<!--
## Foundations
-->
## 基础规范

- 颜色、边框、阴影和交互状态优先使用 Obsidian CSS 变量。
- 尚未确认项目专用基础令牌，因此 `design-tokens.json` 暂时留空。

## 布局模式

- 插入工具栏位于当前编辑节点正上方。
- 工具栏作为节点子元素，随节点移动、画布滚动和缩放。

<!--
## Component Rules
-->
## 组件规则

- 第一版节点插入工具栏仅提供三个入口：外部链接、Vault 文件和图片。
- Vault 文件选择器支持 Markdown、视频、PDF、音频等非图片文件。
- 图片入口提供“选择 Vault 图片”和“导入本地图片”两个选项。
- 图片插入必须写入默认节点图片宽度，避免原图尺寸直接撑开脑图。
- 链接图标右键菜单复用 Obsidian `Menu`，链接编辑复用 Obsidian 弹窗和 Vault 文件选择模式。
- 右下角导航控件提供小视图、视口框、缩放滑动条、加减按钮、百分比显示、可见/总节点数、隐藏/恢复按钮和 hover 四角拖拽缩放点；控件属于画布级 UI，不属于节点编辑工具栏。
- 优先使用 Obsidian 提供的图标、弹窗和搜索选择器。

## 交互模式

- 仅在一个节点处于编辑状态时显示工具栏；编辑结束后隐藏。
- 打开弹窗前保存节点文本选区，插入前恢复。
- Vault 文件在 Obsidian 新标签页打开，外部链接在浏览器新标签页打开，不替换当前脑图。
- 节点中的链接仅显示链接图标；编辑态不直接暴露原始 Markdown 链接地址。
- 链接标题与节点正文分离；默认悬停链接图标显示标题，标题为空时回退显示目标。
- 用户开启链接标题显示后，链接图标右侧显示轻量 muted 标题文本；标题文本仍属于链接附件视图，不进入节点正文。
- 单击链接图标执行跳转；右键菜单提供编辑和删除，悬停与右键不得改变当前节点选择。
- 编辑或删除链接只影响目标链接，并通过节点文本命令历史支持撤销和重做。
- 链接图标不参与节点正文宽度计算，避免改变分支线位置。
- 节点新增和删除只使用画布键盘状态机：选中态 `Space` 进入编辑，`Backspace` 删除当前非根节点及子节点，`Enter` 结束编辑或新增同级，根节点使用 `Enter` 新增一级子节点，`Shift+Enter` 插入 Markdown `<br>` 节点内换行，`Tab` 新增子节点。
- 编辑态图片显示为可选中的图片控件，不显示原始图片 Markdown；点击图片选中，拖拽手柄调整宽度，`Backspace` 或 `Delete` 删除选中图片。
- 节点只保存 Markdown 源文本，渲染后的 HTML 不得成为第二数据源。
- 右下角导航控件固定在脑图视图容器内，不随画布缩放；滑动条、加减按钮和 Ctrl/Meta 滚轮缩放共享同一个 `mindScale` 状态。
- 小视图点击定位主画布视口；拖拽视口框不得触发节点拖拽、文本编辑或画布平移。
- 导航控件节点数统计显示当前可见节点数与脑图总节点数，根节点计入两者，折叠节点只影响可见数。
- 导航控件默认隐藏操作点；鼠标移入或拖拽中显示四个顶点缩放点和隐藏按钮。收起后仅保留恢复按钮。
- 桌面端按住 `Ctrl`/`Meta` 从空白画布拖动时显示临时虚线选择框；与选择框相交的当前可见非根节点实时进入多选态，松开鼠标后选择框消失而节点选择保留。
- 框选手势激活后，滚轮临时只负责上下滚动画布，不改变缩放；选择框锚点固定在原始画布位置并随滚动扩展跨屏选区，手势结束后恢复 `Ctrl`/`Meta` + 滚轮缩放。
- `Ctrl`/`Meta` 单击节点用于追加或取消单个节点；静止空白单击或 `Escape` 清空多选。普通空白拖动超过点击容错阈值后只负责画布平移并保留多选，不与框选共用无修饰键手势。
- 多选节点使用 `--interactive-accent` 描边；唯一活动节点保持更强的焦点层级，其他已选节点使用较轻描边。选择框和节点描边不得改变脑图布局尺寸。
- 拖动任一已选节点时按现有落点指示迁移整个选择组；第一版不提供多选组复制、剪切、删除或编辑语义。

## UI 实现规则

- 新插入行为放入 `src/mindmap/insert/` 下按职责命名的模块。
- 节点键盘状态机放入 `src/mindmap/interaction/`，链接解析、菜单和编辑弹窗放入 `src/mindmap/link/`，图片 Markdown 解析放入 `src/mindmap/image/`。
- 画布导航和缩放控件放入 `src/mindmap/navigation/`，`src/mindmap/mindmap.ts` 只保留生命周期、缩放状态和刷新通知接线。
- 节点多选集合、框选几何、选择视觉和多选手势放入 `src/mindmap/interaction/NodeSelectionController.ts`；`src/mindmap/mindmap.ts` 只保留事件委托和生命周期接线。
- `src/mindmap/mindmap.ts` 和 `src/mindmap/INode.ts` 仅保留生命周期与编辑接线。
- 验证 Obsidian 深色、浅色主题以及活动节点的焦点和选区行为。

## 可访问性

- 每个工具栏操作必须提供可访问名称和可见提示。
- 链接图标必须可聚焦并提供链接标题作为可访问名称；上下文菜单使用宿主键盘导航。
- 导航控件的缩放按钮和滑动条必须提供可访问名称，百分比文本必须反映当前缩放状态，节点数统计必须反映当前可见节点数与总节点数。
- 取消弹窗后焦点返回编辑节点，且不得改变节点文本。
- 工具栏控件必须可通过键盘聚焦和操作。
- 多选节点必须同步 `aria-selected`；多选状态下应阻止单节点键盘编辑、增删和导航，`Escape` 必须可以清空选择。

## 暂定规则

- 精确间距、圆角、阴影及工具栏避让行为在运行时评审前仅作为实现细节。

<!--
## Known Gaps
-->
## 已知缺口

- 尚未设计移动端和触摸设备专用的工具栏定位。
- 画布边缘的工具栏避让尚未实现。
- 行内代码与 KaTeX 插入控件不属于第一版范围。
- 不支持内嵌视频播放；视频仅显示为可点击链接。
