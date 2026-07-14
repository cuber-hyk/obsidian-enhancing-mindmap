---
artifact_type: capability
status: current
updated: 2026-07-14
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
- `NodeKeyboardController` 是单节点键盘新增和删除的入口：选中态 `Space` 进入编辑，`Backspace` 删除当前非根节点及子节点；编辑态 `Enter` 保存并回到选中态，`Shift+Enter` 插入 Markdown `<br>` 节点内换行，`Tab` 保存并新增子节点；选中态 `Enter` 新增同级节点，根节点例外为新增一级子节点，选中态 `Tab` 新增子节点。脑图获得焦点且节点非编辑时，`Ctrl`/`Cmd+Z` 通过同一控制器撤销上一条脑图 History 命令；编辑态与其他视图保留原生文字撤销。
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
- 编辑态粘贴剪贴板图片时，`NodeInsertController` 只接管第一张具有实际 `image/*` 文件数据的图片，将其导入 Vault 并在粘贴位置写入图片 Markdown；没有图片文件数据时保留浏览器原有粘贴行为，不隐式下载 HTML 或 URL 中的远程图片。
- 剪贴板图片导入完成后必须仍属于发起粘贴的编辑会话才可插入；会话失效时不跨节点插入，已落盘附件保留并通过 Notice 提示路径。
- Vault 链接统一通过 `generateMarkdownLink()` 生成，遵循用户的链接格式设置。
- 工具栏打开弹窗前保存 DOM Range，确认或取消后恢复节点选区与焦点。
- 脑图视图右下角由 `MindMapNavigatorController` 显示画布导航控件；控件包含小视图、视口框、缩放滑动条、加减按钮、百分比显示、可见/总节点数、隐藏/恢复按钮和 hover 四角拖拽缩放点。
- 导航控件复用 `MindMap.mindScale`、`scale()` 和滚动容器状态；滑动条、按钮和 Ctrl/Meta 滚轮缩放必须保持同一个缩放来源。
- 小视图使用可见节点 box 的几何摘要渲染，不复制节点 DOM；点击小视图定位主画布，拖拽视口框按缩略比例移动滚动位置。
- 小视图视口框使用滚动容器与缩放画布的实际 DOM 几何关系反算，不假设 CSS `transform-origin` 固定为左上角。
- 导航控件节点数统计显示 `可见 / 总数 节点`，可见数来自 `root.getShowNodeList()`，总数从运行时节点树递归 `children` 计算，根节点计入两者。
- 导航控件尺寸调整只影响当前视图生命周期内的面板宽度和小视图高度，不写入节点 Markdown 或插件设置。
- `.xmind` 文件拖入画布时走独立导入流程，与节点附件插入无关。
- 桌面端按住 `Ctrl`/`Meta` 从空白画布拖动时，由 `NodeSelectionController` 显示临时选择框，并以屏幕坐标相交规则选择当前可见的非根节点；松开鼠标后选择框消失，多选节点描边保留。
- 框选激活期间，`NodeSelectionController` 接管滚轮并按容器实际滚动量上下移动画布，同时反向偏移原始选择锚点，以最后指针位置实时累计跨屏选区；该手势不改变 `mindScale`，松开鼠标后恢复原有 `Ctrl`/`Meta` 滚轮缩放。
- `Ctrl`/`Meta` 单击非根节点用于追加或取消选择，`Escape` 清空多选；普通空白左键位移不超过 4px 时按静止单击清空选择，超过阈值时只平动画布并抑制拖动结束产生的单次 `click`，保留多选状态。
- `MindMap.selectNode` 继续保存唯一活动节点，多选集合由 `NodeSelectionController` 独立维护，避免破坏现有编辑、命令和键盘入口。
- 多选数大于一时阻止单节点新增、编辑和方向导航键；按 `Backspace` 或 `Delete` 会删除所有没有已选祖先的选择根及其完整子树，父节点与后代同时选中时不重复删除后代。
- 批量删除由一条 `RemoveNodes` History 命令记录各选择根的原父节点、索引和顺序；一次撤销完整恢复全部节点，一次重做再次整体删除。删除后优先选择原主选节点之后仍存在的兄弟节点，其次选择之前的兄弟节点，最后回退到父节点。
- `NodeClipboardController` 是单节点剪贴板操作的唯一入口；脑图获得焦点、存在唯一活动节点且节点非编辑时，`Ctrl`/`Cmd+C/X/V` 分别复制、剪切或粘贴当前节点及完整子树。多选状态不退化为只操作主选节点，节点编辑态与其他输入控件保留原生文字剪贴板。
- 节点剪贴板继续使用现有 `copyNode` JSON 格式，粘贴目标仍为当前活动节点；复制内容可连续粘贴，剪切只有在系统剪贴板写入成功后才删除源节点。异步剪贴板完成后还必须保持同一活动 leaf 和同一活动节点，否则不在后台删除或粘贴。
- `Copy Node`、`Cut Node`、`Paste Node` 和 `Undo` 命令继续保留并支持用户自定义热键；不再提供 `Alt+Shift+C/X/V/Z` 默认绑定。
- 拖动任一已选节点会迁移整个选择组；父节点与后代同时被选中时，只迁移没有已选祖先的顶层选择根，后代随父节点移动。
- 整组迁移拒绝根节点和选择子树内的目标，按现有兄弟/子节点落点语义保持稳定顺序，并通过一条 `MoveNodes` 历史命令完成撤销和重做。

## 事实来源

- 代码：`src/mindmap/INode.ts`、`src/mindmap/mindmap.ts`
- 节点键盘状态机：`src/mindmap/interaction/NodeKeyboardController.ts`
- 节点多选状态与手势：`src/mindmap/interaction/NodeSelectionController.ts`
- 节点剪贴板状态与快捷键：`src/mindmap/interaction/NodeClipboardController.ts`
- 节点结构 History 命令：`src/mindmap/Cmds.ts`、`src/mindmap/Execute.ts`
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
- 剪贴板图片粘贴需验证系统截图、文件图片、纯文本、混合剪贴板、文本中间插入、连续粘贴、立即退出或切换节点、Markdown/脑图往返及重新加载；仅有远程 HTML/URL 而没有图片文件数据的来源不在支持范围内。
- 节点多选需在测试 Vault 中验证四向框选、框选期间滚轮跨屏累计选择且不缩放、松开后恢复缩放、空白静止单击清空、轻微抖动容错、普通空白拖动画布保留选择、同父/跨父/父子选择的整组迁移、非法后代目标、顺序保持、撤销/重做、深浅主题，以及与单选、编辑和单节点拖放的回归兼容性。
- 多选批量删除与节点快捷键已于 2026-07-14 在授权测试 Vault 中验证；回归需覆盖同父、跨父和父子同时选择的删除与一次撤销/重做、连续粘贴、剪切写入后删除、多选不执行单节点剪贴板，以及节点编辑态和 Markdown 视图的原生剪贴板与撤销。
- 仓库当前没有自动化测试框架；生产构建与测试 Vault 交互矩阵是本能力的主要回归门禁。
