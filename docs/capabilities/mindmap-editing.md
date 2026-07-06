---
artifact_type: capability
status: current
updated: 2026-07-06
source_of_truth: code
adr_reviewed: not_required
---

# 脑图节点编辑

## 职责

描述脑图节点如何编辑、保存和渲染 Markdown，以及视图如何处理节点内链接和附件。

## 当前行为

- `INode.data.text` 保存节点 Markdown 源文本。
- `INode.edit()` 将节点内容切换为 `contentEditable` 编辑状态；节点正文以文本编辑，图片附件以可选中的图片控件编辑。
- `INode.cancelEdit()` 从 `innerText` 生成 Markdown，通过现有命令历史记录变更；节点文本更新只走 `setText()` 的单一阅读态渲染链路。
- `NodeKeyboardController` 是节点键盘新增和删除的唯一入口：选中态 `Space` 进入编辑，`Backspace` 删除当前非根节点及子节点；编辑态 `Enter` 保存并回到选中态，`Shift+Enter` 插入 Markdown `<br>` 节点内换行，`Tab` 保存并新增子节点；选中态 `Enter` 新增同级节点，根节点例外为新增一级子节点，选中态 `Tab` 新增子节点。
- 旧节点右侧新增按钮及 `Alt+Shift+Enter`、`Shift+Insert` 新增命令已移除。
- 删除节点后优先选中同级节点：先选下一个同级节点，没有下一个时选上一个同级节点；没有同级节点时才回退到父节点。
- 节点编辑时显示一个由 `NodeInsertController` 管理的上下文工具栏；编辑结束或视图销毁时移除。
- 外部链接弹窗仅接受 `http` 和 `https`，并在浏览器新标签页打开。
- Vault 文件选择器插入 Markdown、视频、PDF、音频等非图片文件，并在 Obsidian 新标签页打开。
- 外部链接和 Vault 文件链接作为节点附件追加，不替换当前选区或节点正文；链接标题只用于悬停提示和编辑界面。
- 节点将外部链接和 Vault 链接显示为绝对定位的链接图标；编辑态隐藏原始 Markdown 链接地址，保存时保留链接 Markdown。
- 链接标题显示由全局设置 `showLinkTitle` 控制，默认关闭；开启后在链接图标右侧显示轻量标题文本，标题为空时回退显示目标。
- 链接图标单击后按链接类型跳转；右键使用 Obsidian 原生菜单编辑标题/目标或删除链接。删除无需确认，只影响目标链接，并进入节点文本撤销历史。
- Vault 链接编辑时通过 Vault 文件选择器更换目标；外部链接目标仍限制为 `http` 或 `https`。
- 节点通过 `.mm-node-has-link` 为链接图标或链接标题预留宽度，布局刷新必须保留该状态类，避免分支和子节点使用旧宽度。
- `ChangeNodeText` 等待 `setText()` 的 Markdown 渲染完成后再刷新节点尺寸与布局，避免保存链接时出现图标闪烁或空节点宽度。
- 图片入口可选择现有 Vault 图片，或导入 AVIF、BMP、GIF、JPEG、PNG、WebP 本地图片；新插入图片使用节点图片默认宽度，避免原图尺寸撑开脑图布局。
- 图片附件保存为 Markdown 源文本，编辑态显示图片本体而不是原始 `![[...]]` 文本。
- 编辑态点击图片会选中图片并显示缩放手柄；拖拽手柄调整图片宽度，保存节点时写回图片 Markdown。
- 图片选中后按 `Backspace` 或 `Delete` 删除该图片，删除行为通过节点文本保存链路进入撤销历史。
- 本地图片通过 `getAvailablePathForAttachment()` 和 Vault API 写入，遵循 Obsidian 附件目录及重名规则。
- Vault 链接统一通过 `generateMarkdownLink()` 生成，遵循用户的链接格式设置。
- 工具栏打开弹窗前保存 DOM Range，确认或取消后恢复节点选区与焦点。
- 脑图视图右下角由 `MindMapNavigatorController` 显示画布导航控件；控件包含小视图、视口框、缩放滑动条、加减按钮、百分比显示、隐藏/恢复按钮和 hover 四角拖拽缩放点。
- 导航控件复用 `MindMap.mindScale`、`scale()` 和滚动容器状态；滑动条、按钮和 Ctrl/Meta 滚轮缩放必须保持同一个缩放来源。
- 小视图使用可见节点 box 的几何摘要渲染，不复制节点 DOM；点击小视图定位主画布，拖拽视口框按缩略比例移动滚动位置。
- 导航控件尺寸调整只影响当前视图生命周期内的面板宽度和小视图高度，不写入节点 Markdown 或插件设置。
- `.xmind` 文件拖入画布时走独立导入流程，与节点附件插入无关。

## 事实来源

- 代码：`src/mindmap/INode.ts`、`src/mindmap/mindmap.ts`
- 节点键盘状态机：`src/mindmap/interaction/NodeKeyboardController.ts`
- 链接解析与交互：`src/mindmap/link/*.ts`
- 图片解析与编辑：`src/mindmap/image/NodeImageMarkdown.ts`、`src/mindmap/INode.ts`
- 插入工作流：`src/mindmap/insert/*.ts`
- 画布导航控件：`src/mindmap/navigation/MindMapNavigatorController.ts`
- 视图生命周期：`src/MindMapView.ts`
- 命令：`src/main.ts`
- 样式：`styles.css`
- 构建：`package.json`、`rollup.config.js`

## 操作说明

- 使用 `npm run build` 验证 TypeScript 与 Rollup 打包。
- 最低支持 Obsidian 1.5.7；不保留旧版附件路径兼容分支。
- 交互变更需在测试 Vault 中验证 Markdown/脑图往返、撤销/重做和链接打开行为。
- 新插入功能不得把渲染 HTML 保存为节点数据。
- IME 组合输入、弹窗输入和脑图失焦状态不得触发节点新增。

## 验证基线

- 已在 Obsidian 1.8.4 的隔离测试 Vault 中验证三类插入、取消、保存、新标签打开、链接图标布局和深浅主题。
- 节点键盘状态机、链接编辑/删除和图片缩放/删除需验证根节点、普通节点、编辑态、多链接、多图片、撤销/重做和 Markdown 往返。
- 仓库当前没有自动化测试框架；生产构建与测试 Vault 交互矩阵是本能力的主要回归门禁。
