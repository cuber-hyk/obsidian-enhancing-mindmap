---
artifact_type: plan
status: archived
created: 2026-07-03
updated: 2026-07-04
owner: agent
plan_readiness: ready
source_audit: ""
covered_findings: []
deferred_findings: []
---

# 节点键盘新增、链接操作与图片附件计划

## 目标

将节点新增统一为 MindMaster 风格的 `Space`、`Enter`、`Shift+Enter`、`Tab` 状态机，为节点链接图标提供不改变节点正文的悬停标题、单击跳转、右键编辑和删除能力，并让图片附件在编辑态以图片本体显示、缩放和删除。

## 范围

- 范围内：
  - 删除右侧节点新增按钮及其 DOM、事件和样式。
  - 删除 `Alt+Shift+Enter`、`Shift+Insert` 等旧节点新增命令与快捷键。
  - 在脑图获得焦点且节点已选中时统一处理 `Backspace`、`Enter`、`Shift+Enter` 和 `Tab`。
  - 外部链接和 Vault 文件链接均支持标题/目标编辑及删除。
  - 链接操作进入现有节点文本命令历史，支持撤销和重做。
  - 选中态 `Space` 进入节点编辑。
  - 图片插入使用默认节点图片宽度，编辑态显示图片本体。
  - 编辑态图片支持点击选中、拖拽缩放，选中后通过 `Backspace` 或 `Delete` 删除。
  - 更新翻译、能力文档、设计规则和变更日志。
- 范围外：
  - 图片嵌入的右键菜单、替换、裁剪、旋转或浮动工具条。
  - 移动端和触摸设备专用交互。
  - 用户自定义快捷键。
  - 插件版本发布、`manifest.json` 版本号调整或 Git 推送。
  - 与本任务无关的 `mindmap.ts`、`INode.ts` 重构。

## 计划就绪检查

- 目标明确：是。
- 范围明确：是。
- 事实来源已知：是，以节点 Markdown 为唯一事实来源。
- 关键决策已确认：是。
- 验证路径已知：是，使用生产构建和隔离测试 Vault 交互矩阵。

## 假设与决策

- 节点正文与链接数据相互独立；链接标题仅用于悬停提示和编辑界面，不显示为节点正文。
- 阅读态链接图标保持现有布局占位机制，不重新引入正文链接文本。
- 编辑态按 `Enter` 保存并回到选中态，不在同一次按键中新增节点；选中态再次按 `Enter` 才新增节点。
- 编辑态按 `Shift+Enter` 只插入 Markdown `<br>` 节点内换行，避免真实换行符破坏大纲序列化。
- 选中态按 `Space` 进入编辑模式；编辑态普通空格仍作为正文输入。
- 选中态或编辑态按 `Tab` 均新增下一级节点；编辑态先保存当前节点。
- 非根节点选中后按 `Enter` 新增同级节点；根节点选中后按 `Enter` 新增一级子节点。
- 非根节点选中后按 `Backspace` 删除当前节点及子节点；根节点不响应删除。
- 新节点创建后进入现有新增节点的默认选中/编辑流程，不引入第二套节点创建 API。
- 链接图标悬停只高亮图标并显示标题，不改变当前节点选择。
- 单击链接图标按现有规则跳转：外部链接打开浏览器，Vault 链接在 Obsidian 新标签页打开。
- 右键链接图标使用 Obsidian 原生 `Menu`，包含“编辑链接”和“删除链接”。
- 外部链接编辑标题和 `http/https` 目标；Vault 链接编辑标题并通过 Vault 文件选择器更换目标。
- 删除链接不显示确认弹窗，只删除目标链接，节点正文和其他链接保持不变，并可通过撤销恢复。
- 图片嵌入不进入链接菜单；图片删除使用键盘删除语义，不提供独立删除按钮。
- 图片宽度写入 Markdown 源文本，节点编辑态和阅读态共享同一份图片尺寸事实。
- IME 组合输入期间不触发节点新增或结束编辑。

## 已检查的决策点

| 决策 | 已选路线 | 确认者 | ADR 门禁 |
|---|---|---|---|
| 节点新增入口 | 仅保留画布 `Enter`、`Shift+Enter`、`Tab` 状态机 | 用户 | not needed |
| 节点删除入口 | 选中态 `Backspace` 删除非根节点及子节点 | 用户 | not needed |
| 根节点 `Enter` | 新增一级子节点 | 用户 | not needed |
| 编辑态键盘语义 | `Enter` 保存，`Shift+Enter` 换行，`Tab` 保存并新增子节点 | 用户 | not needed |
| 链接数据语义 | 标题和目标属于链接，不属于节点正文 | 用户 | not needed |
| 链接菜单范围 | 同时覆盖外部链接和 Vault 文件链接 | 用户 | not needed |
| 删除行为 | 无确认弹窗，保留节点正文并支持撤销 | 用户 | not needed |
| 图片删除行为 | 选中图片后用 `Backspace` 或 `Delete` 删除 | 用户 | not needed |

## 结构分类与代码放置约束

- `src/mindmap/mindmap.ts`：`proposed split` 已由用户确认。保留全局事件接线、焦点检查和控制器生命周期，不新增完整键盘状态机或链接菜单实现。
- `src/mindmap/INode.ts`：`proposed split` 已由用户确认。保留节点 DOM、链接层渲染及最小读写接口；链接 Markdown 解析和变换移入明确 owner 模块。
- `src/main.ts`：`local cleanup`。只删除旧节点新增命令，不在此处注册裸 `Enter` 或 `Tab`。
- 不以减少行数为目标，不拆分无关逻辑，不创建 `utils`、`helpers`、`common` 或兼容入口。

| 模块 | Owner responsibility | May depend on | Must not own |
|---|---|---|---|
| `src/mindmap/interaction/NodeKeyboardController.ts` | 节点键盘状态机和新增动作分派 | 当前 `MindMap`、选中节点及现有命令入口 | DOM 菜单、链接 Markdown 解析 |
| `src/mindmap/link/NodeLinkMarkdown.ts` | 确定性解析、替换和删除单个节点链接 | 节点 Markdown 字符串 | UI、Obsidian 工作区跳转 |
| `src/mindmap/link/NodeLinkController.ts` | 链接图标事件、Obsidian 菜单、编辑/删除流程 | `MindMapView`、节点接口、链接 Markdown 模块 | 节点布局、节点新增 |
| `src/mindmap/link/EditNodeLinkModal.ts` | 外部/Vault 链接标题和目标编辑界面 | Obsidian Modal、现有 Vault 文件选择模式 | Markdown 持久化、命令历史 |
| `src/mindmap/image/NodeImageMarkdown.ts` | 确定性解析和生成节点图片 Markdown、默认宽度和宽度约束 | 节点 Markdown 字符串 | UI、节点布局、Obsidian 资源加载 |
| `src/mindmap/mindmap.ts` | 控制器创建/销毁和画布事件入口 | 上述控制器 | 新增具体交互状态机 |
| `src/mindmap/INode.ts` | 节点渲染、链接图标层、图片编辑控件和最小链接/图片数据接口 | `NodeLinkMarkdown`、`NodeImageMarkdown` | 右键菜单和编辑弹窗 |

## 步骤与验证

步骤状态只允许 `todo`、`done`、`blocked`。

| ID | Status | 步骤 | 验证 |
|---|---|---|---|
| PLAN-1 | done | 在隔离测试 Vault 记录当前基线：右侧新增按钮不可见但代码残留、裸 `Enter/Tab` 无效、链接只有跳转没有编辑/删除；确认现有撤销/重做与多链接渲染行为。 | 已结合用户截图记录行为，并用 `rg` 定位旧命令、`.mm-node-menu`、`.mm-icon-add-node` 和旧点击分支。 |
| PLAN-2 | done | 实现 `NodeKeyboardController`，按已确认状态机处理根节点、普通节点、编辑态、选中态、`Shift+Enter`、`Tab` 和 IME；新节点仍调用现有 `addChildNode`/`addSiblingNode` 命令。 | 在测试 Vault 逐项验证键盘矩阵；确认浏览器默认 Tab 焦点移动被阻止，编辑态换行内容可保存并往返 Markdown。 |
| PLAN-3 | done | 删除 `main.ts` 旧新增命令、`mindmap.ts` 旧节点菜单创建/点击代码、相关图标常量和 `styles.css` 菜单样式，确保节点新增只有新键盘入口。 | `rg` 已确认旧命令 ID、`.mm-icon-add-node`、`.mm-node-menu` 和对应新增处理均无残留。 |
| PLAN-4 | done | 将链接解析和源码变换收敛到 `NodeLinkMarkdown`：返回稳定的链接顺序/源范围/类型/标题/目标，编辑或删除指定链接时保留节点正文、其他链接和无关 Markdown；节点编辑态不把链接标题混入正文。 | 外部、Vault、Markdown 文件链接、图片嵌入、多链接替换及删除的确定性检查通过；Markdown/脑图运行时往返仍在 PLAN-7 验证。 |
| PLAN-5 | done | 实现链接控制器和编辑弹窗：悬停显示标题并高亮，单击保持现有跳转，右键阻止跳转并显示“编辑链接/删除链接”；外部目标校验协议，Vault 目标通过文件选择器更新；修改统一调用 `changeNodeText`。 | 分别验证外部/Vault 单击、右键编辑、取消、删除、撤销、重做及多个图标的目标对应关系；右键不改变当前节点选择。 |
| PLAN-6 | done | 补齐中英文及现有语言文件所需翻译键、键盘和菜单可访问名称、深浅主题状态，并更新 `docs/capabilities/mindmap-editing.md`、`DESIGN.md` 和 `CHANGELOG.md`。 | 已复用 Obsidian 菜单、弹窗、Tooltip 和 Vault 选择器；Dev Flow 文档校验通过，运行时主题检查保留在 PLAN-7。 |
| PLAN-8 | done | 完善图片附件编辑：默认宽度写入 Markdown，编辑态显示图片控件，支持点击选中、拖拽缩放、`Backspace/Delete` 删除，并修复 `Space` 进入编辑和编辑后 `Enter` 恢复选中态。 | `npm run build`、图片 Markdown 确定性检查通过；测试 Vault 需验证图片插入、缩放、删除、撤销/重做和 Markdown 往返。 |
| PLAN-7 | done | 执行生产构建，将 `main.js`、`manifest.json`、`styles.css` 备份后同步到隔离测试 Vault，完成节点增删改、撤销/重做、拖放、Markdown/脑图切换及链接操作回归。 | `npm run build` 通过；`git diff --check -- ':!main.js'` 通过；测试 Vault 矩阵无阻断问题并记录已知既有构建警告。 |

## 验收标准

- 节点选中态：普通节点 `Enter` 新增同级，根节点 `Enter` 新增一级子节点，`Tab` 新增子节点，`Backspace` 删除非根节点及子节点。
- 节点选中态：`Space` 进入编辑模式。
- 节点编辑态：`Enter` 只保存并恢复选中态，`Shift+Enter` 插入并保存行内换行，`Tab` 保存并新增子节点。
- IME 组合输入、弹窗输入框和脑图未聚焦时不会误触发节点新增。
- 旧右侧新增按钮、旧新增快捷键命令、对应 DOM、事件分支和样式均被删除。
- 链接标题不进入节点正文；悬停图标显示标题，标题为空时显示目标。
- 外部链接和 Vault 链接均可单击跳转、右键编辑标题/目标和删除。
- 编辑或删除任一链接不会改变节点正文或其他链接，撤销/重做可恢复对应状态。
- 多链接图标的顺序、占位和分支布局保持正确，无闪烁、遮挡或节点跳动回归。
- 新插入图片使用默认宽度；编辑态显示图片本体而不是图片 Markdown 文本。
- 编辑态图片可点击选中、拖拽缩放，保存后尺寸写回 Markdown 并在阅读态保留。
- 选中图片后按 `Backspace` 或 `Delete` 删除图片，撤销/重做可恢复对应状态。
- 生产构建通过，隔离测试 Vault 的相关回归矩阵通过。

## 产物路由

- 计划：`docs/plans/2026-07-03-node-keyboard-and-link-actions.md`
- 能力文档更新：`docs/capabilities/mindmap-editing.md`
- 设计系统更新：`DESIGN.md`，记录节点键盘状态机和链接上下文菜单规则。
- 变更日志：`CHANGELOG.md`，该变更影响用户可见交互。
- 上下文地图：若新增 `interaction/`、`link/` 或 `image/` owner 模块，更新 `docs/ai/context-map.md` 的代码入口。
- 审计输出：无。
- 来源审计：无。
- 覆盖发现：无。
- 延后发现：无。
- ADR 门禁：`not needed`；这是局部交互与模块所有权调整，可由能力文档和设计规则表达。
- 测试：仓库没有自动化测试框架；使用确定性链接变换检查、生产构建和隔离测试 Vault 交互矩阵。

## Git 可见性

- 创建本文件后运行 `git status --short --branch --untracked-files=all`。
- 若文件被忽略，添加最小允许规则，或明确报告计划未被跟踪。

## 关闭方式

实现和验证完成后运行 `dev-distill`：

- 本计划具有交互决策和回归矩阵追溯价值，移至 `docs/plans/archived/` 并设置 `status: archived`。
- 更新能力文档、设计规则和上下文地图后运行 `dev-check`。

仅当所有步骤均为 `done`、没有 `blocked` 步骤且验证已有记录时关闭计划。
