---
artifact_type: plan
status: archived
created: 2026-08-03
updated: 2026-08-03
owner: Codex
---

# 修复自定义宽度首次布局失效

## 目标

确保普通文本节点的自定义最小、最大宽度在脑图首次布局和方向重排后保持生效，不需要选中节点触发恢复。

## 范围与非目标

- 修复 `Layout._setDirect()` 重建方向样式时丢失自动换行支持状态的问题。
- 验证首次打开、布局刷新和节点选中前后的尺寸一致性。
- 不修改用户宽度设置、脑图缩放状态或节点 Markdown。
- 不重构 `Layout` 的其他历史 class 管理行为。

## 已确认事实与决策

- `NodeAutoWrapController` 是普通文本节点宽度支持状态的事实来源。
- 首次渲染已正确添加 `mm-node-auto-wrap-supported`，但 `Layout._setDirect()` 随后通过清空 class 删除该状态。
- 选中节点调用控制器 `refresh()` 后恢复，和用户截图现象一致。
- 采用最小修复：方向 class 重建后调用现有控制器刷新，不建立第二套状态保存逻辑。

## 执行步骤

1. `done` 在布局方向 class 重建后恢复节点自动换行状态。
   - 验证：布局代码不再让宽度支持 class 永久丢失。
2. `done` 运行生产构建并同步测试 Vault。
   - 验证：`npm run build` 通过，测试插件获得最新 `main.js`。
3. `done` 更新回归说明、归档计划并完成差异审查。
   - 验证：文档校验通过，最终差异只包含本回归修复。

## 风险

- 布局过程刷新控制器可能影响节点尺寸缓存；现有控制器只恢复 class 与已持久化宽度，首次测量前后的目标尺寸一致。
- 不扩展为通用 class 保留重构，避免影响选择、折叠和模板样式。

## 验收标准

- 文本节点最大宽度设为 `800px` 后，每次打开脑图都直接以正常比例和换行显示。
- 选中节点前后不再发生宽度或整体布局突变。
- 默认宽度设置及图片宽度行为不受影响。

## 产物路由

- persistent_plan: yes
- capability_doc: update `docs/capabilities/mindmap-editing.md`
- changelog: update existing `[Unreleased]` width-setting entry as a combined current outcome
- ADR: not required
- design_system_impact: none

## 收尾

- `npm run build` 通过，仅包含仓库原有 TypeScript 警告。
- 生成的 `main.js` 已同步到测试 Vault。
- 用户确认 `800px` 最大宽度下首次打开和选中节点后的布局均正常。
- 能力文档和现有 `[Unreleased]` 宽度设置条目已更新，无需 ADR 或设计系统变更。
