---
artifact_type: audit
status: archived
created: 2026-07-13
updated: 2026-07-13
scope: "节点编辑态通过剪贴板粘贴图片后，退出编辑态图片消失"
source_of_truth: code
---

# 节点剪贴板图片持久化审计

## 范围

诊断节点进入编辑态后直接粘贴剪贴板图片时，图片只在编辑态临时可见、退出编辑态后消失的问题。范围包含编辑态 DOM、节点 Markdown 序列化、附件导入、阅读态渲染和异步编辑会话边界；不实施修复，也不扩展远程图片下载、图片压缩或附件撤销功能。

## 事实来源

- 代码：`src/mindmap/INode.ts`、`src/mindmap/insert/NodeInsertController.ts`、`src/mindmap/insert/NodeMarkdownInsertion.ts`、`src/mindmap/insert/AttachmentImporter.ts`、`src/mindmap/image/NodeImageMarkdown.ts`
- 测试：仓库没有自动化测试；使用生产构建、独立静态评审和测试 Vault 手动矩阵验证
- 文档：`CONTEXT.md`、`docs/ai/context-map.md`、`docs/capabilities/mindmap-editing.md`
- 运行时检查：用户先复现“编辑态可见，退出编辑态后消失”，修复后确认约定的五项 Test Vault 矩阵通过；文件系统检查确认附件和节点 Markdown 已持久化

## 发现

发现状态只允许：

- `open`：已确认或证据充分，仍需分派或处理。
- `planned`：已交由计划和后续工作处理。
- `resolved`：已处理，并记录 `fixed`、`accepted_risk`、`wont_fix` 或 `not_reproducible` 等关闭原因。
- `verified`：修复或处置已验证，发现已关闭。

| ID | Severity | Status | Finding | Evidence | Owner Plan | Branch/Commit | Verification | Closeout |
|---|---|---|---|---|---|---|---|---|
| IMG-PASTE-1 | P1 | verified | 节点编辑器没有接管图片粘贴，也没有把剪贴板二进制写入 Vault。浏览器因此只把图片作为临时编辑 DOM 插入，没有生成作为节点数据源的 Markdown。 | `NodeInsertController` 现于编辑会话中接管具有图片文件项的 `paste`；`AttachmentImporter.importClipboardImage()` 将文件写入 Vault 并复用现有附件路径规则。 | `docs/plans/archived/2026-07-13-clipboard-image-paste.md` | `task/20260713-fix-clipboard-image-paste`（待提交） | 用户于 2026-07-13 确认测试矩阵通过；Vault 中生成 4 个 `Pasted image` 附件，节点 Markdown 中存在 3 条对应 Vault 图片嵌入。 | `fixed`；附件落盘与 Markdown 持久化已验证。 |
| IMG-PASTE-2 | P1 | verified | 退出编辑态时，序列化器只识别文本和插件自有的 `.mm-node-image-attachment`；浏览器粘贴产生的普通 `<img>` 或包含 `<img>` 的 HTML 元素会落入 `innerText` 分支并序列化为空，因此图片被静默丢弃。 | 图片文件粘贴现阻止浏览器默认 DOM；导入完成后插入 Vault 图片 Markdown并原位转换为 `.mm-node-image-attachment`，继续由既有序列化器保存。 | `docs/plans/archived/2026-07-13-clipboard-image-paste.md` | `task/20260713-fix-clipboard-image-paste`（待提交） | 用户确认退出和重新进入编辑态、Markdown/脑图切换及重新加载后图片仍显示。 | `fixed`；编辑/阅读往返已验证。 |
| IMG-PASTE-3 | P2 | verified | 图片落盘是异步操作。若不复用现有编辑会话和 Range 校验，用户在导入完成前移动光标或退出编辑态时，可能出现插入位置错误、提示失败或已创建但未引用的附件。 | 每次粘贴使用独立 `NodeMarkdownInsertion`；完成时校验原会话对象和 Range 可用性。有效插入只刷新布局，不重建编辑 DOM；失效时保留附件并提示路径。 | `docs/plans/archived/2026-07-13-clipboard-image-paste.md` | `task/20260713-fix-clipboard-image-paste`（待提交） | 独立评审确认初版并发 Range 缺陷并已修复；用户确认连续粘贴及立即退出/切换节点测试通过；Vault 中一个未引用附件与已确认的会话失效保留策略一致。 | `fixed`；并发 Range 与会话失效行为已验证。 |
| IMG-PASTE-4 | P3 | resolved | 剪贴板来源存在兼容边界：系统截图通常提供 `image/*` Blob，浏览器复制图片可能同时或仅提供 HTML/URL；当前缺少明确支持范围和验证矩阵。 | 已确认只处理 `clipboardData.items` 中第一张实际 `image/*` 文件；没有图片文件时保持默认粘贴，不隐式下载仅 HTML/URL 远程图片；MIME 集合与现有本地导入一致。 | `docs/plans/archived/2026-07-13-clipboard-image-paste.md` | `task/20260713-fix-clipboard-image-paste`（待提交） | 用户确认系统截图与纯文本粘贴通过；不同浏览器或应用只提供 HTML/URL 的 payload 未逐项验证。 | `accepted_risk`；支持契约按是否提供实际图片文件定义，来源应用差异不作为本次兼容承诺。 |

存在 `open`、`planned`，或没有明确关闭原因且仍需验证的 `resolved` 发现时，不得归档审计。

## 根因结论

阅读态图片渲染链路本身可工作：节点 Markdown 通过 `MarkdownRenderer.renderMarkdown()` 渲染，插件提供的两种图片插入方式也会先生成 Vault 图片 Markdown。问题发生在更早的“剪贴板图片进入数据模型”阶段：原生 `contenteditable` 粘贴只改变临时 DOM，而节点的唯一数据源仍是 `INode.data.text`。退出编辑态时，临时图片没有可序列化的 Vault 路径，因此被保存器忽略。

## 推荐修复方向

1. 由 `NodeInsertController` 在 `beginEdit()`/`endEdit()` 生命周期内注册和移除节点 `paste` 监听，只接管包含受支持 `image/*` 文件项的粘贴；纯文本粘贴继续交给浏览器现有行为。
2. 抽取一个职责明确的剪贴板图片导入函数，复用 `AttachmentImporter` 的 Vault 附件路径与二进制写入规则。剪贴板 Blob 常没有可靠文件名，需要按 MIME 类型生成安全且可读的默认文件名，再交给 `getAvailablePathForAttachment()` 处理冲突。
3. 在阻止原生图片 DOM 插入前捕获独立 Range；附件写入成功且编辑会话和 Range 仍有效时，在原光标位置插入 Markdown并原位替换为插件自有图片包装节点，只刷新布局，避免重建 DOM 使其他异步 Range 失效。
4. 写入失败时显示明确 Notice 并恢复光标；写入完成后若编辑会话或 Range 已失效，不向其他位置插入。已落盘附件按确认策略保留，并通过 Notice 提示路径。
5. 第一阶段建议明确支持剪贴板直接提供的 `image/*` 文件/Blob。仅有远程 HTML `<img>` 或 URL、没有图片二进制的剪贴板内容不应在本次隐式下载，避免引入网络、安全和资源生命周期问题。

## ADR 门禁

- 是否需要：`no`
- 原因：修复沿用现有“Vault 附件 + 节点 Markdown 为唯一数据源”的架构，不引入新的长期架构决策。

## 验证

- 已运行命令：`npm run build`、`npx tsc --noEmit --pretty false`、`git diff --check`、Dev Flow `validate-docs`、源码与生成产物搜索、测试 Vault 附件及 Markdown 检查。
- 构建结果：生产构建成功；仓库级 `tsc --noEmit` 仍被既有 Obsidian/Markmap 声明、`WorkspaceLeaf.id` 和 XMind 隐式 `any` 问题阻断，本次改动没有新增相关诊断。
- 运行时结果：用户于 2026-07-13 确认以下测试矩阵通过；不同来源应用仅提供 HTML/URL 的行为按已确认范围外处理。

已确认验证：

- 系统截图在节点文字中间粘贴后，编辑态立即显示，退出再进入仍显示；Markdown/脑图切换和重新加载后仍显示。
- 快速连续粘贴两张截图，两张均保留且未插入错误节点。
- 纯文本粘贴行为不变。
- 粘贴图片后立即退出或切换节点，不跨编辑会话插入；已落盘附件按确认策略保留。
- Vault 中存在 4 个按 MIME 和时间生成的 `Pasted image` 附件，节点 Markdown 中存在 3 条对应 Vault 图片嵌入；差额与立即退出测试的附件保留策略一致。
- `npm run build`、`git diff --check` 和 Dev Flow `validate-docs` 通过。

未单独验证：不同浏览器或应用仅提供 HTML/URL 的剪贴板 payload、节点增删/拖放等未触及控制器的泛化回归；前者按确认范围外和 `accepted_risk` 关闭，后者未写作已通过。

## Git 可见性

- 创建本文件后运行 `git status --short --branch --untracked-files=all`。
- 若文件被忽略，添加最小允许规则，或明确报告审计未被跟踪。

## 关闭方式

执行 `dev-distill` 时选择一种最终操作：

- 保持活跃：仍有 `open`、`planned`，或没有明确关闭原因且仍需验证的 `resolved` 发现时，保留 `status: active`。
- 归档：所有发现均为 `verified`，或以 `accepted_risk`、`wont_fix`、`not_reproducible` 关闭，或已完整转入活跃计划后，设置 `status: archived` 并移至 `docs/audits/archived/`。
- 删除：稳定结论已由其他文档承载、所有发现均已关闭或转移，且原始证据无后续价值时删除。

不得使用 `distilled` 作为最终状态。
