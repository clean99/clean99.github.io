## Context

`themes/minima/layout/layout.ejs` 是博客所有页面的主模板。当前存在两类冗余代码：
1. 第 18 行：`var title = title = config.title` — 双重赋值，语义混乱
2. 第 33、62、78 行：`.replace(/index\.html$/, '').replace(/index\.html$/, '')` — 同一正则执行两次，第二次永远空操作

这些是纯代码质量问题，不涉及功能变更。

## Goals / Non-Goals

**Goals:**
- 消除冗余赋值和重复调用，提升代码可读性
- 保持完全相同的运行时行为（零功能变更）

**Non-Goals:**
- 不重构 title 的条件逻辑（那是业务逻辑，不在本次范围内）
- 不修复其他代码异味（如 description 的重复模板代码）
- 不改变 URL 清理策略

## Decisions

### Decision 1: 直接原地修复，不抽取辅助函数

将 `var title = title = config.title` 改为 `var title = config.title`，将重复的 `.replace()` 链改为单次调用。

**为什么不抽取 `cleanUrl()` 辅助函数？** 虽然 3 处 URL 清理逻辑相同，但 EJS 模板中引入辅助函数会增加复杂度，且这 3 行都是单行内联表达式，清晰度已经足够。遵循"三行清晰代码优于一个过早抽象"的原则。

**替代方案：** 在 Hexo scripts 中注册 `clean_url` helper → 过度设计，不值得。

## Risks / Trade-offs

- **风险：修改后行为不一致** → 极低。第二次 `.replace()` 的输入已经不含 `index.html`，所以它本就是空操作。去掉后行为完全相同。
- **风险：模板渲染出错** → 通过本地 `hexo generate` 验证即可排除。
