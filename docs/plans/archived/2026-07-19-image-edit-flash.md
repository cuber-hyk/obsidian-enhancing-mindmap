---
artifact_type: plan
status: archived
created: 2026-07-19
updated: 2026-07-19
owner: agent
plan_readiness: ready
source_audit: docs/audits/2026-07-19-image-edit-flash-audit.md
covered_findings: [IMAGE-FLASH-1, IMAGE-FLASH-2, IMAGE-FLASH-3]
deferred_findings: []
---

# 消除节点图片编辑态 Markdown 闪现

## 目标

在节点编辑态插入或保存图片时不出现任何可见的原始图片 Markdown、宽度数字或上下跳动，同时保持现有 Markdown 保存格式和选区行为。

## 范围

- 范围内：剪贴板粘贴、选择 Vault 图片、导入本地图片三条图片插入路径；编辑态图片 Markdown 往返与图片加载后的布局；阅读态图片嵌入的离屏渲染与原子替换；测试 Vault 验证。
- 范围外：更改图片 Markdown 格式、默认尺寸，以及图片预览/缩放/删除交互。

## 计划就绪检查

- 目标明确：是，消除可见 Markdown 中间态。
- 范围明确：是，仅处理图片插入，不扩展图片渲染架构。
- 事实来源已知：是，插入 Range、图片组件创建和 Markdown 序列化入口均已定位。
- 关键决策已确认：是，采用直接 DOM 插入，保存时沿用现有从图片组件生成 Markdown 的单一事实来源。
- 验证路径已知：是，`npm run build` 加测试 Vault 的三种插入路径与 Markdown 往返检查。

## 假设与决策

- 节点 Markdown 继续是唯一持久化事实来源；编辑态图片控件仅是临时 DOM 表示。
- 在 `NodeMarkdownInsertion` 增加插入任意 DOM 节点的最小能力，避免为图片引入第二套选区处理。
- 图片插入统一创建已有的 `Node.createEditableImage()`，不新建视觉组件、CSS 规则或图片格式。
- `IMAGE-FLASH-2`：节点保存后的阅读态渲染会短暂显示 Obsidian 内嵌图片的宽度文本；在离屏容器完成嵌入转换、图片解码和尺寸预留后，再一次性替换可见节点内容。
- `IMAGE-FLASH-3`：编辑态图片必须在解码并取得固有宽高后才插入可见编辑器；阅读态和编辑态使用相同的文本基线对齐规则。

## 已检查的决策点

| 决策 | 已选路线 | 确认者 | ADR 门禁 |
|---|---|---|---|
| 消除图片插入的中间态 | Range 直接插入现有图片控件；保存时由现有序列化逻辑写回 Markdown | 用户请求修复计划；代码事实支持 | not needed |
| 阅读态图片宽度占位 | 在离屏容器中完成 `.internal-embed` 转换和图片解码，再原子替换可见内容 | 用户视频、浏览器图片解码规范与代码事实 | not needed |
| 编辑态图片加载后的节点位置 | 预解码后写入宽高，再插入编辑器；阅读态嵌入使用相同对齐规则 | 用户截图与浏览器布局规则 | not needed |

## 步骤与验证

| ID | Status | 步骤 | 验证 |
|---|---|---|---|
| PLAN-1 | done | 在 `src/mindmap/insert/NodeMarkdownInsertion.ts` 增加基于已捕获 Range 的 DOM 节点插入方法：替换当前选区、将光标收拢到节点后并恢复焦点。保留文本插入 API 给链接等现有调用方。 | 静态检查确认仅图片路径调用新 API；`npm run build` 通过。 |
| PLAN-2 | done | 在 `src/mindmap/insert/NodeInsertController.ts` 收敛三条图片插入路径：由 Vault 图片 Markdown 解析出图片数据，直接插入 `node.createEditableImage()`，随后只刷新布局，不先写入可见 Markdown 文本。 | 静态检查确认三条图片路径均不再调用 `insert(markdown)` 或 `refreshEditText()`；`npm run build` 通过。 |
| PLAN-3 | done | 在离屏容器完成阅读态图片嵌入替换、预解码与尺寸预留；编辑态图片预解码后再插入，并统一两态图片的垂直对齐；在测试 Vault 验证图片插入、保存、重新打开、撤销/重做、文本中间插入和连续粘贴。 | 用户在 `LLM` 测试 Vault 验证后确认可收尾；`main.js` 与 `styles.css` 已同步，编辑态、阅读态图片位置和宽度占位问题关闭。 |
| PLAN-4 | done | 更新能力文档与来源审计：记录直接图片控件插入和阅读态即时图片替换的事实，关闭两个发现。随后由 `dev-distill` 决定归档。 | 能力文档与审计已回填当前行为和验证证据；本计划与审计已按生命周期归档。 |

## 验收标准

- 在编辑节点内粘贴、选择或导入图片时，界面不显示 `![[...]]`、文件路径或默认宽度数字。
- 图片插入仍替换当前选区，插入后编辑焦点与后续文本输入位置正确。
- 保存、重新打开脑图以及 Markdown/脑图视图往返后，图片和其宽度保持正确。
- 外部链接、Vault 非图片文件及既有图片的缩放、预览、删除行为没有回归。
- 插入后保存或退出编辑态时，阅读态也不显示 `320` 等图片尺寸占位文本。
- 编辑态图片不会先以未知高度出现在偏下位置；节点与分支连接位置从首次可见绘制起即稳定。
- 同一图文节点在编辑态和阅读态的文本与图片垂直位置一致。

## 产物路由

- 能力文档更新：实施后更新 `docs/capabilities/mindmap-editing.md` 中图片插入行为。
- 审计输出：更新 `docs/audits/2026-07-19-image-edit-flash-audit.md`。
- 来源审计：`docs/audits/2026-07-19-image-edit-flash-audit.md`。
- 覆盖发现：`IMAGE-FLASH-1`、`IMAGE-FLASH-2`、`IMAGE-FLASH-3`。
- 延后发现：无。
- ADR 门禁：not needed；局部 DOM 插入时序修复，不改变持久化格式或模块边界。
- 测试：`npm run build` 与测试 Vault 手工交互矩阵；仓库暂无自动化测试框架。
- design_system_impact：none；复用已有编辑态图片控件，不引入视觉规则。

## Git 可见性

- 创建本文件后运行 `git status --short --branch --untracked-files=all`。
- 若文件被忽略，添加最小允许规则，或明确报告计划未被跟踪。

## 关闭方式

PLAN-1 至 PLAN-4 均已完成；用户确认测试 Vault 验收后由 `dev-distill` 归档。
