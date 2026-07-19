---
artifact_type: plan
status: archived
created: 2026-07-19
updated: 2026-07-19
owner: Codex
plan_readiness: ready
source_audit: docs/audits/archived/2026-07-18-mindmap-style-management-audit.md
covered_findings: [STYLE-1, STYLE-2]
deferred_findings: []
---

# 脑图样式模板

## Goal

为每张脑图提供可从标题栏选择、保存到 Markdown frontmatter、重新打开后保持一致的样式模板，并以固定调色板替代运行时随机颜色。

## Scope

- In scope:
  - 提供“经典蓝、薄荷清新、珊瑚活力、紫夜商务、墨色单彩、森林手账”六个内置模板；每个模板集中定义分支调色板、画布背景、根节点和一级节点外观、分支线外观。
  - 在脑图视图标题栏添加调色板操作，打开或关闭当前视图内的右侧样式检查器。
  - 使用单列模板卡片，以自然内容高度完整展示名称；悬停或键盘聚焦时临时预览，点击或 `Enter` / `Space` 后立即保存并保持检查器打开。
  - 将当前脑图的模板标识保存到该文件的 frontmatter；读取时优先使用该标识，缺失时使用插件全局默认模板。
  - 在插件设置中选择“新建脑图默认模板”，并使新建脑图写入该模板标识。
  - 删除随机颜色生成和全局 `strokeArray` 配置，使模板成为分支颜色的唯一来源。
  - 修正主题样式应用路径，使模板类与 `styles.css` 的选择器一致，并继续兼容 Obsidian 深浅主题的宿主变量。
- Out of scope:
  - 自定义模板编辑器、模板导入导出、VIP/付费模板、按单节点手动指定颜色。
  - 为每个节点保存永久颜色或新增节点 ID 持久化协议。
  - 修改 Markdown 节点正文、已有脑图结构、导出图片流程或 Obsidian 全局侧栏布局。

## Plan Readiness

- Goal clear: yes.
- Scope clear: yes.
- Source of truth known: yes; 模板选择属于 Markdown frontmatter，运行时样式由集中模板目录和 `MindMap` DOM/SVG 应用链路决定。
- Critical decisions confirmed: yes; 用户确认标题栏调色板入口、按导图保存模板、插件设置只定义新图默认模板，以及当前导图内右侧检查器、悬停临时预览和点击即保存的交互。
- Validation path known: yes; `npm run build` 和隔离测试 Vault 的模板选择、重开、主题与回归检查。

## Assumptions And Decisions

- 采用固定调色板：一级分支按当前顺序循环使用模板调色板，子孙分支继承所属一级分支色；因此重开一致，调整一级分支顺序可能改变其颜色。
- 模板前端显示名称可翻译，持久化值使用稳定英文 ID，例如 `classic-blue`；frontmatter 只保存该 ID，不保存重复的颜色对象。
- frontmatter 是每张脑图模板的唯一事实来源；插件设置的 `defaultStyleTemplate` 仅在文件没有模板标识或创建新脑图时提供默认值。
- 使用 Obsidian 的 frontmatter 写入 API 修改单个字段，不能重建或覆盖用户已有 frontmatter。
- 现有 `strokeArray` 不保留为并行配色路径；未识别的旧配置被忽略，缺少或无效模板 ID 回退至默认模板。
- 样式检查器是当前 `MindMapView` 的局部 UI，不注册 Obsidian 全局侧栏；切换文件或关闭导图视图时销毁检查器 DOM。
- 悬停或键盘聚焦模板卡片只临时应用预览，离开模板列表或失焦后恢复已保存模板；点击或 `Enter` / `Space` 才持久化。
- 检查器只由用户通过标题栏操作或关闭按钮关闭；模板保存、frontmatter 同步或导图重建不得自动关闭它。
- 已按 `dev-design-system` 更新 `DESIGN.md` 的样式检查器复用规则；现有 `design-tokens.json` 无需新增通用精确令牌。

## Confirmed Route

| Decision | Chosen route | Confirmed by | ADR gate |
|---|---|---|---|
| 颜色稳定性 | 按一级分支位置使用固定模板调色板，不实现基于节点 ID 的哈希色 | 用户接受模板方案；当前 Markdown 节点 ID 并非总是持久化 | not needed |
| 模板入口 | 脑图标题栏调色板操作，点击切换当前导图内的右侧样式检查器 | 用户确认 | not needed |
| 模板应用 | 单列卡片悬停/聚焦临时预览，点击或 `Enter` / `Space` 写入 frontmatter，检查器保持打开 | 用户确认 | not needed |
| 模板作用域 | 每张脑图保存模板 ID；插件设置仅控制新图默认值 | 用户确认 | not needed |
| 旧配色设置 | 以模板取代全局 `strokeArray`，不保留双轨渲染 | 单一实现原则与已确认模板方向 | not needed |

## Split Guidance

- Source: `dev-split` 检查；`src/mindmap/mindmap.ts`、`src/main.ts` 和 `src/mindmap/INode.ts` 均超过 1200 行，`src/MindMapView.ts` 为 579 行且是视图入口。
- Classification: no split for existing core files; 样式检查器继续由既有 `src/mindmap/style/` 功能目录单独拥有。
- Code-placement constraints:
  - 新增 `src/mindmap/style/MindMapStyle.ts`，唯一负责模板类型、内置模板目录、模板 ID 解析，以及将模板应用到既有 `MindMap` DOM/SVG/布局状态。
  - `src/mindmap/style/MindMapStyleInspector.ts` 唯一负责右侧检查器、单列预览卡片、键盘可访问选择、关闭控制和生命周期内的选中态刷新；删除 Modal 旧实现。
  - `src/MindMapView.ts` 只负责标题栏切换、检查器生命周期、当前文件 frontmatter 读写与将选择结果委托给样式模块；不得承载模板定义或卡片 DOM 细节。
  - Do not add to: `src/mindmap/mindmap.ts`，除非样式模块无法通过既有公开状态刷新画布时只增加最小的稳定调用入口。
  - `styles.css` 仅承载模板变量消费与选择器布局，不直接硬编码单个模板的成组色值。
- Deferred split trigger: 若检查器需要跨视图共享状态、注册全局工作区 leaf 或管理节点编辑、历史记录、布局算法内部状态，则暂停实现，重新评估边界；本计划不以行数减少为目标。

## Steps And Verification

| ID | Status | Step | Verification |
|---|---|---|---|
| PLAN-1 | done | 建立 `src/mindmap/style/` 的模板目录与样式应用模块；定义六个稳定模板、默认 ID、ID 校验和固定一级分支配色规则，并移除 `randomcolor`/`strokeArray` 的运行时路径。 | `rg` 确认源码与依赖中不再包含随机配色；`npm run build` 通过。 |
| PLAN-2 | done | 为 `MindMap` 现有 DOM、节点与 SVG 连线接入模板应用函数：设置模板类/CSS 变量，清除旧节点 stroke，按固定调色板重绘并保持节点数据和布局不变。 | 静态检查确认模板重设节点 stroke、布局颜色和线宽；`npm run build` 通过。 |
| PLAN-3 | done | 完善 `MindMapStyleInspector`：卡片以自然内容高度展示名称；悬停或键盘聚焦临时预览、离开恢复已保存模板，点击或 `Enter` / `Space` 持久化；导图同步后恢复已打开的检查器。 | 构建通过；静态检查预览不写 frontmatter；测试 Vault 验证名称不遮挡、悬停恢复、点击保存、键盘保存和同步后检查器不关闭。 |
| PLAN-4 | done | 在 `MindMapView` 中读取和安全写入当前文件的模板 frontmatter；在 `settings.ts`、`settingTab.ts` 和新建脑图流程中加入默认模板设置与新文件初始标识。 | 构建通过；待测试 Vault 验证新旧 frontmatter、关闭重开和 Markdown/脑图往返。 |
| PLAN-5 | done | 更新语言键、`styles.css` 的模板消费规则和能力文档；补充/修正设计系统来源，确保不再存在失效的 `mm-theme-*` 与 `.theme-*` 对应关系。 | `npm run build` 通过；静态检索确认旧主题选择器、随机配色和 Modal 实现已移除。 |
| PLAN-6 | done | 在 `E:\Learning-materials\Obsidian\LLM` 隔离测试 Vault 执行模板回归矩阵，并更新源审计中 STYLE-1、STYLE-2 的验证与关闭状态。 | 2026-07-19 用户确认模板侧栏、名称展示、悬停预览、点击保存、面板保持打开与关闭重开流程验收通过；构建产物已部署至该 Vault。 |

## Acceptance Criteria

- 用户能从脑图标题栏打开或关闭当前视图内的右侧样式检查器；六个单列模板卡片清晰呈现且不溢出容器。
- 用户可以在检查器保持打开时悬停或键盘聚焦比较模板，离开后恢复已保存样式；点击或 `Enter` / `Space` 后保存当前导图样式。
- 每个模板的一级分支及对应子树在同一文件多次关闭、重开后保持相同配色；渲染不再调用随机颜色。
- 当前图模板仅保存为该 Markdown 文件的 frontmatter ID，且不会破坏其他 frontmatter 字段或节点正文。
- 新图继承插件设置的默认模板；已有图的模板选择优先级高于全局默认值。
- 深色和浅色 Obsidian 主题下，模板卡片、节点文字、根节点、编辑态、选择态和分支线可读可操作。
- TypeScript/Rollup 生产构建通过，且测试 Vault 回归矩阵完成并记录结果。

## Artifact Routing

- Capability updates: `docs/capabilities/mindmap-editing.md`，实现后补充模板入口、frontmatter 保存和稳定配色事实。
- Audit output: 更新 `docs/audits/2026-07-18-mindmap-style-management-audit.md` 中 STYLE-1 与 STYLE-2 的验证和关闭状态。
- Source audit: `docs/audits/2026-07-18-mindmap-style-management-audit.md`。
- Covered findings: STYLE-1、STYLE-2。
- Deferred findings: none。
- Design system: 已更新 `DESIGN.md`；实施后通过 `dev-design-system` check 验证模板选择器与集中色值规则。
- ADR gate: not needed；模板策略是局部 UI 行为，不引入不可逆架构决策。
- Tests: 仓库没有自动化测试框架；以 `npm run build` 和隔离测试 Vault 的手动回归矩阵为门禁。

## Git Visibility

- 本文件创建后必须运行 `git status --short --branch --untracked-files=all` 并确认其可被 Git 跟踪。

## Closeout

During `dev-distill`, choose one final action:

- Archive: move this file to `docs/plans/archived/` and set `status: archived` when the plan has trace value.
- Delete: remove this file when it has no independent future value.

Only close the plan when every non-deferred step is `done`, no step is `blocked`, verification is
recorded, and linked audit findings have been updated.

Do not use `completed` or `superseded` as final states.
