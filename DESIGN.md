---
artifact_type: design_system
status: current
updated: 2026-07-03
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
- 优先使用 Obsidian 提供的图标、弹窗和搜索选择器。

## 交互模式

- 仅在一个节点处于编辑状态时显示工具栏；编辑结束后隐藏。
- 打开弹窗前保存节点文本选区，插入前恢复。
- Vault 文件在 Obsidian 新标签页打开，外部链接在浏览器新标签页打开，不替换当前脑图。
- 节点中的链接仅显示链接图标；编辑态不直接暴露原始 Markdown 链接地址。
- 链接图标不参与节点正文宽度计算，避免改变分支线位置。
- 节点只保存 Markdown 源文本，渲染后的 HTML 不得成为第二数据源。

## UI 实现规则

- 新插入行为放入 `src/mindmap/insert/` 下按职责命名的模块。
- `src/mindmap/mindmap.ts` 和 `src/mindmap/INode.ts` 仅保留生命周期与编辑接线。
- 验证 Obsidian 深色、浅色主题以及活动节点的焦点和选区行为。

## 可访问性

- 每个工具栏操作必须提供可访问名称和可见提示。
- 取消弹窗后焦点返回编辑节点，且不得改变节点文本。
- 工具栏控件必须可通过键盘聚焦和操作。

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
