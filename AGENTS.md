# 仓库指南

## 项目结构与模块组织

这是一个 Obsidian 脑图插件。`src/main.ts` 是插件与命令入口，`src/MindMapView.ts` 管理视图，核心逻辑位于 `src/mindmap/`。设置代码在 `src/settings.ts` 和 `src/settingTab.ts`，翻译在 `src/lang/locale/`。`src/markmapLib/` 保存内置 Markmap 包内容，修改前需确认上游来源。根目录的 `styles.css`、`manifest.json`、`versions.json` 分别管理样式、插件元数据和版本兼容性；构建产物为 `main.js`。

## 构建、测试与本地开发

- `npm install`：安装依赖。
- `npm run dev`：监听源码并持续重建 `main.js`。
- `npm run build`：执行生产构建，验证 TypeScript 编译和打包。

本地验证时，将仓库置于测试 Vault 的 `.obsidian/plugins/obsidian-enhancing-mindmap/`，启用插件后重新加载 Obsidian。不要在真实 Vault 中做破坏性测试。

## 编码风格与命名

TypeScript 使用两空格缩进。类、视图和接口使用 `PascalCase`，函数、变量与字段使用 `camelCase`；语言文件使用区域代码，如 `pt-br.ts`。沿用相邻代码的引号和分号风格，不做无关格式化。新增界面文本时更新对应翻译键。

## 测试要求

仓库目前没有自动化测试或覆盖率门槛。每次变更至少运行 `npm run build`，并在 Obsidian 中验证受影响流程。编辑逻辑改动应检查节点增删改、撤销/重做、拖放及 Markdown/脑图视图切换；UI 改动应检查相关主题。

## 提交与合并请求

近期提交使用简短英文摘要，如 `Add "Cut" command`，无固定 Conventional Commits 前缀。每个提交只处理一个目的。合并请求应说明问题、实现方式和验证步骤，并关联 Issue；界面或交互变更需附截图或录屏，注明 Obsidian 版本和操作系统。

<!-- cuberhyk-dev-flow:start -->
## Dev Flow

- 模糊需求先使用 `dev-brainstorm`，明确任务使用 `dev-plan`，实施使用 `dev-branch`，审计使用 `dev-audit`。
- 稳定术语、能力、计划、审计和决策分别存放在 `CONTEXT.md`、`docs/capabilities/`、`docs/plans/`、`docs/audits/` 和 `docs/adr/`。
- 默认不读取计划、审计及归档目录；代码和测试与文档冲突时，以代码和测试为准。
- 提交、合并或删除分支前必须展示 `git status` 和 `git diff` 并取得明确批准；禁止自动推送。
<!-- cuberhyk-dev-flow:end -->
