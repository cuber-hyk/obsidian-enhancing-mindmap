---
artifact_type: audit
status: archived
created: 2026-07-18
updated: 2026-07-19
scope: "脑图视图的颜色、主题与 CSS 样式来源，以及重新打开时样式变化的原因"
source_of_truth: code
---

# 脑图样式管理审计

## Scope

审查脑图画布、节点、连线和分支颜色的来源、设置持久化路径与视图初始化行为；不修改实现，不审查导出图片的样式复制逻辑。

## Fact Sources

- Code: `src/MindMapView.ts`、`src/mindmap/mindmap.ts`、`src/mindmap/Layout.ts`、`src/settings.ts`、`src/settingTab.ts`、`styles.css`、`src/main.ts`
- Tests: 仓库没有自动化测试框架。
- Docs: `CONTEXT.md`、`docs/ai/context-map.md`、`docs/capabilities/mindmap-editing.md`
- Runtime checks: 代码静态追踪；已将构建产物部署到 `E:\Learning-materials\Obsidian\LLM` 的本地插件目录，用户于 2026-07-19 确认模板侧栏交互与样式保存验收通过。

## Findings

Allowed finding statuses:

- `open`: confirmed or strong finding that still needs routing or work.
- `planned`: finding is assigned to a plan and owned by follow-up work.
- `resolved`: finding has been handled; record the closeout reason such as `fixed`, `accepted_risk`, `wont_fix`, or `not_reproducible`.
- `verified`: fix or disposition has been verified and the finding is closed.

| ID | Severity | Status | Finding | Evidence | Owner Plan | Branch/Commit | Verification | Closeout |
|---|---|---|---|---|---|---|---|---|
| STYLE-1 | P2 | verified | 已由固定样式模板调色板取代随机颜色；模板 ID 保存在每张脑图的 frontmatter。 | `src/mindmap/style/MindMapStyle.ts`；`src/MindMapView.ts`；`src/mindmap/Layout.ts`；`randomcolor` 已从源码与包依赖移除。 | `docs/plans/archived/2026-07-19-mindmap-style-templates.md` | `codex/20260719-mindmap-style-templates` | `npm run build` 通过；用户于 2026-07-19 在测试 Vault 确认模板应用和关闭重开验收通过。 | fixed and user-verified. |
| STYLE-2 | P3 | verified | 无效的插件 `theme` 设置字段和 `mm-theme-*` 类已删除；模板通过集中 CSS 变量驱动节点外观，仍使用 Obsidian 宿主变量保证主题可读性。 | `src/settings.ts`；`src/mindmap/mindmap.ts`；`src/mindmap/style/MindMapStyle.ts`；`styles.css`。 | `docs/plans/archived/2026-07-19-mindmap-style-templates.md` | `codex/20260719-mindmap-style-templates` | `npm run build` 通过；用户于 2026-07-19 在测试 Vault 确认样式模板交互验收通过。 | fixed and user-verified. |

## ADR Gate

- Needed: no
- Reason: 稳定颜色策略属于局部 UI 行为，可在实施计划中确认，无需不可逆架构决策。

## Verification

- Commands run: `rg` 静态检索样式、主题、颜色及持久化调用；`npm run build`。
- Runtime: 用户于 2026-07-19 在测试 Vault 确认右侧检查器、连续样式比较、点击保存和关闭重开流程通过。

## Git Visibility

- 本文件创建后需要运行 `git status --short --branch --untracked-files=all`，确认可被 Git 跟踪。

## Closeout

During `dev-distill`, choose one final action:

- Keep active: leave `status: active` in `docs/audits/` while any finding remains `open`, `planned`,
  or `resolved` without a closeout reason that no longer needs verification.
- Archive: set `status: archived` and move to `docs/audits/archived/` only after every finding is
  `verified`, or `resolved` with `accepted_risk`, `wont_fix`, `not_reproducible`, or fully
  transferred to a still-active plan that owns follow-up.
- Delete: remove this file only when stable conclusions are represented elsewhere, all findings are
  closed or transferred, and the raw evidence has no future value.

Do not use `distilled` as a final state.
