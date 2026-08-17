---
artifact_type: capability
status: current
updated: 2026-08-17
source_of_truth: code
adr_reviewed: not_required
---

# 脑图文件身份

## 职责

描述脑图 Markdown 的身份判定、专属图标复用范围，以及桌面文件资源管理器适配的 owner 与生命周期。

## 当前行为

- 脑图文档仍是标准 `.md` 文件；只有 frontmatter `mindmap-plugin` 的值严格等于 `basic` 时才具有脑图文件身份，属性缺失、空值或其他值均按普通 Markdown 处理。
- `enhancing-mindmap-file` 是脑图文档专属图标的唯一 ID；脑图视图、标签页、新建脑图和“以脑图打开”等入口复用该图标。
- 图标使用 `0 0 100 100` 视区内的文档轮廓与导图分支组合，颜色继承 `currentColor`，文件资源管理器中的实例仅作装饰并设置 `aria-hidden`。
- `MindMapFileIconController` 只通过 `MetadataCache` 判断文件身份，不为图标显示读取或写入 Markdown 正文。
- controller 在工作区布局就绪后观察当前桌面文件资源管理器的 `.nav-files-container`；只扫描其中可见且带 `data-path` 的文件行，并按动画帧合并元数据、Vault、布局和 DOM 变化触发的刷新。
- 文件资源管理器 DOM 是非公开宿主契约。预期的容器、文件行或标题内容不存在时，controller 安全跳过，不改变文件树交互或创建替代文件类型。
- 重复刷新不会重复插入插件图标；frontmatter 不再匹配、文件行被复用或插件卸载时，controller 移除专属 class、SVG 和自定义图标注册，取消待执行刷新并断开 MutationObserver。
- 第一版只承诺桌面主窗口文件资源管理器；移动端、浮动窗口和未来 Obsidian DOM 版本需要单独验证后才能纳入兼容范围。

## 代码入口

- 身份、图标与文件树生命周期：`src/mindmap/file/MindMapFileIconController.ts`
- frontmatter 键与新建文件内容：`src/constants.ts`
- 插件级挂载与相关菜单：`src/main.ts`
- 脑图视图图标：`src/MindMapView.ts`
- 文件树对齐样式：`styles.css`

## 验证

- 自动验证：`npm run build`。
- 确定性检查：严格 `basic` 判定、无 Vault 正文 I/O、限定文件树 observer、动画帧取消、observer 断开和 DOM 清理路径。
- 桌面测试 Vault：普通/脑图文件初始图标，frontmatter 改为其他值后移除并恢复，重命名/移动/删除，目录折叠展开，插件禁用/启用，以及深色、浅色和非默认主题。
