---
artifact_type: plan
status: archived
created: 2026-07-07
updated: 2026-07-07
owner: agent
---

# 导航控件节点数统计计划

## 目标

在脑图右下角导航控件中增加节点数量统计，显示当前可见节点数与整张脑图总节点数，格式为 `可见 / 总数 节点`。统计口径计入根节点。

## 范围

- 范围内：
  - 在 `MindMapNavigatorController` 中增加统计文本元素。
  - 可见节点数使用 `root.getShowNodeList().length`。
  - 总节点数从 `root` 递归 `children` 计算，包含折叠节点和根节点。
  - 统计在导航控件 `update()` 中同步，响应节点增删、折叠/展开、刷新和视图初始化。
  - 更新导航控件样式、能力文档、设计规则和变更日志。
- 范围外：
  - 不新增插件设置项。
  - 不改变节点数据结构、Markdown 保存格式或布局算法。
  - 不新增独立节点索引或缓存。
  - 不改变小视图绘制逻辑、缩放范围或隐藏/恢复交互。

## 假设与决策

- 已确认统计口径为“可见 / 总数”。
- 已确认根节点计入可见数和总数。
- 统计属于画布级辅助信息，应放在右下角导航控件内。
- 总数以当前运行时节点树为事实来源，不从 Markdown 文本重新解析。
- ADR 门禁：不需要；这是现有导航控件的局部 UI 信息增强，不改变长期架构或数据事实来源。
- Split 门禁：不需要；`src/mindmap/navigation/MindMapNavigatorController.ts` 已是导航控件 owner，`src/mindmap/mindmap.ts` 不应增加统计逻辑。

## 事实来源

- 画布导航控件：`src/mindmap/navigation/MindMapNavigatorController.ts`
- 可见节点 API：`src/mindmap/INode.ts` 的 `getShowNodeList()`
- 节点树结构：`src/mindmap/INode.ts` 的 `children`
- 刷新接线：`src/mindmap/mindmap.ts`
- 样式：`styles.css`
- UI 规则：`DESIGN.md`
- 能力文档：`docs/capabilities/mindmap-editing.md`
- 发布说明：`CHANGELOG.md`

## 步骤与验证

步骤状态只允许 `todo`、`done`、`blocked`。

| ID | Status | 步骤 | 验证 |
|---|---|---|---|
| PLAN-1 | done | 在导航控件构造流程中增加节点统计元素，并为其设置可访问文本。 | DOM 中存在统计元素；隐藏导航控件时统计随主面板隐藏。 |
| PLAN-2 | done | 增加可见节点数与总节点数计算，根节点计入两者，总数递归 `children`。 | 展开状态下 `可见 = 总数`；折叠节点后 `可见 < 总数`；空/未初始化根节点不报错。 |
| PLAN-3 | done | 在 `update()` 中同步统计文本，保持节点增删、折叠/展开、刷新后数值更新。 | 新增、删除、折叠、展开后统计变化符合节点树。 |
| PLAN-4 | done | 调整导航控件样式，避免统计文本挤压缩放滑条和百分比显示。 | 默认宽度、拖拽变窄/变宽、深浅主题下文本不溢出。 |
| PLAN-5 | done | 更新 `CHANGELOG.md`、`DESIGN.md` 和 `docs/capabilities/mindmap-editing.md`。 | 文档只记录当前推荐行为，不保留未采用方案。 |
| PLAN-6 | done | 运行构建和文档校验，并同步到本地 Obsidian 插件目录供运行时验证。 | `npm run build` 通过；Dev Flow 文档校验通过；本地插件目录含最新 `main.js` 和 `styles.css`。 |

## 验收标准

- 导航控件显示类似 `12 / 38 节点` 的统计文本。
- 根节点计入统计。
- 折叠分支后可见节点数减少，总节点数不变。
- 新增或删除节点后两个统计值按节点树同步。
- 统计文本不影响小视图点击、视口拖拽、缩放滑条、加减按钮、隐藏/恢复和面板四角拖拽缩放。

## 产物路由

- 计划：`docs/plans/2026-07-07-navigator-node-count.md`
- 代码：`src/mindmap/navigation/MindMapNavigatorController.ts`
- 样式：`styles.css`
- 能力文档：`docs/capabilities/mindmap-editing.md`
- 设计规则：`DESIGN.md`
- 发布说明：`CHANGELOG.md`
- 构建产物：`main.js`
- `docs/ai/context-map.md`：预计无需更新，因为导航 owner 路由已存在。

## 关闭方式

实施验证通过后，将本计划移动到 `docs/plans/archived/`，并在收尾时提交代码、样式、文档和构建产物。
