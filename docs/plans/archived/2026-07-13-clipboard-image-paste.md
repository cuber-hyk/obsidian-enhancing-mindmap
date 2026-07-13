---
artifact_type: plan
status: archived
created: 2026-07-13
updated: 2026-07-13
owner: agent
plan_readiness: ready
source_audit: "docs/audits/archived/2026-07-13-clipboard-image-paste-audit.md"
covered_findings:
  - IMG-PASTE-1
  - IMG-PASTE-2
  - IMG-PASTE-3
  - IMG-PASTE-4
deferred_findings: []
---

# 节点剪贴板图片持久化修复计划

## 目标

在节点编辑态粘贴剪贴板图片时，将第一张受支持的图片保存为 Vault 附件并在原光标位置写入节点 Markdown，使其退出编辑态、切换视图和重新加载后仍能正常显示。

## 范围

- 范围内：编辑会话内的图片粘贴监听；第一张剪贴板 `image/*` 文件/Blob；安全默认文件名；Vault 附件写入；光标位置保存；编辑会话校验；错误提示；编辑态与阅读态往返验证。
- 范围外：仅存在于 HTML 或 URL 中的远程图片下载；一次粘贴多张图片；图片压缩或格式转换；自动删除已写入但未引用的附件；附件文件的撤销/重做；阅读态渲染器重构。

## 计划就绪检查

- 目标明确：是；修复“编辑态可见、退出后消失”，结果可由附件、节点 Markdown 和重新渲染共同验证。
- 范围明确：是；只接管第一张有实际二进制数据的剪贴板图片，不扩展远程图片或多图语义。
- 事实来源已知：是；节点 Markdown 是唯一事实来源，图片附件由 Obsidian Vault 管理。
- 关键决策已确认：是；用户于 2026-07-13 确认剪贴板范围、会话失效和附件保留策略。
- 验证路径已知：是；生产构建加测试 Vault 手动验证矩阵。

## 假设与决策

- 节点图片必须先写入 Vault，再以 Vault 图片 Markdown 进入 `INode.data.text`；不保存浏览器粘贴产生的临时 HTML。
- 剪贴板含有图片二进制以及文本/HTML 表示时，将该操作视为图片粘贴，只插入第一张受支持图片，避免同一内容重复插入。
- 剪贴板没有 `image/*` 文件项时不调用 `preventDefault()`，保持现有文本和 HTML 粘贴行为。
- 剪贴板图片使用现有可导入格式集合；依据 MIME 类型生成带时间标识和正确扩展名的默认文件名，再由 `getAvailablePathForAttachment()` 解决路径和重名。
- 每次异步粘贴使用独立的 `NodeMarkdownInsertion` 保存 Range，同时保留开始粘贴时的编辑会话对象作为身份令牌。完成后只有原会话仍有效才插入，避免退出后重新编辑同一节点时误插入。
- 附件写入后若原编辑会话已失效，不向任何节点插入，也不自动删除附件；沿用现有本地图片导入行为，以 Notice 显示已导入附件路径。
- 不修改 `INode.getEditedContentMarkdown()` 去兼容任意 `<img>`。该兜底会把临时 DOM 或远程资源变成隐式数据源，并形成第二条图片保存路线。

## 已检查的决策点

| 决策 | 已选路线 | 确认者 | ADR 门禁 |
|---|---|---|---|
| 剪贴板图片支持范围 | 第一张实际 `image/*` 文件/Blob；不下载仅有 HTML/URL 的远程图片 | 用户 | 不需要；局部交互范围 |
| 编辑会话失效后的插入 | 不跨节点或跨编辑会话插入 | 用户 | 不需要；沿用现有会话边界 |
| 已落盘但未插入的附件 | 保留附件并提示路径，不自动删除 | 用户 | 不需要；沿用现有本地图片导入行为 |
| 节点图片事实来源 | Vault 附件和节点 Markdown，拒绝临时 DOM 兜底 | 代码与现有能力文档 | 不需要；未改变架构 |

## 拆分与代码放置约束

- `dev-split`：不需要。
- 分类：无需拆分；这是两个现有职责模块内的局部增量。
- `src/mindmap/insert/NodeInsertController.ts` 负责编辑会话生命周期、`paste` 事件、Range 快照、异步会话校验和插入刷新；剪贴板图片完成后只替换本次插入节点并刷新布局，不重建整个编辑 DOM。
- `src/mindmap/insert/AttachmentImporter.ts` 负责 MIME 到可导入扩展名、剪贴板默认文件名和 Vault 二进制落盘，继续复用现有 `importLocalImage()` 的验证与路径规则。
- `src/mindmap/insert/NodeMarkdownInsertion.ts` 只增加 Range 可用性检查和返回已插入文本节点，供异步粘贴在失效时明确中止，并将有效插入原位替换为现有图片编辑控件。
- 不向 `INode.ts` 添加剪贴板分支，不新建通用 `utils/helpers`，不改 `src/markmapLib/`。
- 若实施时发现必须修改节点序列化模型或引入跨模块共享状态，则停止并重新运行 `dev-split`/计划确认，而不是在当前计划内扩张。

## 步骤与验证

步骤状态只允许 `todo`、`done`、`blocked`。

| ID | Status | 步骤 | 验证 |
|---|---|---|---|
| PLAN-1 | done | 在测试 Vault 复现当前问题，确认粘贴图片退出编辑态后未进入节点 Markdown且没有对应的新附件；记录该来源是否提供 `clipboardData` 图片文件项。 | 用户复现旧行为；修复版系统截图粘贴生成 Vault 附件和 Markdown 嵌入，证明该来源提供可读取的图片文件项。 |
| PLAN-2 | done | 在 `AttachmentImporter.ts` 增加剪贴板图片导入入口：仅接受现有支持的 MIME 类型，生成安全且带正确扩展名的默认文件名，并复用现有附件路径与二进制写入流程。 | `npm run build` 通过；已核对 PNG/JPEG/GIF/WebP/BMP/AVIF 映射、非法 MIME 拒绝及 `getAvailablePathForAttachment()` 重名路径。 |
| PLAN-3 | done | 在 `NodeInsertController` 的 `beginEdit()`/`endEdit()` 中成对管理 `paste` 监听；识别第一张图片文件，阻止原生临时 `<img>`，为本次操作创建独立 Range 快照并异步导入。没有图片文件时保持浏览器默认粘贴。 | 静态检查确认监听成对管理；用户确认系统截图与纯文本粘贴通过，没有发生重复或原生临时图片丢失。 |
| PLAN-4 | done | 导入成功后以原编辑会话身份校验插入资格：有效时生成 Vault 图片 Markdown、插入到捕获位置并刷新编辑节点；失效时保留附件并显示现有“图片已导入，但无法插入节点”提示及路径；失败时使用现有错误提示并恢复会话光标。 | 独立评审验证会话对象和 Range 门禁；用户确认连续粘贴、立即退出和切换节点通过，Vault 中保留的一个未引用附件符合已确认策略。 |
| PLAN-5 | done | 运行生产构建并在测试 Vault 完成图片往返和回归矩阵，记录所有未验证或失败项，不将跳过项报告为通过。 | `npm run build` 成功；用户确认编辑态→阅读态→再次编辑、Markdown/脑图切换、重新加载、连续粘贴、会话切换及纯文本粘贴通过。未单独验证仅 HTML/URL 的远程图片来源，按已确认范围外处理。 |
| PLAN-6 | done | 更新用户可见能力说明和 CHANGELOG，回填来源审计的 finding 状态、验证证据及分支/提交信息；运行 Dev Flow distill/check 门禁。 | 已更新能力文档和 `[Unreleased]/Fixed`；审计已闭环；`git diff --check` 与 Dev Flow `validate-docs` 通过。 |

## 验收标准

- 在节点编辑态粘贴受支持的剪贴板图片后，Vault 中生成遵循当前附件目录设置且不覆盖已有文件的附件。
- 图片 Markdown 插入到粘贴时的光标位置，编辑态立即显示为现有可调整尺寸的图片节点。
- 退出编辑态、再次编辑、Markdown/脑图视图切换和重新加载 Obsidian 后图片仍显示。
- 节点 Markdown 包含 Vault 图片嵌入，不依赖 `data:`、`blob:` URL 或临时 `<img>` DOM。
- 纯文本粘贴行为不变；含实际图片的混合剪贴板不重复插入文本/HTML 和图片。
- 导入期间退出或切换节点不会插入到错误节点；已落盘附件被保留并通过 Notice 告知路径。
- 不支持的图片类型和写入失败会明确提示，不静默丢失或伪报成功。
- `npm run build` 通过，手动回归没有跳过且无阻断问题。

## 风险与控制

- 剪贴板 payload 因操作系统和来源应用不同而变化：只以实际 `image/*` 文件项作为确定入口，并按来源记录手动验证结果。
- 异步导入可能跨越编辑会话：同时校验节点、会话对象身份和 `node.data.isEdit`，不只按节点对象判断。
- 共享 Range 会被其他操作覆盖：每次粘贴创建独立插入对象，避免复用工具栏会话的可变 Range。
- 浏览器复制图片可能只提供远程 HTML：本次不隐式下载；该场景按范围外结果如实说明。

## 产物路由

- 能力文档更新：已更新 `docs/capabilities/mindmap-editing.md` 的图片插入行为。
- 审计输出：已更新并归档至 `docs/audits/archived/2026-07-13-clipboard-image-paste-audit.md`；发现保留在审计文件，不复制到能力文档。
- 来源审计：`docs/audits/archived/2026-07-13-clipboard-image-paste-audit.md`
- 覆盖发现：`IMG-PASTE-1`、`IMG-PASTE-2`、`IMG-PASTE-3`、`IMG-PASTE-4`
- 延后发现：无；HTML/URL 远程图片和多图粘贴是已确认的范围外需求，不是本审计发现的遗留修复。
- DESIGN/设计系统：无影响；复用现有图片编辑节点和 Notice，不建立新的 UI 模式。
- `docs/ai/context-map.md`：预计不更新；现有任务路由已指向 `insert/` 和 `image/`。
- Changelog：需要；这是用户可见的图片粘贴缺陷修复。
- Distill：需要；用于回填能力事实、审计和计划生命周期并执行 ADR 门禁。
- ADR 门禁：`not needed`；沿用现有节点 Markdown 和 Vault 附件事实来源，没有新的架构选择。
- 测试：仓库没有自动化测试框架；执行 `npm run build` 和测试 Vault 手动矩阵，不为本次局部修复引入测试基础设施。

## Git 可见性

- 创建本文件后运行 `git status --short --branch --untracked-files=all`。
- 若文件被忽略，添加最小允许规则，或明确报告计划未被跟踪。

## 关闭方式

执行 `dev-distill` 时选择一种最终操作：

- 归档：计划具有追溯价值时，将其移至 `docs/plans/archived/` 并设置 `status: archived`。
- 删除：计划没有独立的后续价值时删除。

仅当所有未延后步骤均为 `done`、没有 `blocked` 步骤、验证已有记录且关联审计已更新时，才可关闭计划。

不得使用 `completed` 或 `superseded` 作为最终状态。
