---
artifact_type: plan
status: archived
created: 2026-08-02
updated: 2026-08-02
owner: codex
source_audit: docs/audits/2026-07-31-mindmap-ux-exploratory-review.md
covered_findings:
  - UX-03
  - UX-04
  - UX-06
---

# 脑图同步、层级收缩与有序编号修复

## 目标

修复外部 Markdown 变化未刷新脑图、根节点执行“Collapse one level”异常，以及有序节点在删除和移动后序号失真的问题，使三类高频结构操作与撤销、重做、保存重开保持一致。

## 范围

- 覆盖审计发现 UX-03、UX-04、UX-06。
- 修复当前脑图文件的 `quick-preview` 事件转发和刷新守卫。
- 为“Collapse one level”补齐活动脑图、单选、非根节点和父节点前置条件。
- 将有序编号扩展到单节点删除、批量删除、单节点移动和多节点移动的执行、撤销与重做生命周期。
- 非目标：处理 UX-07 的剪贴板反馈、UX-09 的失效命令、重做全部层级命令、引入自动化测试框架或按行数拆分中心文件。

## 假设与决策

- `MindMapView.data` 和当前 Vault 文件内容仍是视图同步事实来源；只修复已有事件没有调用处理器的问题，不增加轮询或第二套同步状态。
- 样式模板保存期间继续使用 `isApplyingStyleTemplate` 阻止自身写入触发重复重建；其他同文件且内容实际变化的 `quick-preview` 事件调用现有 `setViewData()` 路径。
- 根节点没有可收缩到的父层级，因此“Collapse one level”在根节点、多选、无选择或父节点不存在时不可执行，不改变当前选择和显示层级。
- 有序节点由 `数字.` 或 `数字)` 加空格识别；只有连续且分隔符相同的兄弟节点属于同一编号组，普通节点和另一种分隔符继续作为边界。
- 删除后，受影响连续组保持该组原有起始值并按当前兄弟顺序连续编号。
- 移入已有编号组时，移动节点采用目标组的起始值和分隔符并按目标兄弟顺序编号；没有目标编号组时，移动节点自身的连续编号组保持原起始值和分隔符。孤立编号节点及无关兄弟组不被改写。
- 每条结构命令保存执行前后的节点文字快照；撤销精确恢复原结构和原编号，重做恢复首次执行得到的结构和编号，不在每次重做时重新推导不同结果。
- 不需要 ADR：本轮延伸既有编号规则和命令 History 合同，不改变 Markdown 事实来源、公开格式或模块所有权。

## 事实来源

- 源审计：`docs/audits/2026-07-31-mindmap-ux-exploratory-review.md`
- 当前能力：`docs/capabilities/mindmap-editing.md`
- 外部同步入口：`src/MindMapView.ts`
- 层级命令注册：`src/main.ts`
- 结构命令与 History：`src/mindmap/Cmds.ts`、`src/mindmap/Execute.ts`
- 有序编号 owner：`src/mindmap/interaction/OrderedSiblingNumbering.ts`
- 运行时节点树：`src/mindmap/INode.ts`、`src/mindmap/mindmap.ts`

## Dev Split 约束

- 分类：`local cleanup`。扫描发现 `src/main.ts` 是大文件候选，但 UX-04 只需要局部命令守卫；不得借本任务拆分命令注册文件。
- `src/MindMapView.ts` 只修正 `quick-preview` 的参数转发与现有同步入口调用，不新增同步服务或状态层。
- `src/main.ts` 只保留命令注册和可用性守卫，不承接层级计算。
- `src/mindmap/interaction/OrderedSiblingNumbering.ts` 是编号识别、受影响组计算和确定性文字变化的唯一 owner；允许扩展具名接口，不创建 `utils`、`helpers` 或第二套编号解析。
- `src/mindmap/Cmds.ts` 只在结构命令中捕获结构/文字快照、应用 owner 模块返回的变化并刷新受影响父节点；不得复制编号正则或分组算法。
- `src/mindmap/mindmap.ts`、`src/mindmap/INode.ts` 不增加编号业务逻辑。
- 若实现需要改变节点持久化格式、History 公共接口或四个结构命令之外的全局归一化，停止并重新执行 `dev-split`/ADR 门禁；不以减少行数为目标。

## 实施步骤与验证

| ID | 状态 | 步骤 | 验证 |
|---|---|---|---|
| PLAN-1 | done | 在隔离测试 Vault 复现并记录三项基线：分栏或外部编辑同一 Markdown 后脑图不刷新；根节点执行“Collapse one level”报错；编号组删除/移动后出现断号或顺序错乱。 | 分别记录文件内容、运行时节点顺序、当前选择和撤销栈，确认 UX-03/04/06 在当前 `main` 可复现。 |
| PLAN-2 | done | 修正 `quick-preview` 注册回调，将宿主事件参数转发给现有 `onQuickPreview(file, data)`，保留样式写入防回环和同文件、内容变化守卫。 | 用户确认同文件实时刷新、视口定位和隐藏画布原子替换通过；生产构建通过。 |
| PLAN-3 | done | 将“Collapse one level”改为带明确可用性检查的单一路径，仅对具有父节点的非根单选节点执行现有层级收缩和父节点选择。 | 根节点、无选择、多选守卫及普通节点父层级收缩通过命令检查与测试 Vault 回归。 |
| PLAN-4 | done | 扩展 `OrderedSiblingNumbering.ts`，用纯计算接口描述删除/移动前后受影响父节点的连续编号组和文字快照；在 `RemoveNode`、`RemoveNodes`、`MoveNode`、`MoveNodes` 中统一应用，并让 undo/redo 精确恢复对应快照。 | 纯计算矩阵及四条结构命令的执行、撤销、重做脚本通过，用户完成测试 Vault 验收。 |
| PLAN-5 | done | 执行结构与持久化回归，更新能力文档、CHANGELOG 和源审计并归档计划。 | `npm run build` 退出码为 0；能力文档、CHANGELOG、审计状态已更新，Dev Flow 文档校验纳入收尾门禁。 |

## 风险与控制

- `quick-preview` 可能由插件自身写文件触发：继续以 `isApplyingStyleTemplate`、当前文件和内容差异三重守卫避免循环。
- 删除或移动命令同时改变结构和文本，若快照时机不一致会破坏撤销：首次执行前捕获原结构/文字，首次执行后固化目标文字，后续 undo/redo 只重放快照。
- 同父移动的删除会改变目标索引：先按现有命令语义确定最终结构，再对最终兄弟数组计算编号；不得用修改前索引直接套用修改后数组。
- 多父批量操作可能重复处理同一父节点：按父节点去重后计算受影响组，文字变化按节点身份应用。
- 仓库没有自动化测试框架：纯编号计算保持无 DOM 副作用，生产构建与隔离 Vault 交互矩阵作为本轮门禁。

## 验收标准

- 同一脑图 Markdown 在分栏或外部修改后，活动脑图通过现有 `quick-preview` 路径刷新；其他文件和插件自身样式写入不造成误刷新或循环。
- 根节点、无选择和多选状态执行“Collapse one level”不报错、不改变显示层级；普通节点保持原有收缩语义。
- 连续有序组在单删、批删、单移和多移后按实际兄弟顺序连续编号，起始值、目标组格式和组边界符合已确认规则。
- 每个结构操作只产生原有的一条 History 命令；一次撤销恢复结构与原始编号，一次重做恢复首次执行结果。
- 普通节点、不同分隔符组和不受影响父节点的文字不发生变化。
- 保存并重新打开后，节点结构和编号与操作完成时一致。
- `npm run build` 通过，不新增 TypeScript 或 Rollup 错误。

## 产物路由与收尾

- Persistent plan：本文件；实施验证完成后移入 `docs/plans/archived/`。
- Source audit：`docs/audits/2026-07-31-mindmap-ux-exploratory-review.md`。
- Covered findings：UX-03、UX-04、UX-06。
- Deferred findings：UX-07、UX-09。
- Capability：实施后更新 `docs/capabilities/mindmap-editing.md` 的外部同步、层级命令和编号生命周期事实。
- Changelog：需要，三项均影响用户可见行为。
- Design system impact：`none`；不新增 UI、视觉规则或交互模式，只修复既有命令前置条件和数据同步。
- Context map：预计无需更新，现有模块入口与 owner 不变。
- ADR gate：不需要；若被迫改变持久化格式、History 公共接口或模块所有权则重新评估。
- Distill/check：`dev-branch` 收尾时更新审计状态、归档计划并运行文档校验。
- Completion：PLAN-1 至 PLAN-5 全部为 `done`、无 blocked 步骤，生产构建与隔离 Vault 验证通过后完成。
