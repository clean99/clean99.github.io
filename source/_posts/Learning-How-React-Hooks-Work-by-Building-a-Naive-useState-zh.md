---
title: 通过实现一个简易版 useState 来学习 React Hooks 的工作原理
date: 2024-04-10 18:49:41
tags: [Software Engineering, Frontend, React]
lang: zh
i18n_key: Learning-How-React-Hooks-Work-by-Building-a-Naive-useState
permalink: zh/2024/04/10/Learning-How-React-Hooks-Work-by-Building-a-Naive-useState/
---

## 一道面试题

你在面试中有没有被问到过这样的问题？
- 为什么 React Hook 不能写在条件语句或循环语句中？

（这是一道典型的中国风面试题，我们称之为"八股文"——这类问题太过经典，大家背下来就能答出来。）

在这篇文章中，我们将深入了解其背后的**软件工程原理**。学完这些原理后，你将很容易理解其他状态管理工具（如 Redux、Jotai）的工作方式。

## Hook 的规则

- 不要在`循环`、`条件`或`嵌套函数`中调用 Hook

## 通过实现一个简易版 useState 来学习 React Hooks 的工作原理

### 第一部分：什么是状态（State）？

> 状态不过是一个 `getter`（读取器）和一个 `setter`（设置器）。

`state`（状态）的概念几乎存在于所有编程语言中。（部分编程语言因为状态带来的问题，改用 `stream`（流）来代替。）
- 它是一种强大的抽象，因为我们通常将世界看作由许多独立对象组成，每个对象都有随时间变化的状态。
- 如果一个对象的行为受其**历史**影响，则称该对象"具有状态"。

用 JavaScript 举个例子：
假设我们要构建一个银行账户系统。是否能从账户中取出一定金额，取决于存款和取款交易的**历史记录**。

```js
function bankAccount(deposit){
    let balance = deposit;

    return (amount) => {
        // check amount history and decide whether to withdraw
        if (balance >= amount) {
            balance -= amount;
            return true;
        }
        return false;
    }
}

const withdraw = bankAccount(666);
// success, balance is 111 now.
withdraw(555);
// failed
withdraw(666);
```

可以看出，在 JavaScript 中，状态非常简单：
- `初始化`：使用 `let` 关键字定义一个状态，例如 `let balance = 50;`
- `setter`：使用 `=` 赋值（设置）新状态，例如 `balance = 666;`
- `getter`：使用变量名读取状态值，例如 `balance`

### 第二部分：实现 useState

一旦你理解了状态的本质，你就能轻松理解 React 的状态了。

> React 的状态，本质上就是在 React 组件中加入了重新渲染机制的状态抽象。

接下来我将一步步演示如何构建一个 `useState`。在此之前，先梳理一下 React 状态需要的功能：
- `初始化`：初始化一个状态。在 React 中，`useState()` 在组件中初始化一个状态。
- `getter`：`useState()` 返回数组的第一个值是 `getter`。
- `setter`：`useState()` 返回数组的第二个值是 `setter`。
- `重新渲染`：当状态更新时，应该使用最新状态触发 React 组件`重新渲染`。

```js
// init a state balance with value 666
// get state using balance
// set state using setBalance method
const [balance, setBalance] = useState(666);
Javascript already provides a state abstraction, and react provides a function render to rerender a component. Let's build our useState upon these abstraction.
let state;
function useState(initialValue) {
    state = state || initialValue;
    function setter(newState) {
        state = newState;
        render(<App />, document.getElementById('root'));
    }
    return [state, setter];
}
```

以下是如何使用我们自己实现的状态：

```js
const App = () => {
    const [balance, setBalance] = useState(666);

    return (<div onClick={() => setBalance(888)}>{balance}</div>);
}
```

目前运行得不错！但随着 React 组件变得更复杂，我们发现这个实现还不够完善——当声明**多个状态**时就会出问题。

#### 多个状态

当我们添加一个 name 状态时，就会出错：

```js
const App = () => {
    const [balance, setBalance] = useState(666);
    const [name, setName] = useState('handsome');

    return (<div onClick={() => setBalance(888)}>
        {balance}
        I'm {name}
    </div>);
}

// return: 666 I'm 666, should be: 666 I'm handsome
```

这是因为我们只用一个变量存储了所有`状态`。现在我们将其改为`数组（列表）`，并使用一个`游标`来标识当前状态的索引，以便获取正确的状态：

```js
let state = [];
let cursor = 0;

function useState(initialValue) {
    // get current cursor by order
    const currentCursor = cursor;
    state[currentCursor] = state[currentCursor] || initialValue;
    // assign next cursor to next useState
    cursor++;
    function setter(newState) {
        state[currentCursor] = newState;
        // reset cursor
        cursor = 0;
        render(<App />, document.getElementById('root'));
    }
    return [state[currentCursor], setter];
}
```

现在来看看执行以下代码时会发生什么：

```js
const [balance, setBalance] = useState(666);
// state = [666], cursor = 1
// balance = state[0]
// setBalance = (newState) => state[0] = newState //...

const [name, setName] = useState('handsome');
// state = [666, 'handsome'], cursor = 2
// name = state[1]
// setBalance = (newState) => state[1] = newState //...

// When we call setter:
setBalance(777);
// state = [777, 'handsome'], cursor = 0, rerender
```

#### 为什么顺序如此重要？

如你所见，顺序非常重要，因为我们使用数组和索引来帮助 `useState` 映射到正确的状态 getter 和 setter。

来看看如果在条件语句中写 `hook` 会发生什么：

```js
let firstRender = true;

if (balance === '666') {
    const [balance, setBalance] = useState(666);
    firstRender = false;
}

const [name, setName] = useState('handsome');

setBalance(777);
First render, the if statement is true, it executes as previous:
const [balance, setBalance] = useState(666);
// state = [666], cursor = 1
// balance = state[0]
// setBalance = (newState) => state[0] = newState //...

const [name, setName] = useState('handsome');
// state = [666, 'handsome'], cursor = 2
// name = state[1]
// setBalance = (newState) => state[1] = newState //...
After setBalance is called, if become false and rerender:
// When we call setter:
setBalance(777);
// state = [777, 'handsome'], cursor = 0, rerender

const [balance, setBalance] = useState(666);
// state = [666], cursor = 1
// balance = state[0]
// setBalance = (newState) => state[0] = newState //...


const [name, setName] = useState('handsome');
// state = [666, 'handsome'], cursor = 1
// name = state[0]
// setBalance = (newState) => state[0] = newState //...
```

可以看到，`name` 状态由于使用了错误的`游标`，被映射到了错误的状态。这就是为什么在 React 中，我们不能使用条件语句或循环语句来打乱状态的执行顺序。
