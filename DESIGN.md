---
artifact_type: design_system
status: current
updated: 2026-08-10
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
- 产品体验优化以桌面端为目标，不规划移动端专用 UI 或触摸手势适配；保持现有移动端可安装性，但不承诺与桌面端一致的交互体验。

<!--
## Sources
-->
## 来源

- 令牌：`design-tokens.json`
- 节点插入 UI：`src/mindmap/insert/NodeInsertController.ts`、`src/mindmap/INode.ts`、`styles.css`
- 节点键盘交互：`src/mindmap/interaction/NodeKeyboardController.ts`、`src/mindmap/interaction/OrderedSiblingNumbering.ts`
- 链接操作 UI：`src/mindmap/link/NodeLinkController.ts`、`src/mindmap/link/EditNodeLinkModal.ts`
- 图片附件编辑：`src/mindmap/image/NodeImageMarkdown.ts`、`src/mindmap/image/NodeImagePreviewModal.ts`、`src/mindmap/image/NodeImageReorderController.ts`、`src/mindmap/INode.ts`
- 节点表格：`src/mindmap/table/NodeTableMarkdown.ts`、`src/mindmap/table/NodeTablePreviewController.ts`、`src/mindmap/table/NodeTableEditorModal.ts`、`src/mindmap/INode.ts`、`styles.css`
- 节点代码块：`src/mindmap/code/NodeCodeMarkdown.ts`、`src/mindmap/code/NodeCodeController.ts`、`src/mindmap/code/NodeCodeEditorModal.ts`、`src/mindmap/code/NodeCodeRenderer.ts`、`src/mindmap/code/NodeCodeSettings.ts`、`styles.css`
- 画布边界与导航：`src/mindmap/CanvasBoundsController.ts`、`src/mindmap/navigation/MindMapNavigatorController.ts`
- 画布节点多选：`src/mindmap/interaction/NodeSelectionController.ts`、`styles.css`
- 脑图样式与快捷键：`src/mindmap/style/`、`src/mindmap/interaction/MindMapShortcutCatalog.ts`、`src/mindmap/interaction/MindMapShortcutRouter.ts`、`src/mindmap/interaction/MindMapShortcutInspector.ts`、`src/mindmap/interaction/MindMapShortcutManagerModal.ts`、`src/MindMapView.ts`、`src/settingTab.ts`、`styles.css`
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
- 画布尺寸设置表示当前视图的最小宽高；可见节点接近或超出边界时，运行时画布和 SVG 连线层使用 60px 安全边距自动向外扩展。当前视图只扩展不自动收缩，避免折叠、删除或异步渲染导致视口跳动。

<!--
## Component Rules
-->
## 组件规则

- 节点插入工具栏提供外部链接、Vault 文件、图片和代码块入口；代码通过独立 Modal 输入，不在节点编辑面直接暴露围栏 Markdown。
- Vault 文件选择器支持 Markdown、视频、PDF、音频等非图片文件。
- 图片入口提供“选择 Vault 图片”和“导入本地图片”两个选项。
- 图片插入必须写入默认节点图片宽度，避免原图尺寸直接撑开脑图。
- 编辑态图片预览复用 Obsidian `Modal`，按当前窗口等比例适配原图片资源，不在节点内放大或改变脑图布局。
- 链接图标右键菜单复用 Obsidian `Menu`，链接编辑复用 Obsidian 弹窗和 Vault 文件选择模式。
- 右下角导航控件提供小视图、视口框、缩放滑动条、加减按钮、百分比显示、可见/总节点数、隐藏/恢复按钮和 hover 四角拖拽缩放点；控件属于画布级 UI，不属于节点编辑工具栏。
- 脑图视图的样式模板入口使用标题栏调色板操作；该操作切换当前脑图视图内的右侧样式检查器，不创建 Obsidian 全局侧栏。
- 样式检查器使用单列模板卡片，卡片以自然内容高度完整展示可换行的模板名称、根节点、分支线和调色板缩略效果；模板的具体色值由集中模板目录维护，不散落在 CSS 规则中。
- 脑图标题栏的键盘操作打开当前视图内的右侧快捷键检查器；快捷键与样式检查器共用同一右侧空间，显式切换入口时只保留目标检查器。常规桌面宽度下快捷键检查器为约 280px 的稳定侧栏，避免动作名称和键帽在画布可用时被压缩截断；面板仅作为高频速查入口，分组展示约 10–15 项常用局部快捷键，并提供“管理全部快捷键”入口。全集使用独立 Obsidian `Modal`，支持搜索、分类、录制、清除、恢复默认和仅看已修改；插件设置页只提供全集入口、恢复默认和局部生效说明，不展开长列表。
- 带有 `mindmap-plugin: basic` frontmatter 的脑图文档在文件资源管理器、脑图标签页和脑图相关菜单中复用同一个专属图标；图标使用文档轮廓与导图分支组合、`currentColor` 单色描边和 Obsidian/Lucide 的圆角语义，不以固定颜色表达文件身份。
- 优先使用 Obsidian 提供的图标、弹窗和搜索选择器。

## 交互模式

- 仅在一个节点处于编辑状态时显示工具栏；编辑结束后隐藏。
- 打开弹窗前保存节点文本选区，插入前恢复。
- Vault 文件在 Obsidian 新标签页打开，外部链接在浏览器新标签页打开，不替换当前脑图。
- 节点中的链接仅显示链接图标；编辑态不直接暴露原始 Markdown 链接地址。
- 链接标题与节点正文分离；默认悬停链接图标显示标题，标题为空时回退显示目标。
- 用户开启链接标题显示后，链接图标右侧显示轻量 muted 标题文本；标题文本仍属于链接附件视图，不进入节点正文。
- 单击链接图标执行跳转；右键菜单提供复制链接、编辑和删除，复制内容保留完整 Markdown 链接以支持粘贴还原，悬停与右键不得改变当前节点选择。
- 编辑或删除链接只影响目标链接，并通过节点文本命令历史支持撤销和重做。
- 链接图标不参与节点正文宽度计算，避免改变分支线位置。
- 节点新增和删除只使用画布键盘状态机：选中态 `Space` 进入编辑，`Backspace` 删除当前非根节点及子节点，`Enter` 默认在下方新增同级，`Shift+Enter` 默认在上方新增同级；根节点的下方新增快捷键仍新增一级子节点，上方新增不执行操作。新节点创建后立即进入编辑态；普通新节点全选默认文案，从 `数字.` 或 `数字)` 节点新增同级节点时保留自动生成的编号前缀并只选中默认正文。编辑态 `Enter` 结束编辑，`Shift+Enter` 插入 Markdown `<br>` 节点内换行，`Tab` 新增子节点；`Ctrl`/`Cmd+B`、`Ctrl`/`Cmd+I` 与 `Ctrl`/`Cmd+Shift+S` 分别切换选区的加粗、斜体与删除线 Markdown 标记，空选区插入标记对并将光标置中。
- 右侧常用面板和全集管理器读写同一份插件级局部快捷键配置；录制须拒绝适用上下文存在交集的重复绑定，互斥上下文允许复用同一按键。保存、清除和恢复默认后立即同步所有已打开脑图。插件命令仍保留在 Obsidian 命令面板，但插件不声明全局默认热键，也不改写用户主动设置的 Obsidian 全局绑定。
- 脑图键盘操作只在当前活动脑图画布内且操作上下文匹配时生效；输入框、按钮、链接、弹窗、非节点可编辑元素及其他交互控件保留宿主行为。静止空白画布单击在清空选择后将焦点留在画布，使无节点选中时仍可执行脑图撤销或重做。方向导航只为真实展开状态变化写入 History，叶节点或已展开节点不得产生无效历史项。
- 编辑态图片显示为可选中的图片控件，不显示原始图片 Markdown；点击图片选中，拖拽手柄调整宽度，`Backspace` 或 `Delete` 删除选中图片。选中描边和缩放手柄必须完整可见，不得触发节点正文滚动条或改变节点布局尺寸。
- 编辑态已选中的图片可拖到节点正文上方或下方，拖动时使用强调色横线提示唯一落点；图片手势不得触发节点整体拖动。聚焦图片后可使用 `Alt+↑/↓/←/→` 将图片放到文字对应方向，四项均注册为可重新绑定的 Obsidian 命令。多图节点只移动当前图片，其余内容保持相对顺序。
- 编辑态双击图片打开只读大图预览；双击不得冒泡为节点编辑手势，关闭预览后仅在原编辑会话仍有效时恢复图片焦点。预览不修改节点 Markdown、图片宽度或撤销历史。
- 节点只保存 Markdown 源文本，渲染后的 HTML 不得成为第二数据源。
- 节点内表格以内容优先：标题仅作为 Markdown 结构锚点保留，不在脑图表格节点或网格编辑器中显示；阅读态默认自动适应最大约 760px 的受限预览框，静止时不显示操作控件；悬停、选中或工具条获得焦点时，右上角浮现带提示的图标工具条，提供缩放、适应、重置、展开和编辑。展开预览使用最大约 90vw × 85vh 的 Modal，表格自动撑满可用宽度。表格节点默认进入 Modal 网格编辑，源码编辑仅作为兜底入口。
- 节点代码块使用紧凑卡片纵向嵌入普通正文，保留围栏语言、缩进、空行和多个代码块顺序；长行不折行，长内容在卡片内双向滚动。阅读态仅在卡片悬停或聚焦时浮现复制和按需展开操作；编辑态额外提供独立编辑操作，不因节点被选中而常驻显示工具栏。
- 代码编辑 Modal 使用单一编辑面，不并排重复的源码与预览面板。原生 `textarea` 负责输入、光标、选区、撤销和 Tab 缩进，同位的 Obsidian Markdown 高亮层负责实时显示；两层必须共用字体、字号、行高、内边距和滚动位置。IME 组合输入期间显示原生文字并暂停高亮刷新，组合结束后立即恢复高亮。
- 代码字号是插件级显示设置，统一作用于卡片、代码编辑 Modal 和展开预览，不写入节点 Markdown。每个代码卡片的自定义可视宽高通过编辑态选中后出现的右下角手柄调整；拖拽不得触发节点移动，选中描边与手柄不得被正文滚动区域裁剪，重置恢复默认紧凑视口。
- 右下角导航控件固定在脑图视图容器内，不随画布缩放；滑动条、加减按钮和 Ctrl/Meta 滚轮缩放共享同一个 `mindScale` 状态。
- 小视图点击定位主画布视口；拖拽视口框不得触发节点拖拽、文本编辑或画布平移。
- 点击标题栏调色板操作后打开或关闭当前导图的右侧样式检查器；除用户显式切换入口或点击关闭按钮外，检查器在模板应用与视图同步后保持打开，画布始终可见。
- 鼠标移入或键盘聚焦检查器中的模板卡片时，仅临时预览模板；移出模板列表或失焦后恢复最后一次已保存模板，预览不得写入 frontmatter。
- 点击模板卡片或按 `Enter` / `Space` 时立即将模板标识持久化到该脑图 Markdown 的 frontmatter，并保持检查器打开。
- 新建脑图使用插件设置中的默认模板；切换已有脑图模板不得改写其他脑图或插件全局默认值。
- 导航控件节点数统计显示当前可见节点数与脑图总节点数，根节点计入两者，折叠节点只影响可见数。
- 导航控件默认隐藏操作点；鼠标移入或拖拽中显示四个顶点缩放点和隐藏按钮。收起后仅保留恢复按钮。
- 桌面端按住 `Ctrl`/`Meta` 从空白画布拖动时显示临时虚线选择框；与选择框相交的当前可见非根节点实时进入多选态，松开鼠标后选择框消失而节点选择保留。
- 框选手势激活后，滚轮临时只负责上下滚动画布，不改变缩放；选择框锚点固定在原始画布位置并随滚动扩展跨屏选区，手势结束后恢复 `Ctrl`/`Meta` + 滚轮缩放。
- `Ctrl`/`Meta` 单击节点用于追加或取消单个节点；静止空白单击清空多选。普通空白拖动超过点击容错阈值后只负责画布平移并保留多选，不与框选共用无修饰键手势。
- 多选节点使用 `--interactive-accent` 描边；唯一活动节点保持更强的焦点层级，其他已选节点使用较轻描边。选择框和节点描边不得改变脑图布局尺寸。
- 拖动任一已选节点时按现有落点指示迁移整个选择组；第一版不提供多选组复制、剪切、删除或编辑语义。

## UI 实现规则

- 新插入行为放入 `src/mindmap/insert/` 下按职责命名的模块。
- 节点键盘状态机放入 `src/mindmap/interaction/`，链接解析、菜单和编辑弹窗放入 `src/mindmap/link/`，图片 Markdown 解析放入 `src/mindmap/image/`。
- 画布边界由 `src/mindmap/CanvasBoundsController.ts` 统一计算并应用，导航和缩放控件放入 `src/mindmap/navigation/`；`src/mindmap/mindmap.ts` 只保留生命周期、缩放状态和刷新通知接线，不重复实现画布边界策略。
- 节点多选集合、框选几何、选择视觉和多选手势放入 `src/mindmap/interaction/NodeSelectionController.ts`；`src/mindmap/mindmap.ts` 只保留事件委托和生命周期接线。
- `src/mindmap/mindmap.ts` 和 `src/mindmap/INode.ts` 仅保留生命周期与编辑接线。
- 节点表格的识别、保护和 Markdown 序列化放入 `src/mindmap/table/NodeTableMarkdown.ts`；预览交互和编辑 Modal 分别由 `src/mindmap/table/NodeTablePreviewController.ts` 和 `src/mindmap/table/NodeTableEditorModal.ts` 负责，视图、节点和脑图模块不得重复实现表格语法解析或表格 UI。
- 节点代码围栏、尺寸元数据和文档保护放入 `src/mindmap/code/NodeCodeMarkdown.ts`；Obsidian 高亮渲染由 `src/mindmap/code/NodeCodeRenderer.ts` 统一提供；卡片交互、独立编辑 Modal 和显示设置分别由同目录的 Controller、Modal 和 Settings 模块负责，`INode` 与 `MindMapView` 只保留生命周期和保护恢复接线。
- 脑图文件身份判断、专属图标注册、文件资源管理器 DOM 装饰、刷新调度和卸载清理由 `src/mindmap/file/MindMapFileIconController.ts` 统一负责；宿主 DOM 不满足预期时安全跳过，不得读取或改写 Markdown 正文，也不得把选择器和观察器逻辑散落到插件或视图入口。
- 验证 Obsidian 深色、浅色主题以及活动节点的焦点和选区行为。

## 可访问性

- 每个工具栏操作必须提供可访问名称和可见提示。
- 文件资源管理器中的专属图标仅作装饰并设置 `aria-hidden`；文件名继续承担可访问名称，脑图身份必须依靠图形轮廓而不是颜色区分。
- 快捷键检查器与全集管理器的打开、关闭、搜索、筛选、录制、清除和恢复默认控件必须可键盘聚焦；录制状态和冲突提示必须被辅助技术识别。
- 链接图标必须可聚焦并提供链接标题作为可访问名称；上下文菜单使用宿主键盘导航。
- 图片预览 Modal 必须提供可访问标题和图片替代文本，关闭后将焦点恢复到仍有效的原编辑图片。
- 编辑态图片必须提供可访问的换位说明和键盘等价操作；拖动时同步 `aria-grabbed`，完成换位后焦点回到移动后的图片。
- 导航控件的缩放按钮和滑动条必须提供可访问名称，百分比文本必须反映当前缩放状态，节点数统计必须反映当前可见节点数与总节点数。
- 取消弹窗后焦点返回编辑节点，且不得改变节点文本。
- 工具栏控件必须可通过键盘聚焦和操作。
- 代码卡片操作必须具有可访问名称和提示；缩放手柄支持方向键调整，`Shift` 方向键细调，`Enter` 恢复默认尺寸。
- 编辑态节点必须保留当前样式模板的节点背景，让原生文本光标使用对应节点的文字色，并以该色的弱化描边标识编辑边界；这些规则可使用 `!important` 覆盖主题的通用 `contenteditable` 样式，保证深浅主题下均可辨识节点边界和输入位置。
- 普通文本节点在选中且非编辑态时，可在右侧边界悬停显示窄竖向宽度手柄；手柄仅负责宽度拖拽，不常驻占用画布，也不适用于表格、代码、图片或含链接附件节点。拖拽中的内容以实际 CSS 宽度实时自动换行，不使用额外虚线替代预览。
- 节点内的 `Shift+Enter` 是持久化的手动换行，宽度造成的自动换行只由当前 CSS 宽度计算；进入编辑态时手动 `<br>` 必须显示为真实换行，不能显示 Markdown 字面文本或改变节点有效宽度。
- 多选节点必须同步 `aria-selected`；多选状态下应阻止单节点键盘编辑、增删和导航，静止空白单击必须可以清空选择。

## 暂定规则

- 精确间距、圆角、阴影及工具栏避让行为在运行时评审前仅作为实现细节。

<!--
## Known Gaps
-->
## 已知缺口

- 画布边缘的工具栏避让尚未实现。
- 行内代码与 KaTeX 插入控件不属于第一版范围。
- 不支持内嵌视频播放；视频仅显示为可点击链接。
