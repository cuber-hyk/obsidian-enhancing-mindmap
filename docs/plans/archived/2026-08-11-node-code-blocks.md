---
artifact_type: plan
status: archived
created: 2026-08-11
updated: 2026-08-11
owner: codex
---

# 节点混合代码块与独立编辑面板

## Goal

让一个脑图节点能够按 Markdown 原始顺序同时包含普通文字和一个或多个围栏代码块；代码在节点中以紧凑、可高亮的代码卡片显示，并通过独立面板完成插入和编辑，不在节点编辑态暴露围栏 Markdown。

## Scope

- 支持反引号和波浪线围栏代码块，保留语言、缩进、空行、长行及多个代码块的原始顺序。
- 在现有节点插入工具栏增加代码入口，打开独立代码面板选择语言并输入代码，在已保存的光标位置插入代码卡片。
- 阅读态代码卡片常驻显示低强调语言标签；悬停、节点选中或键盘聚焦时显示复制操作，内容溢出时增加展开操作。
- 编辑态普通文字继续就地编辑，代码块显示为不可直接改写的可聚焦控件；通过双击或编辑操作打开同一代码面板，支持保存、取消和删除。
- 长代码使用受限视口和内部横向、纵向滚动；展开操作打开只读 Modal，不改变节点尺寸。
- 插件设置提供 10–24px 的全局代码字号，统一作用于代码卡片、代码编辑面板和展开预览，修改后刷新已打开脑图的节点布局。
- 编辑态代码卡片选中后提供右下角缩放手柄，可独立调整 280–900px 宽度和 120–600px 高度；双击或按 Enter 恢复默认尺寸。
- 完整脑图 Markdown 加载和层级 Markdown 粘贴共用围栏识别规则，避免列表正文后的代码块被 Markmap 清洗丢失。
- 插入、修改和删除继续通过节点 Markdown 及 `ChangeNodeText` History 支持撤销、重做和 Markdown/脑图往返。
- 更新英文与简体中文界面文本；其他语言沿用英文回退。

## Non-goals

- 不执行代码，不提供终端、运行结果或安全沙箱。
- 不实现自动格式化、Lint、代码补全、下载、行号开关、代码主题选择或代码块拖拽排序。
- 不增加每代码块独立字号、代码块全局宽高设置或语言管理设置；第一版使用全局代码字号、默认受限视口和每代码块按需拖拽宽高。
- 不做移动端专用布局或触摸交互适配。
- 不把渲染 HTML、Prism token 或临时 DOM 状态保存为节点数据。
- 不以减少现有文件行数为目标重构无关代码。

## Assumptions And Decisions

- 用户已确认一个节点内允许普通文字和一个或多个代码块共存；代码块始终采用纵向块级布局，不与普通文字横向并排。
- 节点 Markdown 是唯一事实来源；代码控件只是在阅读态和编辑态对标准围栏 Markdown 的可视化投影。
- 语言选择使用可搜索、允许自定义标识的输入；默认纯文本，未知语言仍保存并按纯文本安全显示。
- 阅读态语言标签低强调常驻，复制和展开按钮按需浮现；编辑入口在代码块可编辑上下文中显示，按钮使用绝对定位且不得参与节点尺寸计算。
- 复制成功使用代码卡片内短暂勾号反馈，不弹出持续性通知。
- 长行不强制折行，保留代码结构；短代码自然展示，长代码超过受限高度后内部滚动并可展开。
- 代码字号属于插件级显示设置，不写入节点 Markdown；默认 14px，非法持久值回退为默认值。
- 每代码块自定义宽高使用紧邻围栏的 `<!-- mm-code-size: WIDTHxHEIGHT -->` 注释持久化；无注释时使用默认紧凑视口，精确注释以外的普通 HTML 注释不参与尺寸解析。
- 缩放手柄只在编辑态选中代码卡片后显示；拖拽补偿当前画布缩放，过程节流刷新布局，取消恢复原尺寸，完成节点编辑时与其他正文修改合并为一次 History。
- 有效围栏代码块由同一确定性解析器识别；未闭合围栏不转换为代码控件，也不静默改写原文。
- 插入和重写代码块时选择不会与代码内容冲突的安全围栏长度；已有有效代码块在未修改时保持原 Markdown。
- 不引入新的第三方代码编辑器或 Prism CDN；阅读态高亮继续使用 Obsidian `MarkdownRenderer` 和当前主题能力。
- ADR gate：不需要。标准 Markdown 的事实来源和公共文件格式不变，UI 与模块边界均可逆。

## Fact Sources

- `CONTEXT.md`：节点 Markdown 是节点富文本显示的唯一事实来源。
- `DESIGN.md`：节点控件应紧凑、上下文关联、复用 Obsidian UI，渲染 HTML不得成为第二数据源。
- `docs/capabilities/mindmap-editing.md`：节点编辑、插入工具栏、History、完整 Markdown 粘贴及桌面端验证基线。
- `src/mindmap/INode.ts`：当前 MarkdownRenderer 阅读态、contentEditable 编辑态、图片控件序列化及布局刷新入口。
- `src/mindmap/insert/NodeInsertController.ts`、`src/mindmap/insert/NodeMarkdownInsertion.ts`：编辑工具栏、Modal 会话和光标 Range 插入入口。
- `src/mindmap/table/NodeTablePreviewController.ts`、`src/mindmap/table/NodeTableEditorModal.ts`：节点内受限预览、按需浮动操作和独立 Modal 编辑的现有模式。
- `src/MindMapView.ts`、`src/mindmap/table/NodeTableMarkdown.ts`：完整脑图 Markdown 在进入 Markmap 前的保护与恢复链路。
- `src/mindmap/clipboard/NodeMarkdownPaste.ts`：层级 Markdown 粘贴已有围栏保护逻辑。
- `styles.css`、`src/lang/locale/en.ts`、`src/lang/locale/zh-cn.ts`：视觉规则和界面文本。

## Split Guidance

- Required: yes；`src/mindmap/INode.ts` 为 1730 行中央节点类，本任务包含明确的代码块解析、Modal 和预览交互边界，不应继续累积在该文件中。
- Source: `/dev-split` 结构检查；扫描阈值 1200 行，`INode.ts` 命中候选，但行数只作为审查信号。
- Classification: proposed split；只为新能力建立 `src/mindmap/code/` 所有权边界，不移动或重构无关既有逻辑。
- New behavior owner: `src/mindmap/code/`。
- Do not add behavior to: `src/mindmap/INode.ts`、`src/MindMapView.ts`；二者只允许增加最小生命周期、渲染和保护恢复接线。
- Side effects owner: 代码复制、展开和编辑交互由代码块控制器负责；插入会话仍由 `NodeInsertController` 负责；Markdown 写回仍由 `INode` 的既有 History 入口负责。
- State owner: 持久状态只在 `INode.data.text`；代码面板只保存当前草稿，代码控制器只保存当前 DOM 生命周期状态。
- Shared module allowed: 仅 `NodeCodeMarkdown.ts` 可作为代码块能力内的共享纯逻辑，因为节点编辑、完整文档加载和剪贴板粘贴三个当前消费者必须共用同一围栏语义。
- Deferred split trigger: 如果实现要求把通用节点正文 token 化、移动 `INode` 的全部图片/链接编辑状态，或建立跨能力通用富文本 AST，停止实施并重新运行 `/dev-split`；本任务不扩大到该层级。

## Owner Module Review

| Module | Owner responsibility | May depend on | Must not own |
|---|---|---|---|
| `src/mindmap/code/NodeCodeMarkdown.ts` | 围栏代码块识别、解析、序列化、替换、删除及完整文档保护/恢复 | 纯 TypeScript 与节点 Markdown 字符串 | DOM、剪贴板写入、Modal、History |
| `src/mindmap/code/NodeCodeEditorModal.ts` | 语言与代码草稿输入、保存、取消和删除意图 | Obsidian Modal、翻译键、代码块数据类型 | 节点树、Markdown 文件写入、History |
| `src/mindmap/code/NodeCodeController.ts` | 阅读/编辑态代码卡片、复制反馈、展开预览、焦点及代码块操作事件 | Obsidian UI、`NodeCodeMarkdown`、由节点提供的回调 | 节点持久状态、完整文档解析、插入工具栏会话 |
| `src/mindmap/insert/NodeInsertController.ts` | 在已捕获光标位置打开插入面板并插入代码控件 | `NodeCodeEditorModal`、`NodeMarkdownInsertion`、节点最小公开接线 | 围栏解析算法、代码卡片渲染 |
| `src/mindmap/INode.ts` | 保持节点编辑/阅读生命周期、统一 Markdown 写回和布局刷新入口 | 代码块控制器的窄接口 | 新的围栏语法实现、Modal 细节、复制/展开 UI |
| `src/MindMapView.ts` | 在 Markmap 转换前后编排代码块保护/恢复 | `NodeCodeMarkdown` 保护接口 | 围栏扫描细节、代码卡片 UI |

## Steps And Verification

| ID | Status | Step | Verification |
|---|---|---|---|
| PLAN-1 | done | 建立当前缺陷夹具：记录编辑态暴露围栏、原生复制按钮撑高节点，以及完整文档中列表正文后代码块可能丢失；确定短代码、长代码、未知语言、混合文字与两个代码块的回归样例。 | 在隔离测试 Vault 保存复现 Markdown 与前后截图；确认现状能稳定复现，且不修改真实 Vault 数据。 |
| PLAN-2 | done | 新增 `NodeCodeMarkdown.ts`，用单一确定性扫描器解析反引号/波浪线围栏、语言、正文及源范围，并提供安全序列化、替换、删除、保护和恢复；让完整文档加载与 `NodeMarkdownPaste` 复用该围栏语义。 | 对纯函数执行源码级用例：混合文字、多代码块、嵌套反引号、四字符围栏、波浪线、未知/空语言、缩进、空行、未闭合围栏、保护恢复往返；全部比较精确 Markdown。 |
| PLAN-3 | done | 新增代码编辑 Modal，并在节点插入工具栏增加代码入口；保存打开面板前的光标 Range，将有效代码控件插入原位置，取消或失效会话不改变节点；代码输入区支持 Tab 缩进和 `Ctrl`/`Cmd+Enter` 保存。 | 手动验证节点首部、中部、尾部连续插入，选择文字替换、取消、切换节点或 leaf、空代码校验、自定义语言、IME 输入及焦点恢复；插入后不出现原始围栏。 |
| PLAN-4 | done | 新增代码块控制器并以窄接口接入 `INode`：阅读态包装 Obsidian 已渲染的代码块；编辑态将每段有效围栏显示为不可直接改写的代码卡片，普通文字保持 contentEditable；保存时按 DOM 顺序恢复标准 Markdown，修改和删除走一次 `ChangeNodeText`。 | 验证文字→代码→文字→代码顺序、多个代码块独立编辑/删除、未改动保存保持原文、选中后 Delete、双击编辑、撤销/重做、Markdown/脑图切换及关闭重开；链接、图片、公式和手动 `<br>` 回归不变。 |
| PLAN-5 | done | 实现代码卡片 UI：语言标签常驻，复制/编辑/展开按上下文浮现；复制成功短暂勾号；长行横向滚动、长代码受限高度并纵向滚动，展开使用只读 Modal；所有按钮绝对定位且布局变化按动画帧刷新。 | 在 Obsidian 深色/浅色主题验证短/长 Python、JavaScript、纯文本和未知语言；确认按钮不撑高节点、节点下划线位于整体底部、分支连线与最终尺寸对齐、复制内容不含围栏、展开/关闭不改变视口或节点数据。 |
| PLAN-6 | done | 完成端到端 Markdown 兼容：完整脑图加载保护列表正文后的代码块，粘贴保留代码内容和层级；确保表格保护、公式归一化及代码中的 Markdown/公式/表格符号互不误解析。 | 使用标题、列表、代码、表格、公式混合文档验证加载、保存、再次加载和层级粘贴；检查代码内 `|`、`$`、`[[...]]`、反引号及列表标记保持字面值，节点数量和层级稳定。 |
| PLAN-7 | done | 更新 `DESIGN.md`、能力文档、上下文路由和 `CHANGELOG.md`，补齐英文/简中翻译，生成 `main.js` 并完成构建、文档与桌面端回归门禁。 | `npm run build`、`git diff --check`、Dev Flow 文档校验通过；部署隔离测试插件并完成插入、编辑、复制、展开、删除、撤销/重做、外部同步、初次布局和深浅主题验收。 |

## Risks And Controls

- Markdown 损坏：只用源范围和单一序列化器改写目标代码块；未闭合围栏保持普通文本并拒绝控件化。
- 混合 DOM 丢序：编辑态每个代码控件保存自身 Markdown 数据，节点统一按直接子节点顺序序列化，不从渲染 HTML反推源码。
- 原生复制按钮重复：代码控制器统一接管代码卡片操作并移除或隐藏 Obsidian 注入的重复控件，不维护两套复制入口。
- 长代码破坏布局：代码卡片使用受限视口，操作层绝对定位；异步高亮或字体变化只触发合并后的节点测量与布局刷新。
- Markmap 丢块：完整文档在转换前先保护有效围栏代码，转换后按 marker 恢复；保护恢复和剪贴板共用围栏扫描器。
- 编辑会话竞态：Modal 回调必须校验原节点、编辑会话和 DOM 仍有效，失效时不写回或抢回焦点。
- 主题和可访问性：只使用 Obsidian CSS 变量和图标；代码卡片、工具条、Modal、复制反馈及展开预览提供可访问名称和键盘路径。

## Acceptance Criteria

- 同一节点可按原顺序显示和保存普通文字与多个有效代码块，编辑态不再出现围栏 Markdown 字面文本。
- 通过节点工具栏可在当前光标位置打开独立面板并插入代码；已有代码可用同一面板编辑或删除。
- Python 等已知语言使用 Obsidian 原生语法高亮，未知语言安全回退为纯文本；代码永不执行。
- 语言标签与按需浮现的复制、编辑、展开操作不占用节点正文额外高度；复制结果仅为代码正文。
- 长行和长代码限制在代码卡片内部滚动，展开预览不修改节点尺寸、Markdown、视口或 History。
- 设置中的全局代码字号可在 10–24px 之间调整，并同步更新代码卡片、编辑面板、展开预览和已打开脑图布局。
- 编辑态可拖拽代码卡片右下角手柄调整宽高，方向键提供键盘等价操作，尺寸在保存、重新打开、完整 Markdown 加载和层级粘贴后保持；重置后恢复默认紧凑尺寸且移除尺寸注释。
- 完整 Markdown 加载和层级粘贴不再丢失列表正文后的代码块，代码内 Markdown 特殊字符不被插件二次解析。
- 插入、编辑和删除代码块均可一次撤销、一次重做；Markdown/脑图往返、关闭重开和外部同步后内容与层级不变。
- 图片、链接、表格、公式、普通列表、节点宽度、首次布局和大型画布行为无回归。
- 生产构建、差异检查、文档校验和用户桌面端验收全部通过。

## Artifact Routing

- Plan: `docs/plans/2026-08-11-node-code-blocks.md`
- Source audit: none
- Covered findings: none
- Deferred findings: none
- Capability docs: implementation closeout updates `docs/capabilities/mindmap-editing.md`
- Design system impact: update；记录混合正文中的块级代码卡片、独立编辑 Modal、按需浮现操作和受限滚动规则
- Context map: update；增加 `src/mindmap/code/` 代码块能力 owner 路由
- Changelog: needed；新增用户可见的代码插入、编辑、复制和展开能力，并修复完整文档代码块丢失
- Distill: needed；更新能力、设计和上下文路由并关闭计划
- ADR gate: not needed；标准 Markdown 数据所有权和公共格式不变
- Check gate: needed；计划、能力、设计、上下文和 Changelog 均会变化

## Completion

当 PLAN-1 至 PLAN-7 全部完成、没有阻塞项，自动与桌面端验证均已记录，并完成 design-system、changelog、distill、check 和独立评审门禁后，将本计划移入 `docs/plans/archived/`。
