---
artifact_type: capability
status: current
updated: 2026-07-03
source_of_truth: code
adr_reviewed: not_required
---

# 脑图节点编辑

## 职责

描述脑图节点如何编辑、保存和渲染 Markdown，以及视图如何处理节点内链接和附件。

## 当前行为

- `INode.data.text` 保存节点 Markdown 源文本。
- `INode.edit()` 将节点内容切换为 `contentEditable` 纯文本编辑状态。
- `INode.cancelEdit()` 从 `innerText` 生成 Markdown，通过现有命令历史记录变更；节点文本更新只走 `setText()` 的单一阅读态渲染链路。
- 节点编辑时显示一个由 `NodeInsertController` 管理的上下文工具栏；编辑结束或视图销毁时移除。
- 外部链接弹窗仅接受 `http` 和 `https`，并在浏览器新标签页打开。
- Vault 文件选择器插入 Markdown、视频、PDF、音频等非图片文件，并在 Obsidian 新标签页打开。
- 节点将外部链接和 Vault 链接显示为绝对定位的链接图标；编辑态隐藏原始 Markdown 链接地址，保存时保留链接 Markdown。
- 链接图标不显示链接标题；节点通过 `.mm-node-has-link` 为图标预留宽度，布局刷新必须保留该状态类，避免分支和子节点使用旧宽度。
- `ChangeNodeText` 等待 `setText()` 的 Markdown 渲染完成后再刷新节点尺寸与布局，避免保存链接时出现图标闪烁或空节点宽度。
- 图片入口可选择现有 Vault 图片，或导入 AVIF、BMP、GIF、JPEG、PNG、WebP 本地图片。
- 本地图片通过 `getAvailablePathForAttachment()` 和 Vault API 写入，遵循 Obsidian 附件目录及重名规则。
- Vault 链接统一通过 `generateMarkdownLink()` 生成，遵循用户的链接格式设置。
- 工具栏打开弹窗前保存 DOM Range，确认或取消后恢复节点选区与焦点。
- `.xmind` 文件拖入画布时走独立导入流程，与节点附件插入无关。

## 事实来源

- 代码：`src/mindmap/INode.ts`、`src/mindmap/mindmap.ts`
- 插入工作流：`src/mindmap/insert/*.ts`
- 视图生命周期：`src/MindMapView.ts`
- 命令：`src/main.ts`
- 样式：`styles.css`
- 构建：`package.json`、`rollup.config.js`

## 操作说明

- 使用 `npm run build` 验证 TypeScript 与 Rollup 打包。
- 最低支持 Obsidian 1.5.7；不保留旧版附件路径兼容分支。
- 交互变更需在测试 Vault 中验证 Markdown/脑图往返、撤销/重做和链接打开行为。
- 新插入功能不得把渲染 HTML 保存为节点数据。

## 验证基线

- 已在 Obsidian 1.8.4 的隔离测试 Vault 中验证三类插入、取消、保存、新标签打开、链接图标布局和深浅主题。
- 仓库当前没有自动化测试框架；生产构建与测试 Vault 交互矩阵是本能力的主要回归门禁。
