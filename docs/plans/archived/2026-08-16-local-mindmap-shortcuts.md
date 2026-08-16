---
artifact_type: plan
status: archived
created: 2026-08-16
updated: 2026-08-16
owner: codex
---

# 脑图局部快捷键与分层管理界面

## Goal

将插件自带的脑图快捷键从 Obsidian 全局默认热键中移出，只在当前脑图视图获得焦点且操作上下文匹配时执行；右侧面板保持为常用快捷键检查器，通过独立全集 Modal 完成全部局部快捷键的搜索、查看和编辑。

## Scope

- 建立全部脑图局部操作的唯一快捷键目录，包含操作 ID、分类、默认绑定、常用标记、适用上下文和显示文本。
- 覆盖当前 `main.ts` 中 25 组插件默认热键，以及已在节点、剪贴板、Markdown 格式和图片控制器内处理的局部绑定。
- 右侧面板仅显示 10–15 个高频操作，保留当前紧凑分组，并增加“管理全部快捷键”入口。
- 新增独立全集 Modal，支持搜索、分类、绑定录制、清除、单项/分类/全部恢复默认，以及“仅看已修改”和冲突提示。
- 插件设置页仅保留全集管理器入口、恢复全部默认和局部生效说明，不再展开长命令列表。
- 保留 Obsidian 命令面板中的插件命令，但移除插件声明的全局默认 `hotkeys`。

## Non-goals

- 不删除命令面板入口，不阻止用户在 Obsidian 中主动绑定全局命令。
- 不修改 Obsidian 核心或其他插件的快捷键。
- 不将文件右键菜单重复问题纳入本任务。
- 不增加移动端专用 UI 或触摸手势。
- 不对 `main.ts`、`mindmap.ts` 或 `INode.ts` 做与快捷键无关的全面拆分或清理。

## Assumptions And Decisions

- 已确认“两级界面”：右侧常用面板负责快速查阅和调整高频项，独立 Modal 负责全集管理，两者读写同一份配置。
- 常用项以当前已展示的新增同级/子节点、进入/完成编辑、删除、复制/剪切/粘贴、撤销/重做、展开/折叠和批量编号为主；精确集合由目录的 `highFrequency` 元数据决定。
- 局部快捷键只在活动 leaf 是当前 `MindMapView`、事件目标属于脑图容器且动作上下文匹配时生效。普通 input、textarea、select、button、链接、弹窗和非节点文字编辑器保留原生按键行为。
- 节点正文编辑只允许明确标记为编辑上下文的动作，例如完成编辑、插入换行和 Markdown 格式；剪贴板、撤销和方向键保留文本编辑语义。
- 同一绑定可在互斥上下文复用，例如 `Enter` 在节点选中态新增同级节点、在节点编辑态完成编辑。只有适用上下文存在交集的重复绑定才是冲突。
- 保留用户在 Obsidian 全局快捷键页中主动设置的自定义绑定；插件不修改或删除宿主设置。脑图内匹配的局部绑定在其有效上下文中优先并消费事件。
- 当前 `nodeKeyboardShortcuts` 中的两个自定义同级节点绑定必须一次性迁移到新目录配置，迁移后仅保留新数据源，不并行维护新旧两套运行时逻辑。
- ADR 门禁不通过：该决定属于可逆的插件内部交互和状态整理，不改变节点 Markdown 或公共数据协议。

## Fact Sources

- 快捷键设置与命令注册：`src/settings.ts`、`src/main.ts`
- 视图 Scope 与面板生命周期：`src/MindMapView.ts`
- 当前目录、验证和常用面板：`src/mindmap/interaction/NodeKeyboardShortcuts.ts`、`src/mindmap/interaction/MindMapShortcutInspector.ts`、`src/mindmap/interaction/PluginShortcutCatalog.ts`
- 当前键盘分发：`src/mindmap/mindmap.ts`、`src/mindmap/interaction/NodeKeyboardController.ts`、`src/mindmap/interaction/NodeClipboardController.ts`、`src/mindmap/interaction/NodeSelectionController.ts`
- 设置页入口：`src/settingTab.ts`
- UI 规则：`DESIGN.md`、`styles.css`
- 当前能力事实：`docs/capabilities/mindmap-editing.md`

## Split Guidance And Code Placement

Dev Split 分类：对 `main.ts` 的广泛拆分为 `defer`，对本任务的快捷键所有权边界为 `proposed split`。不以文件行数为成功目标。

| Module | Owner responsibility | May depend on | Must not own |
|---|---|---|---|
| `src/mindmap/interaction/MindMapShortcutCatalog.ts` | 操作定义、默认绑定、分类、高频标记、平台归一化、上下文冲突检查和旧设置迁移 | 翻译 key 类型 | DOM、脑图变更或 Obsidian 命令执行 |
| `src/mindmap/interaction/MindMapShortcutRouter.ts` | 脑图容器内唯一局部快捷键匹配、上下文守卫、优先级和动作分发 | Catalog 与现有动作 owner 提供的类型回调 | 节点结构算法、剪贴板 I/O 或历史实现 |
| `src/mindmap/interaction/MindMapShortcutInspector.ts` | 右侧高频快捷键投影和全集入口 | Catalog 和共享录制/保存回调 | 全量列表、搜索或独立快捷键副本 |
| `src/mindmap/interaction/MindMapShortcutManagerModal.ts` | 全集搜索、分类、录制、清除、恢复和冲突 UI | Catalog 和同一保存入口 | 运行时分发、命令业务逻辑或第二份状态 |
| `src/MindMapView.ts` | 创建/销毁 Router 和两级 UI，向共享保存入口接线 | 上述 owner 模块 | 目录定义、冲突算法或列表渲染细节 |
| `src/main.ts` | 保留命令面板注册、设置加载与持久化接线 | Catalog 的归一化/迁移 API | 新的局部键盘匹配、冲突检查或面板 UI |

实施时用 `MindMapShortcutCatalog.ts` 替换 `NodeKeyboardShortcuts.ts` 与 `PluginShortcutCatalog.ts` 的分散事实源；不保留并行运行时实现。现有 `NodeKeyboardController`、`NodeClipboardController`、`NodeSelectionController`、图片和历史 owner 仍执行具体动作，Router 只负责选择并调用，避免复制业务逻辑。

Do not add to: `src/main.ts`、`src/mindmap/mindmap.ts`、`src/mindmap/INode.ts` 中的非生命周期快捷键逻辑。

## Steps

1. **[done] 建立基线清单与确定性验证**
   - 从 `main.ts`、局部 Controller 和右侧面板列出当前动作、默认按键、平台差异和可用上下文，先证明哪些 `addCommand.hotkeys` 会进入 Obsidian 全局系统。
   - Verification: 用 TypeScript AST/确定性脚本检查插件默认热键清单，并对照当前快捷键面板。

2. **[done] 以统一 Catalog 替换两键设置和全局命令投影**
   - 实现完整动作 schema、默认值、分类/高频元数据、平台映射、序列化归一化、清除绑定与按上下文的冲突检查；一次性迁移已有两个自定义同级节点绑定。
   - Verification: 覆盖默认目录完整性、Windows/macOS 修饰键、旧设置迁移、互斥上下文复用、真冲突、清除和恢复默认的确定性断言。

3. **[done] 建立唯一局部 Router 并移除插件全局默认热键**
   - Router 从活动脑图容器接收键盘事件，按上下文优先级仅执行一个动作，并调用现有动作 owner；输入控件、IME、弹窗、非活动 leaf 和脑图外焦点不消费事件。
   - 删除快捷键管理范围内命令的 `hotkeys` 字段，命令面板回调改为调用同一动作入口。
   - Verification: AST 检查插件不再声明全局默认热键；在测试 Vault 验证脑图内有效、Markdown/设置/其他插件中无效，以及文字和代码输入的原生键盘行为。

4. **[done] 将右侧面板收敛为常用投影**
   - 按 Catalog `highFrequency` 和分类渲染常用操作，所有显示绑定均可录制，增加“管理全部快捷键”入口，移除全量全局命令列表依赖。
   - Verification: 检查项数受限、分组稳定、修改即时反映到当前及其他已打开脑图，并验证键盘录制、取消、错误提示和焦点恢复。

5. **[done] 实现全集快捷键管理 Modal 与设置入口**
   - 复用 Catalog 与同一录制/保存逻辑，实现搜索、分类、已修改筛选、绑定/清除、冲突提示和分层恢复默认；设置页改为管理器入口和局部生效说明。
   - Verification: 搜索/分类/筛选结果、无绑定状态、冲突定位、单项/分类/全部恢复、持久化、重开、深浅主题和键盘可达性。

6. **[done] 回归、文档和收尾门禁**
   - 运行生产构建，回归命令面板、节点新增/编辑/删除、多选、剪贴板、历史、图片四向布局、Markdown 格式、层级展开/折叠、节点移动、居中和缩放。
   - 更新 `DESIGN.md`、`docs/capabilities/mindmap-editing.md`、`CHANGELOG.md` 及必要的 `docs/ai/context-map.md`；使用 `dev-distill` 归档或删除本计划，并运行 `dev-check` 与独立审查。
   - Verification: `npm run build`、文档验证、差异检查、测试 Vault 人工验收，且不存在未处理冲突或新增构建警告。

## Risks And Controls

- **焦点泄漏**：局部 Router 若只检查活动文件而不检查事件目标，仍会影响弹窗或分栏编辑器。同时验证 active leaf、容器包含关系和动作上下文。
- **文本输入回归**：`Ctrl/Cmd+C/X/V/Z/Y`、方向键、`Enter`、`Tab` 在节点正文、代码 Modal 和其他输入控件中语义不同。用明确上下文表驱动，不使用宽泛“非空即脑图”判断。
- **虚假冲突**：简单按键唯一检查会错禁 `Enter` 等互斥状态复用。冲突算法使用上下文交集而非全局唯一。
- **迁移丢失**：已有用户可能自定义两个同级新建键。迁移断言和测试 Vault 要保证它们完整保留。
- **动作重复实现**：命令面板与局部 Router 若各有一套业务逻辑，将快速漂移。两者必须调用同一类型动作入口。
- **用户全局自定义绑定**：它们属于 Obsidian 宿主设置，本任务不自动删除。设置说明区分局部绑定与用户主动的全局绑定。

## Acceptance Criteria

- Obsidian 快捷键页中的脑图插件命令不再带插件默认全局绑定；用户主动绑定不被改写。
- 既有默认脑图操作仍可在脑图画布的正确上下文中使用，离开脑图视图后不占用同一按键。
- Markdown 编辑器、设置、搜索、弹窗、节点正文和代码输入的原生剪贴板、撤销、方向键与输入行为不受干扰。
- 右侧面板仅展示高频快捷键，可打开全集 Modal；全集可搜索、分类、查看、修改、清除、检查冲突和按层级恢复默认。
- 右侧面板、全集 Modal、运行时 Router 和插件设置始终读写同一快捷键配置，修改立即同步所有已打开脑图并在重开后保留。
- 相同按键在互斥上下文可复用，在重叠上下文中会被拒绝并清楚指出冲突对象。
- 旧版两个自定义同级新建绑定迁移后不丢失，运行时不保留新旧双轨逻辑。
- 生产构建、文档检查和测试 Vault 回归通过，没有新增构建警告或未处理审查问题。

## Artifact Routing And Closeout

- `persistent_plan: yes`；本任务横跨命令注册、运行时键盘分发、设置迁移和两级 UI，需要可审查的持久计划。
- `design_system_impact: update`；实现验收后记录“常用投影 + 全集 Modal + 单一配置源”的可复用快捷键管理规则。
- 用户可见行为变更需更新 `CHANGELOG.md`；当前能力与 owner 边界需更新 `docs/capabilities/mindmap-editing.md` 和可能的 `docs/ai/context-map.md`。
- ADR 不需要；实施完成后由 `dev-distill` 归档本计划，文档变更后运行 `dev-check`。
