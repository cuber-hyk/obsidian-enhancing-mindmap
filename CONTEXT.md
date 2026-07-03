# obsidian-enhancing-mindmap 上下文

本文件只保存跨模块复用的稳定术语。

## 领域术语

| 术语 | 定义 |
|---|---|
| 脑图文档 | 带有 `mindmap-plugin: basic` frontmatter、可在 Markdown 与脑图视图间切换的 Vault Markdown 文件。 |
| 脑图视图 | `MindMapView` 注册的自定义 `TextFileView`，负责 Markdown、节点数据和画布之间的同步。 |
| 节点 Markdown | 节点 `data.text` 中保存的 Markdown 源文本；它是节点富文本显示的唯一事实来源。 |
| Vault 附件 | 由 Obsidian 管理并按当前附件目录规则存入 Vault 的非 Markdown 文件。 |

## 维护规则

- 只添加跨模块复用的稳定术语。
- 模块行为和事实写入 `docs/capabilities/*.md`。
- 计划、审计和重要决策分别写入 `docs/plans/`、`docs/audits/`、`docs/adr/`。
- 可执行规则优先由测试表达。

## 更新记录

- 2026-07-03：初始化 Dev Flow 术语并补充当前领域词汇。
