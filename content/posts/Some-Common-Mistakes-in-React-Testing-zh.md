---
title: React 测试中的常见错误
date: 2022-07-24 17:49:27
tags: testing
lang: zh
i18n_key: Some-Common-Mistakes-in-React-Testing
permalink: zh/2022/07/24/Some-Common-Mistakes-in-React-Testing/
---

大多数前端开发者（至少是我遇到的那些）不喜欢写测试。我问过他们原因，答案很简单：_我们没有时间做这件事！_ 好吧，我想告诉你，**用正确的方式**写测试会显著提升你的开发效率（尤其是从长远来看），而不是浪费你的时间。

写测试会迫使你思考自己的抽象是否合理，如果不合理，你甚至**根本无法对它进行测试**。而如果你对自己的抽象能做什么没有充分的理解，在为它写测试时就会**手忙脚乱**。这正是一些人不喜欢写测试的原因所在。但如果你开始为项目写测试，你将获得提升编程能力的好处。

我希望在你测试之旅的起点，就帮助你写出更**简洁**、更**合理**的测试，让你真正从测试中受益。以下是你在写测试时应该避免的一些错误：

### 错误一：测试实现细节

这是测试中的第一大错误，也是开发者放弃测试的最主要原因（我认为）。

什么是实现细节？简单来说，它关注的是**如何做**。我们应该牢记，我们只想测试**是什么**。

为什么测试**如何**这么糟糕？难道我们不应该确保函数的运行方式和我们预期的完全一样吗？下面是一个简单的例子：

我们想要测试的组件如下：

```jsx
// Calculator.jsx

class Calculator extends React.Component {
  state = { number: 0 }

  setNumber = number => this.setState({ number })

  render() {
    const { number } = this.state

    return (
      <div>
        <div>Count: {number}</div>
        <button onClick={() => this.setNumber(number + 1)}>add1</button>
      </div>
    )
  }
}
```

我们可能会像这样测试它的实现细节（我们将使用 Enzyme，因为它暴露了可以测试实现细节的 API）：

```jsx
// Calculator.test.jsx

import * as React from 'react'
import Enzyme, {mount} from 'enzyme'
import EnzymeAdapter from 'enzyme-adapter-react-16'
import Calculator from '../Calculator'

// Setup enzyme's react adapter
Enzyme.configure({adapter: new EnzymeAdapter()})

test('Calculator render number in state', () => {
    const wrapper = mount(<Calculator />)

    expect(wrapper.props().children).toBe(0)
})

test('setNumber should sets the number state properly', () => {
  const wrapper = mount(<Calculator />)

  expect(wrapper.state('number')).toBe(0)

  wrapper.instance().setNumber(1)

  expect(wrapper.state('number')).toBe(1)
})
```

#### 假阴性（False Negatives）

通过测试实现细节，你实际上是在说：**应用程序必须按这种方式运行！** 因此你同时排除了使用其他实现方式的可能性。如果我们需要用其他状态管理库（如 Redux、Mobx）进行重构呢？即使你的实现是正确的，重构之后也一定会测试失败。这就是假阴性。

#### 假阳性（False Positives）

因为你在测试**如何做**，你很可能会遗漏一些细节（因为细节总是如此复杂），这让你对结果是否符合预期没有信心。

假设开发者 Joe 刚加入我们的团队，他决定把内联函数移到外部。改动如下：

```jsx
// Calculator.jsx

class Calculator extends React.Component {
  state = { number: 0 }

  setNumber = number => this.setState({ number })

  render() {
    const { number } = this.state

    // Joe carelessly missed the value of setNumber
    const handleOnClick = () => this.setNumber()

    return (
      <div>
        <div>Count: {number}</div>
        <button onClick={handleOnClick}>add1</button>
      </div>
    )
  }
}
```

他运行了所有测试，全部通过了。于是他开心地提交了代码并推送到代码库。很快，他就收到了用户的投诉：为什么计算器不工作了？他也不知道为什么，因为所有测试都通过了。于是他不得不打开笔记本电脑，再次查看代码库来修复这个问题。

这是因为你的测试根本没有保证**代码结果是正确的**，所以即使产品结果是错误的，测试依然通过，这也就不奇怪了。

#### 写了太多有害的测试

在我们的例子中，实现非常简单，所以测试实现细节时不需要写太多测试。但对于一些复杂的组件呢？你需要写成千上万行的测试，这不仅不能增加你的信心，还会限制重构的可能性。这就是为什么大多数开发者开始写测试然后很快就放弃的原因。

#### 测试用例（Use Cases）

如果我们不测试**如何**，而是测试**什么**呢？通过测试用例（在特定情况下会做什么），我们是在说：**给定某个输入（事件），它应该做某件事。**

这将给你重构或替换某些实现的可能性，同时你可以保证产品做的是同样的事情。

让我们为上面的例子写正确的测试（我们将使用 react-testing-library）：

```jsx
import { screen, render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Calculator from './Calculator'

// zero
test('it should show 0 initially', () => {
  render(<Calculator />)

  // expect screen show text Count: 0
  expect(screen.getByText('Count: 0')).toBeInTheDocument()
})

// one
test('it should add 1 when user click add1', async () => {
  render(<Calculator />)

  // simulate user click on button
  await userEvent.click(screen.getByRole('button'))

  // expect screen show text Count: 1
  expect(screen.getByText('Count: 1')).toBeInTheDocument()
})

// many
test('it should add 3 when user click add1 three times', async () => {
  render(<Calculator />)

  // simulate user click on button
  await userEvent.click(screen.getByRole('button'))
  await userEvent.click(screen.getByRole('button'))
  await userEvent.click(screen.getByRole('button'))

  // expect screen show text Count: 3
  expect(screen.getByText('Count: 3')).toBeInTheDocument()
})
```

你可以看到，这样的测试允许你在重构的同时，保证应用程序正确运行的信心。太棒了！

### 错误二：100% 代码覆盖率

如果你试图在所有情况下都达到 100% 的覆盖率，**你很可能是在浪费时间**，尤其是在前端。代码覆盖率可能会给你代码测试充分的错觉。但实际上，它只能告诉你**测试期间有多少代码会被执行**，而不是**这段代码是否按照业务需求工作**。

始终牢记，你写测试是为了增加信心，而对于哪些代码应该被覆盖，存在一个**权衡**。有些事情比其他事情更重要。例如，为"关于我们"页面写测试不会给你增加太多信心，对吧？前端有很多纯 UI 页面，我们可以用[快照测试](https://jestjs.io/docs/snapshot-testing#:~:text=Snapshot%20tests%20are%20a%20very,file%20stored%20alongside%20the%20test.)来覆盖它们，从而腾出手来做更重要的事情。

对于一些公共库，追求 100% 的覆盖率是完全合适的，因为它们通常更独立、更小，而且由于被多个项目共享，它们确实是非常重要的代码。

### 错误三：重复/耦合测试

**测试应该始终在隔离状态下工作。** 有两种测试是不隔离的：

#### 重复测试

假设你有 100 个 E2E 测试需要一个已认证的用户。你需要运行多少次注册流程才能确信该流程有效？100 次还是 1 次？我认为可以安全地说，如果它运行一次有效，它应该每次都有效。**那 99 次额外运行是浪费精力。**

因此，与其每次都走一遍 happy path，不如直接发送与你的应用程序注册和登录新用户时相同的 HTTP 请求。这些请求会比在页面上点击和输入**快得多**。

#### 耦合测试（这个名字是我起的🤣）

让我们来看一个简单的例子：

```jsx
import * as React from 'react'

const Counter = (props) => {
  const [count, setCount] = React.useState(0)
  const isMax = count >= props.maxCount

  const handleReset = () => setCount(0)
  const handleClick = () => setCount(currentCount => currentCount + 1)

  return (
    <div>
      <span>Count: {count}</span>
      <button onClick={handleClick} disabled={isMax}>
        add one
      </button>
      {isMax ? <button onClick={handleReset}>reset</button> : null}
    </div>
  )
}

export {Counter}

```

我们可以像这样为该组件写测试：

```javascript
import * as React from 'react'
import {render} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {Counter} from '../counter'

const { getByText, getByRole } = render(<Counter maxCount={2} />)
const addOneButton = getByRole('button', { name: 'add one' })


test('it should render initial count 0', () => {
  expect(getByText('Count: 0')).toBeInTheDocument()
})

test('it should render 1 when click add one button', async () => {
  await userEvent.click(addOneButton)

  expect(getByText('Count: 1')).toBeInTheDocument()
})

test(`it should disable add one button and show reset button when it's hit the maxCount`, async () => {
  await userEvent.click(addOneButton)

  expect(getByRole(addOneButton)).toBeDisabled()
  expect(getByRole('button', { name: 'reset' })).toBeInTheDocument()
})

test('it should reset count to 0 when click reset button', async () => {
  await userEvent.click(addOneButton)

  expect(getByText('Count: 0')).toBeInTheDocument()
})

```

看起来很不错，对吧？我们拥有 100% 的代码覆盖率，我们非常有信心说代码被很好地测试了。但等等，现在开发者 Joe 拿到了我们的项目，他看了这些测试后认为第二个测试是多余的，因为加一按钮已经在后续的测试用例中被测试了，所以他决定删除它。砰！他立刻就有 3 个测试失败了：

这是因为这些测试不是隔离的，而是相互依赖的。所以如果我们重构或跳过其中一个，其他测试很可能会失败。

解决方案是将渲染工具包装成一个函数，并在每个测试中调用它。这样每个测试都会得到自己的实例，与其他测试隔离。（你也可以用 `beforeEach` 来做同样的事情，但我稍后会告诉你为什么我不喜欢这种方式。）

```javascript
import * as React from 'react'
import {render} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {Counter} from '../counter'

function renderCounter(props) {
  const { getByText, getByRole } = render(<Counter maxCount={2} {...props} />)
  const addOneButton = getByRole('button', { name: 'add one' })
  return { getByText, getByRole, addOneButton }
}

test('it should render initial count 0', () => {
  const { getByText } = renderCounter()
  expect(getByText('Count: 0')).toBeInTheDocument()
})

test('it should render 1 when click add one button', async () => {
  const { getByText, addOneButton } = renderCounter()
  await userEvent.click(addOneButton)

  expect(getByText('Count: 1')).toBeInTheDocument()
})

test(`it should disable add one button and show reset button when it's hit the maxCount`, async () => {
  const { getByRole, addOneButton } = renderCounter()

  await userEvent.click(addOneButton)
  await userEvent.click(addOneButton)

  expect(addOneButton).toBeDisabled()
  expect(getByRole('button', { name: 'reset' })).toBeInTheDocument()
})

test('it should reset count to 0 when click reset button', async () => {
  const { getByText, getByRole } = renderCounter()

  await userEvent.click(addOneButton)
  await userEvent.click(addOneButton)
  await userEvent.click(getByRole('button', { name: 'reset' }))

  expect(getByText('Count: 0')).toBeInTheDocument()
})
```
