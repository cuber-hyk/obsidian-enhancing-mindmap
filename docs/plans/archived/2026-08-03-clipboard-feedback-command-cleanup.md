---
artifact_type: plan
status: archived
created: 2026-08-03
updated: 2026-08-03
owner: codex
source_audit: docs/audits/archived/2026-07-31-mindmap-ux-exploratory-review.md
covered_findings:
  - UX-07
  - UX-09
---

# 剪贴板反馈与失效命令清理

## 目标

为节点剪贴板操作的受限和失败路径提供明确反馈，并移除无法可靠工作的旧文本替换命令，消除当前活跃体验审计中的最后两项确认问题。

## 范围

- 覆盖 UX-07、UX-09。
- 多选状态使用 `Ctrl`/`Cmd+C/X/V` 时显示一次简短 Notice，说明节点剪贴板只支持单选。
- 复制或剪切写入失败、粘贴读取失败、不支持的剪贴板内容分别显示本地化 Notice。
- 插件命令面板中的 Copy/Cut/Paste 只在当前活动脑图存在可操作的单选非编辑节点时可用。
- 删除 `Replace by the previous text` 命令及不再使用的翻译文案。
- 明确移动端专用优化和触摸适配不属于后续体验优化范围，不再保留为待优化项目；保持现有移动端可安装性不变。
- 非目标：多选节点复制/剪切/粘贴、剪贴板格式扩展、成功提示、移动端 UI 或触摸手势实现。

## 假设与决策

- 反馈复用 Obsidian `Notice`，不增加自定义提示组件、样式或持久状态。
- 用户主动切换 leaf、节点或编辑状态造成异步上下文失效时继续静默取消；这是防止后台误操作的正常分支，不作为错误提示。
- 多选节点剪贴板语义仍不支持；快捷键被消费后只提示限制，不退化为操作主选节点。
- 无法解析为内部节点 JSON 或受支持 Markdown 节点树的粘贴内容显示“不支持的剪贴板内容”，不修改脑图和 History。
- `Replace by the previous text` 没有可靠事实来源，直接删除命令和翻译；现有 `ChangeNodeText` History 的 Undo/Redo 继续是唯一文本恢复路径。
- 用户已确认不需要移动端适配；设计合同将移动端专用优化记录为明确非目标，而不是已知缺口，不改变 `manifest.json` 的现有可安装性。
- ADR 不需要：本轮沿用现有剪贴板 owner、宿主 Notice 和 History 合同，没有改变数据来源、持久化格式或模块所有权。

## 事实来源

- 源审计：`docs/audits/archived/2026-07-31-mindmap-ux-exploratory-review.md`
- 当前能力：`docs/capabilities/mindmap-editing.md`
- 设计合同：`DESIGN.md`
- 剪贴板 owner：`src/mindmap/interaction/NodeClipboardController.ts`
- 命令注册：`src/main.ts`
- 翻译事实来源：`src/lang/locale/en.ts`，其他 locale 通过英文键回退
- 文本 History：`src/mindmap/Cmds.ts`、`src/mindmap/Execute.ts`

## Dev Split 约束

- 分类：`local cleanup`。`src/main.ts` 超过候选阈值，但本轮只删除失效命令并调整三项命令可用性接线，不以行数拆分为目标。
- `NodeClipboardController.ts` 继续唯一拥有节点剪贴板可用性、异步上下文校验、解析和失败反馈；Notice 副作用保留在该 owner 内。
- `src/main.ts` 只负责 Obsidian 命令注册，不得增加剪贴板权限、解析或错误分类逻辑。
- 不创建 `utils`、`helpers` 或第二套剪贴板状态模块；不向 `src/mindmap/mindmap.ts`、`src/mindmap/INode.ts` 增加新行为。
- 若实现需要新增多选剪贴板语义、持久化状态或改变 History 公共接口，停止并重新规划。

## 实施步骤与验证

| ID | 状态 | 步骤 | 验证 |
|---|---|---|---|
| PLAN-1 | done | 记录多选快捷键、剪贴板权限拒绝、不支持内容及失效旧命令的当前基线，确认各入口与 History 均不应修改节点。 | 静态调用链确认 UX-07 的失败分支静默返回，UX-09 读取无有效来源的 `data.oldText`；异步上下文失效属于正常静默取消。 |
| PLAN-2 | done | 在 `NodeClipboardController` 增加单一可用性查询和本地化失败反馈，保持复制、剪切、粘贴的成功路径及上下文守卫不变。 | 控制器夹具验证多选、复制、剪切和不支持粘贴内容各提示一次；剪切失败与不支持粘贴不写 History；上下文失效静默取消。 |
| PLAN-3 | done | 将 Copy/Cut/Paste 命令改为宿主可用性检查，并删除旧文本替换命令及死翻译。 | 生产构建通过；静态搜索确认插件命令和 locale 不再包含旧命令，三项命令统一查询当前控制器可用性。 |
| PLAN-4 | done | 执行回归、更新 CHANGELOG、能力文档、设计合同和源审计，归档计划并完成审查门禁。 | `npm run build` 退出码为 0；控制器夹具通过，用户在测试 Vault 确认快捷键与命令面板行为；文档校验与独立审查纳入最终门禁。 |

## 风险与控制

- 同一失败可能从键盘层和异步方法重复提示：多选只在键盘接管点提示，读写与解析只在各自最终失败分支提示。
- 权限异常与不支持内容语义不同：异常提示操作失败，成功读取但无法解析提示内容不受支持。
- 命令可用性检查不得读取剪贴板或产生 Notice；检查只查看当前活动视图和节点状态。
- 删除旧命令可能影响已有自定义热键：这是用户确认的清理结果，Undo/Redo 是唯一推荐替代路径，CHANGELOG 记录移除。

## 验收标准

- 多选状态按节点复制、剪切或粘贴快捷键时，脑图不变化并显示一次限制提示。
- 系统剪贴板读写失败时显示与动作对应的失败提示；剪切写入失败不得删除源节点。
- 成功读取但无法识别的内容显示不支持提示，不新增节点和 History。
- 用户在异步完成前切换节点或视图时，保持静默安全取消。
- Copy/Cut/Paste 插件命令只在当前活动脑图的单选非编辑节点上可用。
- 插件命令及翻译目录不再包含 `Replace by the previous text`；文本撤销和重做行为不变。
- 文档明确移动端专用优化和触摸适配不在后续体验优化范围，同时保持现有移动端可安装性。
- 生产构建和文档校验通过，不新增 TypeScript 或 Rollup 错误。

## 产物路由与收尾

- Persistent plan：本文件；验收完成后移入 `docs/plans/archived/`。
- Source audit：更新 UX-07、UX-09；两项验证后审计不存在其他 open finding，可运行关闭门禁并归档。
- Capability：更新 `docs/capabilities/mindmap-editing.md` 的剪贴板失败反馈和命令可用性事实。
- Changelog：需要，失败反馈和命令移除均为用户可见行为。
- Design system impact：`update`；只将移动端从“已知缺口”改为明确非目标，不新增视觉组件或令牌。
- Context map：无需更新，入口和 owner 不变。
- ADR gate：不需要。
- Completion：PLAN-1 至 PLAN-4 全部为 `done`、无 blocked 步骤，构建、测试 Vault 验证和独立审查通过后完成。
