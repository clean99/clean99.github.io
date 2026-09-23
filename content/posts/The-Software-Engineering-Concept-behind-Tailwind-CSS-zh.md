---
title: Tailwind CSS 背后的软件工程理念（与 StyleX 对比）
date: 2024-04-10 18:45:47
tags: [Software Engineering, Frontend]
lang: zh
i18n_key: The-Software-Engineering-Concept-behind-Tailwind-CSS
permalink: zh/2024/04/10/The-Software-Engineering-Concept-behind-Tailwind-CSS/
---

## 背景

本文将向你展示 TailwindCSS 如何通过在特定场景下更好地组织代码，真正提升我们的**生产力**和项目的**可维护性**。

## 性能影响

> TailwindCSS 会如何影响我们网站的性能？

这是大多数开发者关心的关键问题，但这不是本文要讨论的主要话题。更多信息请查看[控制文件大小 - Tailwind CSS](https://v1.tailwindcss.com/docs/controlling-file-size) 官方文档。该文档的基本结论是，引入 TailwindCSS 很难产生超过 **10kb** 的压缩 CSS。

## CSS 的设计

CSS 的设计受到了 HTML 设计的影响。CSS 在 HTML 诞生时就出现了，并已使用超过 20 年。我们知道，在 React/Vue 等库/框架出现之前，网站被分为 HTML、CSS 和 JavaScript。网站页面没有模块化的概念。每个网站页面都写在单个 HTML/CSS/JavaScript 文件中。
为了提供一种抽象手段来复用样式，CSS 提供了 class 来帮助开发者组合样式并在不同地方复用它们。

```html
// Without CSS Class feature
<p style="color: red; font-weight: bold;">This is a highlighted paragraph.</p>
<p style="color: red; font-weight: bold;">Another highlighted paragraph.</p>

// Class provide means of abstraction
// HTML
<p class="highlight">This is a highlighted paragraph.</p>
<p class="highlight">Another highlighted paragraph.</p>
// CSS
.highlight {
    color: red;
    font-weight: bold;
}
```

## React 带来了模块化，使 CSS 类变得多余

React 开始在网站中使用模块化概念，将网站视为页面的组合，而页面是组件的组合。每个组件都有自己的 HTML 结构（JSX）、样式（CSS）和逻辑（JS），可以作为模块复用。

<img alt="Tailwind CSS 1" src="/img/tailwindcss/1.png">

上面的例子在 React 中是这样的：

```jsx
const HighlightP = ({ children }) => (<p class="highlight">{children}</p>)
// CSS
.highlight {
    color: red;
    font-weight: bold;
}
// App
<HighlightP>This is a highlighted paragraph.</HighlightP>
<HighlightP>Another highlighted paragraph.</HighlightP>
```

我们很快发现，CSS 提供的 class 是多余的，因为 React 已经包含了样式在内的模块化：

```jsx
const HighlightP = ({ children }) => (<p style={{ color: 'red', fontWeight: 'bold' }}>{children}</p>)

// App
<HighlightP>This is a highlighted paragraph.</HighlightP>
<HighlightP>Another highlighted paragraph.</HighlightP>
```

这样做，我们减少了从 CSS class 到 React 组件的映射。这就是 TailwindCSS 的基本概念。

你可能会问 CSS class 有什么问题？让我们再多做一些比较：
1. **命名很难。** 通过写 CSS class，你必须为每个想要添加样式的节点起一个名字。这是在浪费精力。
2. **同一组件的代码分散各处。** 如果你写 CSS class，你需要在两个地方放置组件代码，可读性和可维护性下降。例如，删除代码时，你可能忘记删除对应的 CSS class。
3. **避免 Bug。** CSS 是全局的，当你进行修改时，可能会意外地覆盖某些样式。

## 使用 TailwindCSS 替代内联样式

TailwindCSS 提供了比内联样式更好的功能：
1. 在约束下进行设计。使用内联样式时，每个值都是一个魔法数字。使用工具类，你从预定义的[设计系统](https://tailwindcss.com/docs/theme)中选择样式，这使得构建视觉上一致的 UI 更加容易。

```js
/** @type {import('tailwindcss').Config} */
module.exports = {
  theme: {
    screens: {
      sm: '480px',
      md: '768px',
      lg: '976px',
      xl: '1440px',
    },
    colors: {
      'blue': '#1fb6ff',
      'purple': '#7e5bef',
      'pink': '#ff49db',
    // ...
}
```

3. 响应式设计。你不能在内联样式中使用媒体查询，但你可以使用 Tailwind 的[响应式工具](https://tailwindcss.com/docs/responsive-design)来轻松构建完全响应式的界面。
```HTML
<!-- Width of 16 by default, 32 on medium screens, and 48 on large screens -->
<img class="w-16 md:w-32 lg:w-48" src="...">

// CSS
@media (min-width: 640px) { ... }
5. Hover、focus 及其他状态。内联样式无法针对 hover 或 focus 等状态，但 Tailwind 的[状态变体](https://tailwindcss.com/docs/hover-focus-and-other-states)使使用工具类轻松为这些状态设置样式成为可能。
<button class="bg-sky-500 hover:bg-sky-700 ...">
  Save changes
</button>

// CSS
.btn-primary {
  background-color: #0ea5e9;
}
.btn-primary:hover {
  background-color: #0369a1;
}
```

## StyleX 简介

Meta 最近开源了一个新的 CSS 框架 [StyleX](https://stylexjs.com/)。它提供了一种与 TailwindCSS 不同的 CSS 代码组织方式。

我做了一些调研，想在这里分享 StyleX 的核心理念。

## OOCSS（面向对象 CSS）约定

StyleX 认为工具类让 HTML 标记的可读性变差。因此他们仍然使用传统的 OOCSS 作为组织代码的方式。

```jsx
import * as stylex from '@stylexjs/stylex';

const styles = stylex.create({
  foo: {
    color: 'red',
  },
  bar: {
    backgroundColor: 'blue',
  },
});

function MyComponent({style}) {
  return <div {...stylex.props(styles.foo, styles.bar, style)} />;
}
```

同时，它通过使用 CSS-in-JS、TypeScript 和编译，设法解决了 OOCSS 架构的一些问题：
1. 模块化：传统 OOCSS 是全局的，模块化程度差。StyleX 将样式定义为组件 JS 代码中的标记，使其局部化。
2. 类型安全的 CSS：通过使用 TypeScript，StyleX 像组件的其他 props 一样是类型安全的。

```ts
type alignContent =
  | 'flex-start'
  | 'flex-end'
  | 'center'
  | 'space-between'
  | 'space-around'
  | 'stretch'
  | all;
```

4. 避免 CSS 膨胀（？）：根据官方文档，StyleX 不仅在合并多个选择器时，而且在合并多个简写和全称属性时（例如 margin vs margin-top），都能产生确定性的结果。
但当我在本地尝试时，它并没有成功合并任何内容。

```
const s = stylex.create({
  foo: {
    color: "red",
    margin: 10,
    marginTop: 6,
  },
  zoo: {
    color: "blue",
  }
});

export default function Home() {
  return (
    <main {...stylex.props(s.foo, s.zoo)}>
    </main>
  );
}

// after complie

.x1oin6zd:not(#\#) {
  margin: 10px;
}
.xju2f9n:not(#\#):not(#\#) {
  color: blue;
}
.x1e2nbdu:not(#\#):not(#\#) {
  color: red;
}
.x1k70j0n:not(#\#):not(#\#):not(#\#) {
  margin-top: 6px;
}
```

<img alt="Tailwind CSS 2" src="/img/tailwindcss/2.png">

## 结论

- 性能：随着代码库中 class 的增长，性能会变低，但如果是小项目，它可能会优于 TailwindCSS，因为 TailwindCSS 会导入不必要的工具类，而 StyleX 只导入我们在代码中编写的内容。
- 可维护性和可读性：工具类（TailwindCSS）有其优势，但会让 HTML 标记变得难看；StyleX 解决了 OOCSS 的一些问题，但仍然留下了命名和 class 膨胀未解决的问题。
