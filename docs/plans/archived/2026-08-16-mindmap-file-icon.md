---
artifact_type: plan
status: archived
created: 2026-08-16
updated: 2026-08-17
owner: agent
plan_readiness: ready
source_audit: ""
covered_findings: []
deferred_findings: []
---

# 脑图文档专属文件图标

## 目标

让带有 `mindmap-plugin: basic` frontmatter 的 Markdown 文件在脑图视图、命令菜单和桌面文件资源管理器中统一显示专属脑图图标，同时保持标准 `.md` 格式和普通 Markdown 文件的宿主行为不变。

## 范围

- 范围内：注册一个遵循 Obsidian/Lucide 视觉语义的单色 SVG 图标；统一脑图视图、标签页及相关菜单入口；在桌面文件资源管理器中按 frontmatter 动态装饰脑图文件；处理元数据变化、文件树重绘和插件卸载清理；补充稳定能力与设计规则文档。
- 范围外：改变文件扩展名或 Markdown 内容格式；为普通 Markdown 提供自定义图标；重构现有视图切换机制；引入图标选择设置；承诺移动端或未来 Obsidian DOM 版本的无条件兼容。

## 计划就绪检查

- 目标明确：是；用户已确认采用“保留 `.md`、以 frontmatter 识别、文件树使用受控 DOM 增强”的推荐路线。
- 范围明确：是；第一版只实现一个固定专属图标及其桌面端生命周期。
- 事实来源已知：是；脑图文档定义、视图图标和元数据缓存入口均已定位。
- 关键决策已确认：是；接受文件资源管理器依赖非公开 DOM 带来的版本维护成本。
- 验证路径已知：是；生产构建加测试 Vault 中的文件树、主题、动态更新和卸载验证。

## 假设与决策

- 脑图文件的唯一判定条件为 frontmatter `mindmap-plugin` 的值严格等于 `basic`；属性缺失、空值或其他值均保持普通 Markdown 图标。
- 文件继续使用 `.md` 扩展名，不新增专属文件类型或兼容双轨。
- 图标采用“文档轮廓 + 中心节点 + 分支”的固定单色 SVG，使用 `currentColor`、接近 Lucide 的描边和圆角，在 14–16px 下仍可辨识。
- 使用 Obsidian `addIcon()` 注册唯一图标 ID，脑图视图和相关菜单消费同一 ID；不保留原 `blocks`/`document` 与新图标并行的脑图入口。
- 文件资源管理器增强封装在专责组件中；DOM 选择器、MutationObserver、调度和清理由该组件独占，宿主 DOM 不满足预期时应安全跳过，不能影响文件树原有交互。
- 不因显示图标读取或改写 Markdown 正文；文件身份只读取 `MetadataCache`。

## 已检查的决策点

| 决策 | 已选路线 | 确认者 | ADR 门禁 |
|---|---|---|---|
| 是否改变文件格式 | 保持 `.md` 和现有 frontmatter | 用户 | not needed；延续现有事实来源 |
| 是否覆盖文件资源管理器 | 使用局部、可清理的 DOM 增强 | 用户 | maybe；若未来形成长期宿主兼容策略，再由 `dev-distill` 复核 |
| 新逻辑放置位置 | 新增 `MindMapFileIconController`，入口文件只接线 | 工程约束 | not needed；不改变公开 API |
| 图标视觉方向 | 文档轮廓与导图分支组合、宿主单色语义 | 用户采用推荐方案 | not needed；属于可替换视觉资产 |

## 模块边界约束

`dev-split` 分类为“不拆分现有文件，新增专责 owner”。行数不是目标，本任务不得顺带重构 `src/main.ts` 或 `src/MindMapView.ts`。

| 模块 | Owner responsibility | May depend on | Must not own |
|---|---|---|---|
| `src/mindmap/file/MindMapFileIconController.ts` | 脑图文件身份判断、图标注册、文件树 DOM 装饰、刷新调度及清理 | Obsidian `App`/`Component`/`MetadataCache`/图标 API、`frontMatterKey` | 脑图视图切换、Markdown 写入、命令业务 |
| `src/main.ts` | 创建并挂载 controller、保留插件级入口 | controller 的公开生命周期 | DOM 查询、观察器、逐文件图标状态 |
| `src/MindMapView.ts` | 返回统一脑图图标 ID | controller 模块导出的稳定图标 ID | 文件树更新或元数据监听 |
| `styles.css` | 文件树专属图标的最小尺寸和对齐 | Obsidian CSS 变量及 controller 添加的专属 class | 文件身份判断或主题专用颜色 |

禁止新增到：`src/main.ts` 的 DOM 处理主体、`src/MindMapView.ts` 的文件树生命周期逻辑，以及任何新建的 `utils`、`helpers`、`common` 或 `shared` 模块。

## 事实来源

- `CONTEXT.md`：脑图文档的稳定定义。
- `src/constants.ts`：`mindmap-plugin` frontmatter 键和新建脑图 frontmatter。
- `src/MindMapView.ts`：当前视图图标为通用 `blocks`。
- `src/main.ts`：视图注册、相关菜单以及现有 metadata changed 事件入口。
- `DESIGN.md`：复用 Obsidian 宿主 UI、CSS 变量和图标语义。
- `node_modules/obsidian/obsidian.d.ts`：`addIcon`、`Component` 生命周期、MetadataCache/Vault/Workspace 事件的当前编译契约。
- 文件资源管理器 DOM：非公开运行时契约，实施时仅在测试 Vault 中检查，不将猜测的选择器散落到其他模块。

## 步骤与验证

步骤状态只允许 `todo`、`done`、`blocked`。

| ID | Status | 步骤 | 验证 |
|---|---|---|---|
| PLAN-1 | done | 在测试 Vault 中复现普通 Markdown 与脑图 Markdown 均显示默认文件图标，并检查当前桌面文件资源管理器的最小稳定 DOM 锚点；记录 controller 只需要依赖的行节点、路径属性和图标槽位。 | Obsidian 1.13.7 隔离 Vault 验证 `.nav-files-container`、`.nav-file-title[data-path]` 和直接标题内容锚点可用；脑图与普通 Markdown 初始状态正确。 |
| PLAN-2 | done | 新增 `MindMapFileIconController`：注册唯一 SVG 图标 ID，使用严格 `basic` 判定，通过 `onLayoutReady` 初始化；监听 metadata 变化和必要的 Vault/Workspace 事件，并用限定范围的 MutationObserver 加动画帧合并刷新可见文件行。 | `npm run build` 通过；确定性检查确认无正文 I/O、observer 范围受限、刷新合并且具备清理路径。 |
| PLAN-3 | done | 在 controller 中实现可逆 DOM 装饰：只替换脑图 Markdown 的文件图标，普通文件不变；frontmatter 失效、行复用、重命名/移动/删除和组件卸载时移除插件节点与 class、断开观察器并取消待执行刷新。 | 隔离 Vault 自动验证非 `basic` 移除、恢复 `basic`、重命名保持和禁用插件清理全部通过；无错误。 |
| PLAN-4 | done | 将 `MindMapView.getIcon()`、新建脑图和“以脑图打开”等现有脑图入口统一到同一图标 ID，移除这些入口对 `blocks`/`document` 的脑图语义依赖。 | 代码、生产 bundle 和运行时 `MindMapView.getIcon()` 均返回 `enhancing-mindmap-file`；用户截图确认文件树显示。 |
| PLAN-5 | done | 添加最小 CSS 对齐规则，并在浅色、深色及至少一个非默认主题下检查 14–16px 图标的清晰度、颜色继承、缩放和高对比可辨识性。 | 实际浅色截图、深浅 SVG 预览及 Obsidian 1.13.7 自定义深色主题验证通过；图标继承 `--text-muted`，实际尺寸在 10–24px 范围。 |
| PLAN-6 | done | 完成生产构建与回归，并将确认后的文件身份展示规则写入 `DESIGN.md`；新增或更新对应能力文档和 `docs/ai/context-map.md` 路由。 | `npm run build`、两轮隔离 Vault 验证、DESIGN、能力文档、context-map、changelog 和 Dev Flow 文档检查全部完成。 |

## 验收标准

- `mindmap-plugin: basic` Markdown 在脑图标签页、相关菜单和桌面文件资源管理器中显示同一专属图标。
- frontmatter 缺失、空值或非 `basic` 的 Markdown 始终保持宿主普通文件图标。
- frontmatter 修改、文件树重绘、重命名、移动、删除和插件重新加载后，图标状态无需重启 Obsidian 即可恢复一致。
- 插件禁用后不残留文件树 SVG、class、观察器或待执行刷新，普通文件交互未被修改。
- 图标在深浅主题和非默认主题下清晰可辨，不依赖固定颜色，不造成文件名位移或重复图标。
- 文件仍是标准 Markdown；实现不为展示目的读取或写回文件正文。
- `npm run build` 通过，测试 Vault 的手工验证结果和视觉证据已记录，没有静默跳过项。

## 验证记录

- Obsidian 版本：1.13.7；隔离临时 Vault，不使用真实 Vault。
- 行为检查：目标插件加载、文件资源管理器可用、脑图初始图标、普通 Markdown 无专属图标、脑图视图图标、非 `basic` 移除、恢复 `basic`、重命名保持、插件卸载清理，全部通过。
- 主题检查：自定义非默认主题加载、深色主题、图标可见、`--text-muted` 颜色继承和 10–24px 实际尺寸，全部通过。
- 自动检查：7 项确定性合同检查通过；`npm run build` 成功；Dev Flow 文档验证无问题。
- 已知构建警告：`WorkspaceLeaf.id` 和 `xmindZen.ts` 隐式 `any` 为任务前既有警告，本任务未扩大范围处理。

## 产物路由

- 计划：`docs/plans/2026-08-16-mindmap-file-icon.md`。
- 能力文档更新：实施完成后新增 `docs/capabilities/mindmap-file-identity.md`，并更新 `docs/ai/context-map.md` 的代码入口。
- 设计系统影响：`update`；确认一个跨文件树、标签页和菜单复用的脑图文档身份图标规则，实施验证后更新 `DESIGN.md`。
- 审计输出：无。
- 来源审计：无。
- 覆盖发现：无。
- 延后发现：移动端、浮动窗口和未来 Obsidian DOM 版本兼容性；首次实现不将其作为已验证承诺。
- Changelog：needed；这是用户可见的新能力，由实施关闭阶段添加 `Added` 条目。
- Distill：needed；关闭计划、更新能力与设计规则，并复核 DOM 依赖是否达到 ADR 门禁。
- ADR 门禁：`maybe`；当前只是封装的可替换 UI 适配层，若实现形成长期跨版本兼容策略再创建 ADR。
- 测试：不为本功能引入新测试框架；使用生产构建、测试 Vault 行为矩阵和主题截图/录屏验证。

## Git 可见性

- 创建本文件后运行 `git status --short --branch --untracked-files=all`。
- 若文件被忽略，添加最小允许规则，或明确报告计划未被跟踪。

## 关闭方式

所有步骤均已完成并记录验证；本计划由 `dev-distill` 移至 `docs/plans/archived/`，能力、设计规则、上下文路由和 changelog 已同步。

不得使用 `completed` 或 `superseded` 作为最终状态。
