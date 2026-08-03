---
artifact_type: plan
status: archived
created: 2026-08-03
updated: 2026-08-03
owner: Codex
---

# 可配置节点宽度范围

## 目标

在插件设置中提供文本节点与节点图片各自的最小、最大宽度，并让合法设置立即作用于所有已打开脑图。

## 范围

- 新增文本节点最小/最大宽度设置，默认保持 `32px` / `1600px`。
- 新增节点图片最小/最大宽度设置，默认保持 `80px` / `960px`。
- 文本自动换行拖拽、已有文本宽度显示、图片编辑态显示与缩放统一读取当前设置。
- 设置变更后重新测量并布局已打开脑图。
- 更新中英文设置文案、能力文档和变更日志。

## 非目标

- 不增加节点字符数限制。
- 不增加“默认文本节点宽度”或修改图片默认插入宽度 `320px`。
- 不增加移动端专用适配。
- 不因设置变化批量改写已有脑图 Markdown。

## 假设与已确认决策

- 用户已确认文本和图片宽度范围一起纳入设置。
- 四项设置均为像素整数；最小值必须为正数，最大值不得小于对应最小值。
- 无效输入不保存、不传播，设置控件恢复为最后一个有效值。
- 已有 Markdown 中超出当前范围的宽度在运行时按当前范围显示；只有用户之后实际调整或保存图片编辑结果时才按当前范围写回。
- 默认值保持当前行为，以兼容没有新字段的旧配置。

## 事实来源

- 设置模型与界面：`src/settings.ts`、`src/settingTab.ts`、`src/main.ts`
- 脑图设置传播：`src/MindMapView.ts`、`src/mindmap/mindmap.ts`
- 文本宽度：`src/mindmap/wrap/NodeAutoWrapController.ts`、`styles.css`
- 图片宽度：`src/mindmap/image/NodeImageMarkdown.ts`、`src/mindmap/INode.ts`、`src/mindmap/insert/NodeInsertController.ts`
- 当前能力合同：`docs/capabilities/mindmap-editing.md`、`DESIGN.md`

## 执行步骤

1. `done` 集中定义宽度默认值与范围规范化规则，并接入插件设置的旧配置兼容加载。
   - 验证：缺失或非法字段会回到现有默认范围，合法字段保持原值。
2. `done` 让文本宽度控制器、CSS 宽度边界和图片显示/缩放使用当前脑图设置。
   - 验证：已有宽度与拖拽结果均被当前最小/最大值约束，默认行为不变。
3. `done` 在设置页增加四项数字输入，并在合法变更后即时刷新全部打开脑图。
   - 验证：非法值不保存；合法值保存并触发节点重新测量和布局。
4. `done` 更新中英文文案、能力文档和 `CHANGELOG.md`。
   - 验证：文档只描述最终单一路线，Dev Flow 文档校验通过。
5. `done` 运行生产构建、检查最终差异并完成独立审查。
   - 验证：`npm run build` 通过，改动仅覆盖本任务，测试 Vault 可加载生成的 `main.js`。

## 风险与控制

- CSS 固定上限可能覆盖配置：改为由脑图容器设置的 CSS 变量提供边界。
- 图片工具函数缺少脑图上下文：保持解析只读取原始宽度，在节点显示、编辑和序列化入口显式传入当前范围，避免全局可变状态。
- 最大值小于最小值会导致不确定行为：设置层和运行时都使用同一规范化规则。

## 验收标准

- 设置页可分别修改文本节点和节点图片的最小、最大宽度。
- 默认配置下现有体验和宽度数值不变。
- 合法设置即时作用于已打开脑图，非法设置不污染持久配置。
- 旧配置无需迁移即可加载。
- 构建与 Dev Flow 文档校验通过。

## 产物路由

- persistent_plan: yes
- capability_doc: update `docs/capabilities/mindmap-editing.md`
- changelog: update `CHANGELOG.md` under `[Unreleased]`
- context_map: no change expected
- ADR: not required
- design_system_impact: none；复用 Obsidian `Setting` 数字输入，不建立新的可复用 UI 规则

## 收尾

- `npm run build` 通过；构建只包含仓库原有 TypeScript 警告。
- 非生成文件通过 `git diff --check`。
- 生成的 `main.js` 与 `styles.css` 已同步到测试 Vault。
- 手工独立审查确认计划覆盖、相关性和验证证据均通过，无阻塞问题。
