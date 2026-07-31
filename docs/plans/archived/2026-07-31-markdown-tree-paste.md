---
artifact_type: plan
status: archived
created: 2026-07-31
updated: 2026-07-31
owner: Codex
---

# Markdown 层级粘贴为节点树

## 目标

在脑图非编辑态选中唯一节点后，使用现有粘贴入口自动识别剪贴板中的结构化 Markdown，并将其作为一个或多个子节点树追加到目标节点下，同时保持现有节点 JSON 剪贴板格式、编辑态原生粘贴和一次撤销/重做语义。

## 范围

- 保留 `NodeClipboardController` 作为非编辑态单节点剪贴板唯一入口。
- 粘贴识别顺序固定为：有效 `copyNode` JSON 优先，其次为本计划支持的 Markdown。
- 支持 Markdown 标题、无序列表、有序列表，以及单行或多行普通文本。
- 多个顶层 Markdown 项按原顺序追加为目标节点的多个直接子节点；嵌套项按 Markdown 层级递归插入。
- 粘贴前目标节点若已折叠则自动展开；完成后仍选中目标节点。
- 一次 Markdown 粘贴只产生一条 History 命令，一次撤销删除整片新节点森林，一次重做按原顺序完整恢复。
- 为所有新节点生成新 ID，不复用剪贴板文本中可能出现的节点 ID。
- 更新当前能力文档和 `CHANGELOG.md`。

## 非目标

- 不支持仅靠 Tab 或空格缩进、但没有标题或列表标记的纯文本大纲。
- 不从带缩进的纯文本推断父子层级。
- 不增加粘贴预览、格式选择弹窗或设置项。
- 不改变节点编辑态、Markdown 视图和其他输入控件的原生粘贴行为。
- 不支持多选状态下退化为只向主选节点粘贴。
- 不在本任务中统一重构完整脑图文档的 `MindMapView.mdToData()` 转换链路。
- 不以减少文件行数为目标，也不拆分整个 `mindmap.ts`。

## 假设与已确认决策

- 用户已确认采用推荐方案：无预览、自动识别、多个顶层节点均挂到当前选中节点下。
- `copyNode` JSON 是插件内部节点复制、拖拽复制和部分节点操作的兼容契约，必须保持最高优先级及现有行为。
- Markdown 层级解析是确定性转换，由代码完成，不引入模型判断。
- Markmap Transformer 继续作为标题和列表结构解析来源；剪贴板模块只增加“哪些输入可接受”及“根节点如何归一化为节点森林”的明确规则。
- Transformer 产生空包装根时，使用其子节点作为粘贴森林；产生有文本根时，将该根作为森林中的唯一顶层节点。
- 单行普通文本创建一个直接子节点；多行普通文本的每个非空、非缩进行创建一个同级直接子节点，空行忽略。
- 结构化 Markdown 的每个非空行必须是标题或列表项；结构化标记混入普通段落或续行时整体拒绝，避免 Transformer 静默丢弃或误建内容。
- 异步读取剪贴板后继续复用现有活动 leaf、活动节点和非编辑态复核，避免内容粘贴到已切换的节点。
- 本功能为可逆的局部交互扩展，不改变持久化格式或跨模块事实源，ADR 门禁为 `not_required`。

## 事实来源

- 稳定术语：`CONTEXT.md`
- 任务路由与生命周期：`docs/ai/context-map.md`
- 当前剪贴板与编辑行为：`docs/capabilities/mindmap-editing.md`
- 剪贴板入口及异步上下文守卫：`src/mindmap/interaction/NodeClipboardController.ts`
- 现有内部节点序列化和粘贴入口：`src/mindmap/mindmap.ts`
- History 命令与分发：`src/mindmap/Cmds.ts`、`src/mindmap/Execute.ts`
- 当前 Markdown/Markmap 转换语义：`src/MindMapView.ts`、`src/markmapLib/`
- 构建入口：`package.json` 的 `npm run build`

## Dev Split 结论与代码放置约束

分类：`local cleanup`，不执行核心文件拆分。

扫描确认 `src/mindmap/mindmap.ts` 为 2411 行候选大文件。本任务不得把 Markdown 检测、Transformer 转换或多根粘贴命令实现继续加入该文件。现有 `pasteNode()` 只保留内部 `copyNode` JSON 契约，供剪贴板优先识别及现有拖拽复制调用。

当前 `uuid()` 定义在视图文件，却已被视图、核心执行器、导入器和脑图模型共同依赖。为避免新剪贴板解析模块继续反向依赖 `MindMapView`，实施时做一次受限的所有权修正：将 ID 生成函数移动到具名模块 `src/mindmap/NodeId.ts`，仅更新现有直接导入，不改变 ID 格式。

| 模块 | Owner responsibility | May depend on | Must not own |
|---|---|---|---|
| `src/mindmap/interaction/NodeClipboardController.ts` | 剪贴板读取、识别优先级、活动上下文复核和粘贴编排 | `MindMap`、Markdown 剪贴板解析模块 | Markdown AST 转换、节点树创建、History 状态 |
| `src/mindmap/clipboard/NodeMarkdownPaste.ts` | 校验受支持的 Markdown 剪贴板输入并转换为带新 ID 的 `INodeData[]` 森林 | Markmap Transformer、`INodeData`、`NodeId` | 浏览器剪贴板访问、节点 DOM、History、副作用 |
| `src/mindmap/Cmds.ts` 的新多根粘贴命令 | 原子地添加、撤销和重做节点森林，保存目标原展开状态与插入顺序 | `INode`、`MindMap` | Markdown 识别、系统剪贴板访问 |
| `src/mindmap/Execute.ts` | 将单一执行动作路由到新 History 命令 | `Cmds.ts` | 解析、节点构建策略 |
| `src/mindmap/NodeId.ts` | 生成与现有格式一致的新节点 ID | 无 | Markdown、视图或节点业务逻辑 |
| `src/mindmap/mindmap.ts` | 保持现有内部节点 JSON 复制/粘贴入口及脑图状态 | 新 `NodeId` | 新增 Markdown 解析或多根 History 实现 |

允许的依赖方向为：剪贴板控制器 → 纯解析模块 / `MindMap`；执行器 → History 命令；解析模块 → Markmap / 节点数据类型 / ID 生成。解析模块不得导入 `MindMapView`，History 命令不得读取系统剪贴板。

## 实施步骤

1. `done`：先固化现有粘贴基线和 Markdown 输入矩阵。
   - 记录并验证有效 `copyNode` JSON、标题树、无序列表、有序列表、单行文本、多行普通文本、缩进文本、混合结构和空文本的预期结果。
   - 验证：现有 JSON 粘贴仍只生成一个子树；不支持的文本不改变节点树和 History。

2. `done`：建立独立 ID 与 Markdown 剪贴板解析边界。
   - 将现有 `uuid()` 原样迁移至 `src/mindmap/NodeId.ts` 并更新全部直接导入。
   - 新增 `NodeMarkdownPaste.ts`，先判定输入是否属于支持范围，再用 Transformer 转换并归一化为 `INodeData[]` 森林；所有节点分配新 ID，保留节点 Markdown 文本和子节点顺序。
   - 验证：构建通过；相同结构重复粘贴得到不同 ID；空包装根和普通文本空行不会创建空白节点；带缩进纯文本及结构化 Markdown 混合普通文本返回未处理。

3. `done`：增加原子的多根节点粘贴命令。
   - 在 `Cmds.ts` 新增只负责节点森林插入的命令，在 `Execute.ts` 增加唯一分发动作。
   - 命令按目标当前子节点尾部顺序插入所有顶层根，保存目标原展开状态、创建的根节点和插入位置；执行后刷新布局并保持目标选中。
   - 撤销一次移除全部新根并恢复目标粘贴前的展开状态；重做一次按原顺序恢复同一批节点，避免重复生成 ID。
   - 验证：多顶层和多层嵌套内容均可一次撤销/重做；连续粘贴互不干扰；折叠目标的撤销恢复原折叠状态。

4. `done`：接入现有剪贴板状态机。
   - `pasteToSelectedNode()` 在异步上下文复核后先调用现有内部 JSON 粘贴；仅当其未处理时才解析 Markdown 并执行多根粘贴。
   - 保留快捷键消费规则、多选拒绝、编辑态放行和命令面板的同一入口。
   - 验证：内部 JSON 优先级不变；切换 leaf、切换节点或进入编辑态后，延迟返回的剪贴板内容不会落入旧上下文；编辑态普通文本粘贴保持原生行为。

5. `done`：完成文档、构建和 Obsidian 手工回归。
   - 更新 `docs/capabilities/mindmap-editing.md` 的当前行为、事实来源和验证要求，并在 `CHANGELOG.md` 的 `Added` 段记录功能。
   - 运行 `npm run build`，不声明被跳过的自动化测试。
   - 在授权测试 Vault 中验证 Windows/Linux 的 `Ctrl+V`、macOS 语义对应的 `Cmd+V`、命令面板粘贴、Markdown/脑图视图往返、关闭重开、连续粘贴以及一次撤销/重做。

## 当前验证状态

- `npm run build` 已通过；未新增 TypeScript 警告，构建仍报告仓库既有的 `WorkspaceLeaf.id`、XMind 隐式 `any` 和 sourcemap 警告。
- 使用实际 `NodeMarkdownPaste.ts` 转译代码和内置 Markmap 浏览器包验证了无序列表、有序列表、标题树、单根标题、单行文本、多行普通文本、空行忽略、纯缩进拒绝、标题混合段落拒绝、列表混合段落拒绝及重复粘贴新 ID。
- 用户已在授权测试 Vault 中确认结构化 Markdown 与多行普通文本粘贴可用，并确认动态节点的底部连线会按最终文本宽度自动对齐，无需折叠后重新展开。

## 验证矩阵

| 输入/场景 | 预期 |
|---|---|
| `- b`、其下嵌套 `- d`，再同级 `- c` | 目标下生成 `b`、`c`，`d` 为 `b` 子节点 |
| 等价的有序列表 | 保持相同层级和顺序，不把序号写成额外节点 |
| `## b`、`### d`、`## c` | 目标下生成 `b`、`c`，`d` 为 `b` 子节点 |
| `# x`、`## b`、`## c` | 目标下只新增顶层 `x`，其下为 `b`、`c` |
| 单行 `b` | 目标下新增一个 `b` |
| 普通文本 `a`、`b`、`c` 各占一行 | 目标下依次新增同级节点 `a`、`b`、`c` |
| 普通文本行之间包含空行 | 忽略空行，只为非空行新增同级节点 |
| `b`、缩进 `d`、同级 `c`，无列表/标题标记 | 不插入，不改变 History |
| 标题或列表中混入无标记普通文本 | 整体不插入，不丢弃或猜测部分内容 |
| 有效 `copyNode` JSON | 完全走现有内部节点粘贴语义 |
| 已折叠目标 | 粘贴后展开；撤销恢复折叠；重做再次展开并恢复节点 |
| 重复粘贴同一 Markdown | 每次生成独立 ID，顺序稳定 |
| 粘贴读取期间切换节点或 leaf | 不向旧节点或新节点后台插入 |
| 编辑态或多选态 | 编辑态走原生粘贴；多选态不执行单节点粘贴 |

## 风险与控制

- Markmap 对普通段落也可能产生树结构：必须先进行支持范围判定，不能仅凭 Transformer 返回子节点就接受。
- 现有 `PasteNode` 只记录首个根节点：Markdown 森林必须使用独立命令，不能循环调用旧命令，否则撤销粒度和展开状态会错误。
- `uuid()` 当前反向依赖视图模块：只迁移函数和直接导入，保持实现与输出格式不变，并用生产构建防止循环依赖或遗漏。
- 节点渲染和布局是异步的：命令只复用现有 `INode`、`addNode()`、刷新和选择路径，不新增第二套 DOM 构建流程。
- 动态节点的初次布局必须等待基础 Markdown 渲染完成事件重新测量，并通过现有动画帧合并器刷新，避免底部连线保留渲染前宽度。
- Markdown 内联格式可能被 Transformer 规范化：手工验证加粗、斜体、链接等节点文本可在 Markdown/脑图往返后保持现有语义。

## 验收标准

- 选中节点 `a` 粘贴同级 `b`、`c` 及 `b` 的子项 `d` 后，得到 `a-b`、`a-c`、`a-b-d`。
- 标题、无序列表、有序列表以及单行和多行普通文本均按验证矩阵工作；纯缩进文本和结构化 Markdown 混合普通文本不会误建节点。
- 内部节点 JSON 复制、拖拽复制、连续粘贴及剪切行为无回归。
- 整片 Markdown 节点森林只占一条 History，一次撤销和一次重做完整生效。
- 新节点 ID 无碰撞复用，目标展开与选择状态符合已确认语义。
- 粘贴节点的文本渲染完成后，底部连线自动与最终文本宽度对齐，不需要折叠后重新展开。
- `npm run build` 成功，授权测试 Vault 的回归项全部实际执行并记录结果。

## 产物路由与收尾

- 活跃计划：本文件。
- 能力事实：实施后更新 `docs/capabilities/mindmap-editing.md`。
- 变更日志：实施后更新 `CHANGELOG.md`。
- 自动化测试：仓库当前无测试脚本；本任务不引入测试框架，以纯解析边界、生产构建和明确手工矩阵验证。
- ADR：`not_required`。
- 设计系统：`none`，不新增 UI 组件或视觉规则。
- `docs/ai/context-map.md`：若新增 `clipboard/` owner 目录成为稳定入口，则实施收尾时补充路由；否则不改。
- 实施完成后使用 `dev-distill` 关闭并归档本计划；文档路由变化时再运行 `dev-check`。
- 推荐通过 `dev-branch` 在独立分支实施、验证和评审。
