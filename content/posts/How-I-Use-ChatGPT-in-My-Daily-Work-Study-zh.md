---
title: 我如何在日常工作与学习中使用 ChatGPT？
date: 2023-02-22 13:47:51
tags: [ChatGPT, AI, code generation, frontend, testing, software engineering]
lang: zh
i18n_key: How-I-Use-ChatGPT-in-My-Daily-Work-Study
permalink: zh/2023/02/22/How-I-Use-ChatGPT-in-My-Daily-Work-Study/
---

## 1. 背景

ChatGPT 自发布以来就获得了广泛关注，已成为许多专业人士的常用工具。尽管它已被广泛讨论，但探索 ChatGPT 如何在我们的日常工作中发挥作用仍然很重要。在这篇文章中，我将分享一些我认为特别实用的 ChatGPT 应用场景。

## 2. 使用方式

### 2.1 编程

### 2.1.2 生成代码

ChatGPT 可以为你生成代码。借助模块化技术，你可以用 ChatGPT 非常快速地生成一个大型系统。请参考我之前的文章：{% post_link Use-Modular-Design-with-ChatGPT-to-Generate-Code %}

### 2.1.2 解释代码

它可以非常清晰地解释你的代码。一个技巧是你应该尽可能提供上下文，否则机器人会根据函数名和参数来猜测函数的用途，这可能导致准确性降低。
下面是我从教材中随机挑选的一段代码片段。

<img alt="chatgpt" src="/img/chatgpt/chatgpt-17.png">

### 2.1.3 为我编写测试用例 / Storybook（以及更多内容）

我必须说，ChatGPT 在编写测试和 Storybook 用例方面堪称专家，我几乎不需要修改它给出的内容。让我们来看一个例子：

#### 2.1.3.1 单元测试

<img alt="chatgpt" src="/img/chatgpt/chatgpt-18.png">

```tsx
import { render, screen } from '@testing-library/react';
import MessageBubble from './MessageBubble';

describe('<MessageBubble />', () => {
  const text = 'Hello, world!';
  const direction = 'left';
  const imgUrl = 'https://via.placeholder.com/50';
  const username = 'Alice';

  it('should render the message text, avatar, and username', () => {
    render(
      <MessageBubble
        text={text}
        direction={direction}
        imgUrl={imgUrl}
        username={username}
      />
    );

    const messageText = screen.getByText(text);
    const avatarImg = screen.getByAltText(`${username}'s avatar`);
    const usernameText = screen.getByText(username);

    expect(messageText).toBeInTheDocument();
    expect(avatarImg).toHaveAttribute('src', imgUrl);
    expect(usernameText).toBeInTheDocument();
  });

  it('should display the message bubble in the correct direction', () => {
    render(
      <MessageBubble
        text={text}
        direction={direction}
        imgUrl={imgUrl}
        username={username}
      />
    );

    const messageBubble = screen.getByTestId('message-bubble');

    if (direction === 'left') {
      expect(messageBubble).toHaveClass('left');
    } else if (direction === 'right') {
      expect(messageBubble).toHaveClass('right');
    }
  });
});
```

#### 2.1.3.2 Storybook

<img alt="chatgpt" src="/img/chatgpt/chatgpt-19.png">

```tsx
import React from 'react';
import { Story, Meta } from '@storybook/react';
import MessageBubble, { MessageBubbleProps } from './MessageBubble';

export default {
  title: 'MessageBubble',
  component: MessageBubble,
} as Meta;

const Template: Story<MessageBubbleProps> = (args) => <MessageBubble {...args} />;

export const LeftBubble = Template.bind({});
LeftBubble.args = {
  text: 'Hello, world!',
  direction: 'left',
  imgUrl: 'https://via.placeholder.com/50',
  username: 'Alice',
};

export const RightBubble = Template.bind({});
RightBubble.args = {
  text: 'Hi there!',
  direction: 'right',
  imgUrl: 'https://via.placeholder.com/50',
  username: 'Bob',
};
```

## 2.2 文档

ChatGPT 在处理文档方面同样表现出色。以下是一些使用场景：

### 2.2.1 文档优化

- 优化前的段落：

> 背景：ChatGPT 在发布后一夜成名。每个人都在使用 ChatGPT，每个人都在谈论 ChatGPT。但它如何帮助我们的日常工作呢？今天我想分享一些我发现非常有用的 ChatGPT 使用案例。

- 优化后的段落：

> 背景：ChatGPT 自发布以来就获得了广泛关注，已成为许多专业人士的常用工具。尽管它已被广泛讨论，但探索 ChatGPT 如何在我们的日常工作中发挥作用仍然很重要。在这篇文章中，我将分享一些我认为特别实用的 ChatGPT 应用场景。

### 2.2.2 扩展你的想法

给 ChatGPT 以下文本：
> 盈利模式：
> 1. 会员制：向会员按月收费以获取利润。
> 2. 广告：使用 Google 广告来盈利。
> 3. 捐赠：添加一个"请我喝咖啡"页面供人们捐款。
> 帮我扩展这个盈利模式。

扩展后：
> 1. 高级功能：提供只能通过付费订阅或一次性付款才能访问的高级或独家功能。这可以包括更深入的分析、个性化推荐，或访问更大的信息数据库。
> 2. 联盟营销：与其他公司合作，从通过推荐链接销售的产品或服务中赚取佣金。这是一种在推广符合受众兴趣的产品的同时赚取额外收入的好方法。
> .....

### 2.2.3 摘要

让 ChatGPT 对上面的段落进行总结：
该段落讨论了平台或细分领域不同的变现方式。可以对高级功能收费；联盟营销通过推荐链接赚取佣金；赞助涉及与相关品牌合作创作付费内容；咨询允许提供专家建议并收费；电商涉及销售与平台或细分领域相关的产品；许可允许其他组织使用你的内容或数据以实现变现。
也可以随意让它总结更长的文本，比如一本书。

## 2.3 设计

### 2.3.1 我应该用什么？（依赖选型）

向 ChatGPT 描述你的需求，ChatGPT 会帮你找到合适的工具。
我要创建一个社交网络应用，负载主要在查询用户关系上，我希望数据库设计更简单，我应该使用什么数据库？
以下是答案：
如果你想要更简单的数据库设计，并且主要关注点是查询用户关系，那么图数据库可能是你社交网络应用的一个好选择。
Neo4j 或 Amazon Neptune 等图数据库专门为处理数据点之间的复杂关系而设计，非常适合用户通过各种关系相互连接的社交网络应用。在图数据库中，关系是一等公民，数据模型以节点（代表实体）和边（代表节点之间的关系）为中心。这可以使查询和分析关系更加直观和高效。
此外，图数据库针对关系遍历进行了优化，这可以使某些类型的查询比传统关系型数据库更快。它们还被设计为水平扩展，因此可以处理大量数据和流量。
总体而言，如果你的重点是用户关系并且想要更简单的数据模型，图数据库可能是个好选择。但是，仔细评估你的具体需求并咨询数据库专家或开发团队以确定最适合你应用的方案非常重要。

## 2.4 学习

### 2.4.1 规划我的学习计划（学习路线图生成）

问：
> 我想成为一名前端开发者，我应该学习哪些主题？

答：
> 如果你想成为一名前端开发者，你应该从学习以下主题开始：
> 1. HTML：超文本标记语言是每个网站的基础，用于构建和组织内容。
> 2. CSS：层叠样式表用于网站的样式和设计，使其在视觉上美观且具有响应性。
> 3. JavaScript：一种用于向网站添加交互性、动态行为和功能的编程语言。
> 4. 用户体验（UX）：UX 设计旨在创建直观易用的网站，为用户提供积极的体验。
> .....

### 2.4.2 推荐免费学习资源

问：
> 我想作为初学者学习 ReactJS，你推荐我学习哪些免费资源？

答：
> 作为初学者学习 ReactJS 有很多免费资源可用。以下是我推荐的一些最佳免费资源：
> 1. ReactJS 官方文档：ReactJS 官方网站提供了涵盖从基础到高级主题的详尽文档和教程。
> 2. Codecademy 的 ReactJS 教程：Codecademy 提供了一个免费的交互式教程，涵盖 ReactJS 的基础知识并帮助你构建第一个 React 应用。
> 3. Traversy Media 的 ReactJS 速成课程：这个免费的 YouTube 视频教程是 ReactJS 的绝佳入门教程，涵盖创建组件和处理状态的基础知识。
> 4. Egghead 的 ReactJS 基础课程：Egghead 是一个提供各种编程主题免费和付费课程的平台，包括 ReactJS。ReactJS 基础课程是初学者的绝佳资源，涵盖 JSX、props 和 state 等主题。
> ......

### 2.4.3 我理解得对吗？

自学最大的痛点之一是没有老师来告诉你是否在以正确的方式学习和理解。ChatGPT 可以充当老师来告诉你是否做得正确。

#### 2.4.3.1 模拟考试

问：
> 模拟一场 ReactJS 考试，10 道题

答：
> 当然，这是一套有 10 道题的模拟考试，用于测试你对 ReactJS 的掌握程度：
> 1. 什么是 JSX，它与普通 JavaScript 语法有何不同？
> 2. ReactJS 中的组件是什么，你如何定义和使用组件？
> 3. React 中"props"对象的用途是什么，你如何从父组件向子组件传递数据？
> 4. React 中 state 和 props 的区别是什么，你何时会使用其中一个而不是另一个？
> 5. React 中的虚拟 DOM 是什么，它如何提升 Web 应用的性能？
> ......

#### 2.4.3.2 模拟面试

我：
> 你能为我模拟一场 TikTok 2-1 前端技术面试吗？

ChatGPT：
> 当然，我可以进行一场 TikTok 2-1 前端技术职位的模拟面试。这是第一个问题：
问题：你有使用 React.js 的经验吗？你是如何在以往的项目中使用它的？

我：
> 我有 3 年的 ReactJS 使用经验，我在自己的副业项目和工作中都用过它。

ChatGPT：
> 很好！你能告诉我你在之前的某个项目中使用 React.js 实现的一个具体功能吗？在实现过程中你遇到了哪些挑战，你是如何克服的？
> ......

## 3. 总结

ChatGPT 可以帮助我们编写代码、解释代码、编写测试用例和文档，甚至通过模拟考试和面试充当老师。随着它每天变得越来越强大，未来它能做的事情会更多。有效使用 ChatGPT 的关键在于将大问题分解为小问题，并为 AI 模型提供清晰的上下文。总体而言，ChatGPT 是优化工作流程和提高生产力的强大工具。我希望看到更多关于它的使用案例。
