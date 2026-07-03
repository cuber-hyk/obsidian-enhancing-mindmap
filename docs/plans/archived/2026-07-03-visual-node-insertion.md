---
artifact_type: plan
status: archived
created: 2026-07-03
updated: 2026-07-03
owner: agent
plan_readiness: ready
source_audit: ""
covered_findings: []
deferred_findings: []
---

# 脑图节点可视化插入计划

## 目标

在脑图节点编辑状态中提供轻量工具栏，使用户可视化插入外部链接、Vault 文件和图片，同时保持 Markdown 为唯一数据源，并确保链接不会替换当前脑图标签页。

## 范围

### 范围内

- 当前编辑节点上方显示三个入口：外部链接、Vault 文件、图片。
- 外部链接弹窗支持显示标题与 `http`、`https` URL。
- Vault 文件选择器支持 Markdown、视频、PDF、音频等非图片文件。
- 图片支持选择 Vault 现有图片，或从系统导入后按 Obsidian 附件规则保存。
- Vault 文件在 Obsidian 新标签页打开；外部链接在浏览器新标签页打开。
- 将最低 Obsidian 版本提升至 `1.5.7`，升级对应 API 类型依赖。
- 增加中文界面文本，并保持其他已有语言回退行为不变。

### 范围外

- 行内代码与 KaTeX 的可视化插入。
- 视频内嵌播放、网页预览和 OPML 支持。
- 为旧版 Obsidian 保留兼容分支。
- 以减少行数为目的拆分 `main.ts` 或 `mindmap.ts`。
- 新建通用测试框架或重新设计移动端专用布局。

## 计划就绪检查

- 目标明确：是。
- 范围明确：是。
- 事实来源已知：是，以节点 Markdown、当前视图生命周期及 Obsidian API 为准。
- 关键决策已确认：是。
- 验证路径已知：是，使用生产构建和测试 Vault 交互矩阵。
- 持久化计划：是；本任务跨 UI、文件系统副作用、视图生命周期和兼容性配置。

## 假设与决策

- `INode.data.text` 继续作为节点内容唯一事实来源，不保存渲染 HTML。
- 每个 `MindMapView` 持有一个插入控制器；工具栏不为每个节点重复创建。
- 打开弹窗前保存 DOM Range；弹窗期间保持插入会话，确认或取消后恢复节点焦点。
- 链接插入时，已有文本选区作为显示标题；没有选区时使用弹窗标题或目标文件名。
- 图片插入替换当前选区；没有选区时在光标位置插入。
- 使用 `FileManager.generateMarkdownLink()` 遵循用户链接格式，图片在生成结果前添加嵌入标记 `!`。
- 本地图片先调用 `getAvailablePathForAttachment()`，再通过 Vault API 写入二进制内容。
- 导入文件写入成功但文本插入失败时不自动删除附件，避免误删；应显示包含附件路径的错误提示。
- 仓库当前没有测试框架，本任务不单独引入；确定性逻辑通过构建、最小可调用边界和手动矩阵验证。

## 已检查的决策点

| 决策 | 已选路线 | 确认者 | ADR 门禁 |
|---|---|---|---|
| 第一版功能 | 外部链接、Vault 文件、图片 | 用户 | 不需要 |
| 工具栏位置 | 仅在编辑节点上方显示 | 用户与效果图确认 | 不需要 |
| Vault 文件范围 | 所有非图片可链接文件 | 用户选择 A | 不需要 |
| 图片来源 | Vault 图片与本地导入均支持 | 用户 | 不需要 |
| 链接打开方式 | 始终新标签打开，不替换脑图 | 用户 | 不需要 |
| Obsidian 兼容性 | 最低版本提升到 `1.5.7`，不保留旧分支 | 用户 | 不需要；属于插件兼容基线更新 |
| 代码组织 | 新行为进入 `src/mindmap/insert/`，大文件只接线 | 工程约束 | 不需要 |

## 事实来源

- 仓库规则：`AGENTS.md`
- 稳定术语：`CONTEXT.md`
- 当前能力：`docs/capabilities/mindmap-editing.md`
- UI 合同：`DESIGN.md`、`docs/assets/node-insert-toolbar-concept.png`
- 节点编辑与渲染：`src/mindmap/INode.ts`
- 画布事件与链接打开：`src/mindmap/mindmap.ts`
- 视图生命周期：`src/MindMapView.ts`
- 插件命令与注册：`src/main.ts`
- 配置与构建：`manifest.json`、`package.json`、`rollup.config.js`
- 外部 API：Obsidian `FileManager`、`Vault`、`Workspace`

## Dev Split 约束

分类：`defer` 既有大文件的广泛拆分；为新职责建立具名 owner 模块。

- `src/main.ts` 与 `src/mindmap/mindmap.ts` 已是大型候选文件，但本任务不重构其既有职责。
- 不向 `src/main.ts` 添加插入工作流。
- `src/mindmap/mindmap.ts` 只允许修改链接点击行为或必要接线。
- `src/MindMapView.ts` 负责控制器的创建和销毁。
- `src/mindmap/INode.ts` 只通知编辑开始、结束和选区恢复，不拥有弹窗或文件副作用。
- 若实现需要在任一既有大文件新增超过接线级逻辑，应停止并重新运行 `dev-split`。

| 模块 | 单一职责 | 可依赖 | 不得负责 |
|---|---|---|---|
| `src/mindmap/insert/NodeInsertController.ts` | 工具栏、插入会话和动作编排 | `MindMapView`、节点、各专用模块 | Markdown 渲染、通用画布命令 |
| `src/mindmap/insert/NodeMarkdownInsertion.ts` | 捕获、恢复选区并插入 Markdown | DOM Range、节点编辑元素 | 弹窗、Vault 写入 |
| `src/mindmap/insert/ExternalLinkModal.ts` | 收集并校验标题与外部 URL | Obsidian `Modal` | 节点状态、文件系统 |
| `src/mindmap/insert/VaultFileSuggestModal.ts` | 搜索并返回符合类型的 Vault 文件 | Obsidian `FuzzySuggestModal`、Vault | Markdown 插入、附件导入 |
| `src/mindmap/insert/AttachmentImporter.ts` | 按 Obsidian 规则导入本地图片 | `FileManager`、Vault | UI 定位、节点历史 |

## 步骤与验证

步骤状态只允许 `todo`、`done`、`blocked`。

| ID | Status | 步骤 | 验证 |
|---|---|---|---|
| PLAN-1 | done | 记录基线：安装依赖并执行现有生产构建，在测试 Vault 中确认当前节点编辑、链接打开和图片渲染行为。 | `npm run build` 成功；保存基线操作记录。 |
| PLAN-2 | done | 将 Obsidian 类型依赖与 `minAppVersion` 提升至 `1.5.7`，不添加旧版兼容分支。 | 生产构建成功；清单与类型依赖均为 `1.5.7`。 |
| PLAN-3 | done | 在 `src/mindmap/insert/` 实现选区插入、外部链接弹窗、Vault 文件选择和附件导入模块；所有确定性 Markdown 生成由代码完成。 | 针对选区、空光标、特殊标题、取消和错误路径逐项检查；构建成功。 |
| PLAN-4 | done | 在 `MindMapView` 和 `INode` 接入单控制器生命周期，处理弹窗焦点、编辑结束、重新渲染和现有撤销/重做历史。 | 重复打开/取消弹窗不改文本；沿用 `cancelEdit()` 命令历史；关闭或切换视图后销毁控制器。 |
| PLAN-5 | done | 更新链接点击规则、工具栏样式和本地化文本；使用 Obsidian CSS 变量与原生图标。 | 内部文件在 Obsidian 新标签打开，外部 URL 在浏览器新标签打开；深色、浅色主题可用；键盘可操作。 |
| PLAN-6 | done | 执行完整验证并完成文档生命周期门禁。 | `npm run build`、测试 Vault 核心矩阵、`git diff --check`、`dev-check` 全部通过；更新能力文档与 `CHANGELOG.md`。 |

## 手动验证矩阵

- 外部链接：有选区、无选区、无效 URL、取消弹窗、网页与在线视频 URL。
- Vault 文件：Markdown、视频、PDF、音频；搜索为空；取消选择；同名文件。
- Vault 图片：Wikilink 与 Markdown link 两种用户设置。
- 本地图片：默认附件目录、指定附件目录、重名文件、写入失败。
- 编辑状态：工具栏显示/隐藏、焦点恢复、滚动、缩放、节点移动、视图切换。
- 数据完整性：脑图与 Markdown 往返、撤销/重做、重新加载 Vault。
- UI：深色、浅色主题；键盘焦点、提示文本和取消行为。

## 实施记录

- 已完成 owner 模块、视图和节点接线、样式、本地化、链接新标签行为及附件 API 升级。
- `npm run build` 通过；Rollup 只保留仓库既有警告。
- 在隔离测试 Vault 和 Obsidian 1.8.4 中验证了外链校验与取消、Vault 文件、Vault 图片、本地图片导入、Markdown 持久化、内部链接新标签页，以及深浅主题工具栏。
- 本地图片按 Obsidian 规则写入 Vault，节点保存后可往返渲染。
- `npx tsc --noEmit` 仍受 Obsidian 1.5.7 类型声明、既有 Markmap 类型、`WorkspaceLeaf.id` 和 XMind 隐式 `any` 阻塞；新增模块未出现在错误列表中。
- `npm audit --omit=dev` 报告 KaTeX 依赖存在 1 个 moderate 漏洞；修复需要破坏性升级至 KaTeX 0.17.0，不在本计划范围内。
- 仓库没有自动化测试框架，本次未新增；视频、PDF、音频等文件共用已验证的 `TFile` 选择与 `generateMarkdownLink()` 路径。

## 风险与处理

- 弹窗导致 `contentEditable` 失焦：由插入控制器持有会话状态，关闭弹窗后统一恢复。
- Obsidian API 升级造成旧类型冲突：采用单一 `1.5.7+` 路线，直接修正调用，不增加兼容层。
- 链接格式受用户设置影响：只使用 `generateMarkdownLink()`，不手写相对路径规则。
- 附件写入与文本插入是两个副作用：先写入再插入；后者失败时保留附件并明确提示。
- 工具栏超出视口：第一版保持节点上方定位；画布边缘避让作为已知缺口记录在 `DESIGN.md`。

## 验收标准

- 编辑节点时出现已确认样式的三个入口，退出编辑后消失。
- 三类插入均在当前选区或光标处生成可往返保存的 Markdown。
- 所有 Vault 非图片文件可搜索并插入；图片通过独立入口选择或导入。
- 当前脑图标签页不会被链接打开操作替换。
- 本地图片遵循 Obsidian 附件目录和重名规则。
- 取消或失败不会静默修改节点文本；错误通过 Obsidian Notice 明确呈现。
- 生产构建、手动验证矩阵和 Dev Flow 文档校验全部通过，未跳过项被明确列出。

## 产物路由

- 能力文档更新：实现后更新 `docs/capabilities/mindmap-editing.md` 为当前行为。
- UI 合同：实现后检查 `DESIGN.md`；仅在确认规则变化时更新。
- 上下文地图：新增 owner 模块成为稳定入口后更新 `docs/ai/context-map.md`。
- 变更日志：该功能和最低版本变化影响用户，更新 `CHANGELOG.md` 的 `Unreleased`。
- 审计输出：无。
- 来源审计：无。
- 覆盖发现：无。
- 延后发现：行内代码、KaTeX、内嵌视频、移动端专用布局。
- ADR 门禁：不需要；最低版本提升已记录在清单、能力文档和变更日志中，不构成需独立 ADR 的长期架构决策。
- 测试：不新增测试框架；记录生产构建和手动验证矩阵。
- `design_system_impact`：`update`，初始设计合同已建立，实施后执行一致性检查。

## Git 可见性

- 创建后运行 `git status --short --branch --untracked-files=all`。
- 若文件被忽略，先修正跟踪问题再实施。

## 关闭方式

实现完成并通过验证后，由 `dev-distill` 选择：

- 归档：本计划具有兼容性和模块边界追溯价值时，移至 `docs/plans/archived/` 并设置 `status: archived`。
- 删除：所有长期事实已进入能力文档、设计合同和变更日志，且计划无独立价值时删除。

仅当所有未延后步骤均为 `done`、没有 `blocked` 步骤且验证记录完整时关闭计划。不得使用 `completed` 或 `superseded` 作为最终状态。
