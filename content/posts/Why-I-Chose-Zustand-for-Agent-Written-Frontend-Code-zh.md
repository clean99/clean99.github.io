---
title: "AI 时代的状态管理选型：我选 Zustand"
date: 2026-11-23 09:30:00
tags: [Frontend, React, AI, Software Engineering]
area: engineering
summary: "团队要靠 Coding Agent 完成一次大型电商 Web 迁移。动工前我对比了 useEffect 联动、Redux Toolkit、MobX、Jotai 和 Zustand，最后选了 Zustand，并给它配了目录、Lint 和验证三层约束。"
description: "代码主要由 Coding Agent 来写时，前端状态管理怎么选：useEffect 联动、Redux Toolkit、MobX、Jotai 各自的短板，Zustand 合适的原因，以及配套的目录、Lint 和验证约束。"
lang: zh
i18n_key: Why-I-Chose-Zustand-for-Agent-Written-Frontend-Code
permalink: zh/2026/11/23/Why-I-Chose-Zustand-for-Agent-Written-Frontend-Code/
---

团队最近启动了一次规模很大的重构：把一个电商平台的 Web 端整体迁到另一个代码仓库，后续大量页面和能力会在新仓库里复用、演进。历史包袱重，业务链路长，靠人一行行手写做不完。我们决定大量使用 Coding Agent，让它理解旧逻辑、生成新代码、补齐验证。

新的风险跟着来了。AI 把写代码的速度提高了很多，开发者很难再逐行吃透它写出的每个细节。仓库的架构边界模糊、状态流转里藏着各种约定时，Agent 会很快产出一批看起来能跑、实际埋着隐患的代码，也就是常说的 AI Slop。

正式动工之前，我把面向 AI 协作的前端工程选型梳理了一遍，重点是状态管理。`useEffect` 局部拼接、Redux Toolkit、MobX、Jotai、Zustand 逐个对比之后，我选了 Zustand。

## useEffect 联动：Agent 最容易写坏的地方

AI 工程实践里有一个核心判断：凡是要靠分寸感和隐含上下文才能用好的特性，到了 AI 手里都容易写成 Slop。前端里最典型的例子，是用 `useEffect` 做状态联动。

代码的因果关系摆在眼前，这对人重要，对 AI 更重要。一次用户操作的前因后果，最好写在同一个处理函数里，顺着往下读就能看完。以商品详情页的「加入购物车」为例：如果拆成先改一个状态、再由 `useEffect` 监听这个状态去触发下一步，读代码的人就得在脑子里多记几件事。

- 哪些地方会修改这个状态，别的分支会不会顺手把它改掉。
- 这段 effect 什么时候触发，依赖变化时会不会多执行一次。
- 页面卸载或状态切换时，副作用要不要清理。

这些事人都容易漏记。Agent 每次工作能读入的文件有限，散落在其他文件里、要靠推断才能串起来的触发链，是它最容易遗漏的部分，也最容易在这里写出竞态和死循环。

重构立项时，我们为此定了一条基本原则：把复杂的状态流转和副作用从组件里移出去，收进一个清晰、单一、读一遍就能看全的状态层。组件里原先靠 `useEffect` 拼出来的业务逻辑，都搬进这一层。

## Redux Toolkit、MobX、Jotai：交给 Agent 时各自的短板

状态和动作要集中管理，成熟的状态库有好几个，它们的区别主要在状态变更要守什么规矩。放到和 Agent 协作的场景里看，三个备选方案各有一处短板。

### Redux Toolkit：变更轨迹清楚，样板多

Redux 的变更轨迹非常清楚：组件派发 Action，Reducer 用纯函数算出新状态。代价是样板和概念多。一个完整的异步加购流程包括开始请求、成功后更新角标、失败后弹出提示，写下来往往要涉及 Slice、Thunk、ExtraReducers、Selector 和顶层 Provider。Agent 改一个功能，经常要跨多处补胶水代码，上下文窗口被占掉一大块，复杂的异步分支里也容易写得繁琐，或者漏掉某个状态。

### MobX：写起来顺，依赖是隐式的

MobX 直接修改属性，依赖追踪和界面更新自动完成。复杂的电商场景里，状态树一大、异步回调一多，谁改了哪个属性、一连串刷新由什么触发，从代码上很难直接看出来。Agent 也容易顺手写出到处修改状态、靠隐式反应驱动的代码，后期排查成本高。

### Jotai：细粒度更新好用，多步流程容易散

Jotai 把状态拆成一个个独立的 Atom，局部的细粒度更新做得很漂亮。电商是流程很重的业务，一次加购要同时协调商品列表、Loading 状态、错误提示和购物车角标，一个动作得操作好几个分散的 Atom。业务规模上来以后 Atom 数量膨胀，Agent 在多步流转里很容易漏改某个关联状态。

## Zustand：集中管理，单向流转，样板少

对比下来，Zustand 保留了 Redux 集中管理、单向流转的做法，同时去掉了大部分样板。它有四个特点，正好适合交给 Agent 来写。

### 写法单一：Agent 产出的结构一致

一个框架如果有十种流派、五种逃生舱，Agent 写出来的代码就容易风格不一。Zustand 从头到尾基本只有一种标准写法：用 `create` 创建 Store，里面一半是状态数据，一半是修改状态的方法（Action）。它不需要 Action Type 常量，也不需要套多层 `<Provider>`。Agent 每次读到的模板和写出的代码结构高度一致，风格分裂少了很多。

### 因果同处：一次操作写在一个函数里

还是「加入购物车」，用 Zustand 写出来是这样：

```tsx
import { create } from 'zustand';

interface CartState {
  items: string[];
  loading: boolean;
  error: string | null;
  addItem: (sku: string) => Promise<void>;
}

const useCartStore = create<CartState>((set) => ({
  items: [],
  loading: false,
  error: null,
  addItem: async (sku) => {
    set({ loading: true, error: null });
    try {
      const addedSku = await addToCartApi(sku);
      set((state) => ({
        items: [...state.items, addedSku],
        loading: false,
      }));
    } catch (e: any) {
      set({
        error: e.message ?? '加购失败',
        loading: false,
      });
    }
  },
}));
```

组件一侧很干净：顶部导航栏订阅 `items.length` 展示角标，商品页按钮在 `onClick` 里调用 `addItem('SKU-1001')`。发起请求、切 Loading、更新列表、捕获异常，整条因果链在 `addItem` 这一个函数里按顺序写完。Agent 读这一个函数就能看全，组件里监听状态变化的 `useEffect` 也就省掉了。

### 上下文紧凑：一个 Store 一个文件

大型迁移项目里，Agent 每次修改一个功能，最好能在一个紧凑的上下文窗口内看全前因后果。Zustand 的单个业务 Store 通常只有一两百行，状态定义、类型约束、异步动作都在同一个文件里。Agent 读一次就能掌握所有约束，省 Token，改得也准。

### 脱离 React 运行：方便自动化验证

Agent 写完代码后能不能自己跑验证，决定了我们对它的信任程度。Zustand 的 Store 不强绑定 React 组件树，在纯 TypeScript 单元测试或 Node 脚本里，通过 `useCartStore.getState()` 就能读取状态、调用动作，验证状态流转是否符合预期，测试成本很低。

## 配套约束：目录、Lint 与验证

Zustand 的短处是太自由。不加约束时，Agent 和开发者都可能把杂七杂八的逻辑塞进一个巨型 Store，或者在组件里直接调用 `setState`，绕开动作方法。

这次仓库改造里，规范写进文档的同时，会配合三层工程约束一起落地。

1. 目录结构即边界。按业务域（Feature）拆分 Store，公共层与业务层单向依赖，模块之间不能随意引用对方的内部状态。
2. Lint 规则封住逃生舱。业务组件用 `useEffect` 做状态同步受到严格限制；组件只能调用 Store 暴露的具名 Action，外部代码不能直接修改底层状态字段。
3. 验证闭环兜底。Agent 改完 Store 和界面后，要同步补齐状态流转的单测和端到端冒烟验证。人工 Review 的重心从逐行检查语法和副作用隐患，转到查看运行产物、确认业务意图是否对齐。

## 选型标准：边界清晰，上下文紧凑，出错空间小

AI 时代做技术选型，标准在变。过去我们优先考虑人写起来有多炫、抽象有多灵活；现在更要考虑边界有多清晰、上下文有多紧凑、AI 犯错的空间有多小。

面对这次规模的迁移，Zustand 用很简单的结构把状态和副作用收到了一处，代码的前因后果重新摆在眼前，我们也敢把更大范围的编码工作交给 Agent 去推进。
