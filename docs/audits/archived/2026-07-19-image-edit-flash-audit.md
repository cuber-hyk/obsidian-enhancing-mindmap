---
artifact_type: audit
status: archived
created: 2026-07-19
updated: 2026-07-19
scope: "脑图节点图片插入、编辑态加载布局及保存后阅读态渲染时的短暂闪烁"
source_of_truth: code
---

# 节点图片编辑态闪烁审计

## 范围

审查剪贴板粘贴、工具栏选择 Vault 图片和导入本地图片时的编辑态图片插入路径与加载后布局，以及节点保存后阅读态图片嵌入的首次渲染路径。

## 事实来源

- 代码：`src/mindmap/insert/NodeInsertController.ts`、`src/mindmap/insert/NodeMarkdownInsertion.ts`、`src/mindmap/INode.ts`、`src/mindmap/image/NodeImageMarkdown.ts`。
- 测试：仓库没有自动化测试覆盖此编辑器 DOM 插入流程。
- 文档：`docs/capabilities/mindmap-editing.md`。
- 运行时检查：用户录制的 `C:/Users/胡运宽/20260719_183321.mp4` 显示图片插入后保存时短暂出现 `320`。

## 发现

| ID | Severity | Status | Finding | Evidence | Owner Plan | Branch/Commit | Verification | Closeout |
|---|---|---|---|---|---|---|---|---|
| IMAGE-FLASH-1 | P2 | verified | 粘贴图片、选择 Vault 图片和导入本地图片时，流程会先把 `![[图片路径\|320]]` 作为可见文本插入 `contenteditable`，再替换或重渲染为图片组件；浏览器在两次 DOM 变更之间可绘制该文本，导致图片短暂消失并显示宽度数字。 | `NodeMarkdownInsertion.insertNode()` 直接插入图片控件；三条图片路径不再将图片 Markdown 写入可见编辑器。 | `docs/plans/archived/2026-07-19-image-edit-flash.md` | `task/20260719-fix-image-edit-flash`（提交前） | `npm run build` 通过；用户确认 `LLM` 测试 Vault 验收。 | fixed_and_verified |
| IMAGE-FLASH-2 | P2 | verified | 节点保存后，Obsidian 的 `.internal-embed` 会先显示图片宽度 `320`；仅在可见节点中“即时”替换仍会让宿主有一次绘制机会。 | Markdown 渲染、嵌入转换、图片解码和宽高预留都在离屏容器完成，随后原子替换 `contentEl`。 | `docs/plans/archived/2026-07-19-image-edit-flash.md` | `task/20260719-fix-image-edit-flash`（提交前） | `npm run build` 通过；用户确认 `LLM` 测试 Vault 验收。 | fixed_and_verified |
| IMAGE-FLASH-3 | P2 | verified | 编辑态图片插入后先按未加载图片的高度布局，图片加载后节点内容向下扩展，分支连接和图片位置暂时偏下；阅读态和编辑态图片容器的基线规则也不同。 | 编辑态等待 `HTMLImageElement.decode()` 并预留固有比例；阅读态 `.image-embed` 与编辑态控件使用 `vertical-align: baseline`，且最新 `styles.css` 已同步至测试 Vault。 | `docs/plans/archived/2026-07-19-image-edit-flash.md` | `task/20260719-fix-image-edit-flash`（提交前） | `npm run build` 通过；用户确认 `LLM` 测试 Vault 验收。 | fixed_and_verified |

## ADR 门禁

- 是否需要：no
- 原因：这是编辑器插入时序的局部实现修复，不改变对外格式或架构边界。

## 验证

- 已运行命令：`git diff --check`；静态追踪图片 Markdown 的创建、插入、替换和序列化路径。
- 用户已在测试 Vault 完成运行时验收；`main.js` 和 `styles.css` 均已同步。

## Git 可见性

- 已创建后运行 `git status --short --branch --untracked-files=all`。

## 关闭方式

所有发现均已验证关闭，保留本审计作为实现与验收证据。
