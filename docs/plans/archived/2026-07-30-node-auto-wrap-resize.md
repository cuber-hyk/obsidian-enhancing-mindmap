---
artifact_type: plan
status: archived
created: 2026-07-30
updated: 2026-07-30
owner: codex
---

# 节点宽度与分层换行

## Goal

普通文本节点可拖拽右侧手柄调整并持久化宽度；用户手动换行与宽度导致的自动换行分层处理，编辑态与阅读态保持同一换行效果。

## Scope

- 仅普通文本节点支持右侧宽度手柄。拖动按当前脑图缩放换算，期间以 CSS 宽度实时重排文本、刷新节点盒子和连线。
- 节点 Markdown 末尾使用标准 HTML 注释 `<!-- enhancing-mindmap:width=480 -->` 持久化拖拽宽度；阅读态、脑图节点正文和节点编辑态均不显示该注释。
- 手动换行保留为 Markdown `<br>`；编辑态把它物化为真正的 `HTMLBRElement`，保存时再序列化为 `<br>`。
- 宽度变化只影响浏览器自动换行，绝不增加、删除或重排正文中的 `<br>`。
- 支持撤销/重做、复制节点、Markdown/脑图往返、取消拖拽、节点销毁与深浅主题验证。

## Non-goals

- 不使用零宽 Unicode 字符、frontmatter 宽度映射或第二份节点内容数据源。
- 不改变表格、代码、图片和含链接附件节点的宽度及编辑行为。
- 不为原始 Markdown 源码视图隐藏 HTML 注释；仅脑图渲染与节点编辑态隐藏它。

## Assumptions And Decisions

- 用户确认以 HTML 注释而非不可见 Unicode 字符保存宽度；宽度与节点 Markdown 同步、复制时随节点带走。
- 用户确认手动 `<br>` 与自动换行是两类语义：前者始终保留，后者只由 CSS 和当前宽度即时计算。
- 用户确认编辑态应显示真实换行，不显示 `<br>` 字面文本，也不得因模式切换改变节点有效宽度。
- 注释格式固定为 `<!-- enhancing-mindmap:width=<integer> -->`，且只接受节点 Markdown 末尾的单个合法标记；损坏或重复标记不影响正文渲染，保存时归一化为一个标记。
- ADR gate: not needed；节点 Markdown 仍是唯一事实来源，注释只是其内联、可审阅的展示元数据。

## Fact Sources

- `CONTEXT.md`：节点 Markdown 是唯一事实来源。
- `src/mindmap/INode.ts`：节点阅读/编辑渲染、编辑内容序列化、历史提交和布局刷新。
- `src/mindmap/wrap/NodeAutoWrapController.ts`：宽度手柄、Pointer 拖拽与临时布局预览。
- `src/mindmap/wrap/NodeAutoWrapMarkdown.ts`：当前错误的 `<br>` 归一化与重排逻辑，必须以宽度元数据解析/写入替换。
- `DESIGN.md`、`docs/capabilities/mindmap-editing.md`、`styles.css`：节点编辑与紧凑上下文控件合同。

## Split Guidance

- Classification: defer for `src/mindmap/INode.ts`; 它虽为 1532 行候选大文件，但编辑 DOM 与节点生命周期仍紧密耦合，本任务只允许局部接线，不做机械拆分。
- Owner modules: `NodeAutoWrapController.ts` 只管理拖拽会话和临时 CSS；`NodeAutoWrapMarkdown.ts` 改为只管理宽度注释的解析、剥离和写回。
- Do not add behavior to: `src/mindmap/INode.ts`，除读取/写入宽度的窄接线、`<br>` DOM 序列化及布局刷新外，不加入 Pointer、注释解析或宽度策略。
- Side effects: Pointer Capture、临时样式和清理由控制器拥有；Markdown 修改与 History 仍由 `INode` / `MindMap` 拥有。

| Module | Owner responsibility | May depend on | Must not own |
|---|---|---|---|
| `src/mindmap/wrap/NodeAutoWrapController.ts` | 手柄、拖拽、实时 CSS 宽度预览 | DOM、缩放比例、窄回调 | Markdown 解析、History、节点内容渲染 |
| `src/mindmap/wrap/NodeAutoWrapMarkdown.ts` | 宽度 HTML 注释的读取、剥离、归一化和写回 | 纯字符串逻辑 | DOM、Pointer、布局、History |
| `src/mindmap/INode.ts` | 控制器接线、阅读/编辑态内容渲染和一次文本提交 | wrap 模块、现有节点服务 | 宽度策略、拖拽状态机 |

## Steps And Verification

| ID | Status | Step | Verification |
|---|---|---|---|
| WIDTH-BASELINE-1 | done | 用普通文本、手动 `<br>`、格式标记及不支持内容建立基线，并确认当前自动写入 `<br>` 会造成放宽和编辑态跳变。 | 用户已在测试 Vault 验收手动换行、自动换行、编辑态和拖拽行为。 |
| WIDTH-METADATA-1 | done | 将自动重排逻辑替换为纯函数的注释读取、正文剥离和尾部宽度写回；移除自动 `<br>` 生成。 | 构建通过；待测试 Vault 覆盖合法/缺失/重复/损坏注释。 |
| WIDTH-CONTROLLER-1 | done | 控制器拖动期间固定临时 CSS 宽度并实时刷新布局；松开只提交目标宽度，取消及销毁清理全部临时样式。 | 构建通过；待测试 Vault 验证左右双向连续预览及取消清理。 |
| WIDTH-EDITING-1 | done | 阅读和编辑内容转换识别 `<br>` 为真实 DOM 换行，序列化时恢复 `<br>`，并在两态剥离/保留宽度注释。 | 构建通过；待测试 Vault 验证模式切换、`Shift+Enter` 和撤销/重做。 |
| WIDTH-INTEGRATION-1 | done | 将宽度提交接入一条 `ChangeNodeText` 历史命令，阅读态按保存宽度应用 CSS；未设置宽度的旧节点维持默认行为。 | 构建通过；待测试 Vault 验证重开、往返和节点复制。 |
| WIDTH-VERIFY-1 | done | 更新样式和能力文档，运行构建与完整手工回归。 | `npm run build` 通过（仅既有警告）；用户已在测试 Vault 验收。 |

## Risks And Mitigations

- 注释被当作正文或被编辑时删除：统一通过元数据纯函数剥离/写回，节点编辑 DOM 不创建注释文本节点。
- `<br>` 在编辑态丢失：显式处理 `HTMLBRElement`，不依赖 `innerText` 推断。
- 宽度未应用到阅读态：解析节点 Markdown 后立即恢复 CSS 宽度并刷新盒模型。
- 拖拽与画布手势冲突：手柄阻止冒泡、Pointer Capture，并在所有结束路径清理。

## Acceptance Criteria

- 用户手动换行在任意宽度、拖拽和编辑态切换中都保持原位置。
- 自动换行随拖拽宽度双向实时变化，不再写入或修改 `<br>`。
- 每个已调整节点只保存一个不可见的 HTML 宽度注释；重开与复制节点后宽度保持。
- 编辑态不显示 `<br>` 或宽度注释，且进入编辑态不发生边框宽度跳变。
- 表格、代码、图片和含链接附件节点不受影响。

## Artifact Routing

- Plan: 已归档至 `docs/plans/archived/`。
- Design system: update；记录选中节点的隐藏式右侧手柄及手动/自动换行分层规则。
- Capability docs: update `docs/capabilities/mindmap-editing.md`。
- Changelog: needed；这是用户可见的编辑和布局行为改变。
- Tests: 当前无自动化测试框架；宽度元数据纯函数需具备可执行最小验证，并以 Vault 手工矩阵覆盖交互。
- Distill and check: needed；实施完成后执行生命周期与文档门禁。
