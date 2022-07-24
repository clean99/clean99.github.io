---
layout: posts
title: Some-Common-Mistakes-in-React-Testing
date: 2022-07-24 17:49:27
tags:
---

Most of the frontend developers (at least those who I met) dislike writing tests. I asked them why, and the answer is simple: _We don't have time to do that!_ Well, I would like to tell you that, writing tests **in the right way** will significantly increase your effectiveness of development (especially in the long-term), instead of wasting your time.

Writing tests forces you to think about whether the abstraction you made is reasonable, and if it doesn't, you **won't even be able to test it**. And if you don't have a well understanding of what your abstraction can do, you may **get your hand dirty** when writing tests for it. And that is exactly why some folks don't like writing tests. But if you start to write tests for your project, you will gain the benefit of improving your programming skill.

I want to help you write more **clean** and **reasonable** tests at beginning of your testing journey, so you can really get the benefit of tests. And here are some mistakes that you should avoid when you writing tests:

### Mistake 1: testing implementation details

This is the NO.1 mistake in testing, which is the biggest reason why developers give up testing(I think).

What are the implementation details? In simple words, it is about **how to do it**. We should keep in mind that we only want to test **what is it.**

Why is it so bad to test **how**? Shouldn't we make sure that our function runs exactly like what we expect? Here is a simple example:

Here is the component we wanna test:

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

We may test its implementation details like this(we will use Enzyme because it expose API that can test implementation details):

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

#### False negatives

By testing implementation details, you are basically saying that: **the application should do in this way!** So you are ruling out the possibility of applying other implementations at the same time. What about we need to refactor with other state management libraries (like Redux, Mobx)? You will definitely get a fail after your refactor, while your implementation works correctly. This is false negatives.

#### False positives

Because you are testing **how to do it**, you likely forget some of the details(because the details are always so complex), which makes you don't have the confidence that the result is what you want.

Let's say developer Joe just join our team and he decides to move the inline function to the outside. The change is like this:

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

He runs all of the tests and they are all passed. So he happily makes a commit and pushes his code into the codebase. Soon, he gets complaints from his user: Why is the calculator not working? He doesn't know why either because the tests are all passed. So he has to open his laptop and look into the codebase again to revise the code.

This is because your tests don't even make any promise that **your code result is correct**, so it's not strange that you may get the wrong result in the product while the test keeps passing.

#### Writing too many harmful tests

In our example, the implementation is quite simple, so we don't need to write a lot of tests when we test the implementation details. But what about some complex components? You need to write thousands of lines of tests which not only can't increase your confidence but also restrict the possibility of refactoring. That is why most developers start writing tests and then give up quickly.

#### Testing Use Cases

What about we don't test **How**, and test **What**? By testing the use cases(what will do in special cases), we are saying that: **It should do something by giving some input(event).**

This will give you the possibility to refactor or replace some implementation while you can promise that your product is doing the same thing.

Let's write the correct tests for the above example(we will use react-testing-library):

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

You can see that the tests like this allow you to refactor while it can provide you the confidence that your application is running correctly. That is awesome!

### Mistake 2: 100% code coverage

If you are trying to achieve 100% coverage in every case, **you are likely wasting time**, especially in frontend. Code coverage may give you the illusion that your code is well tested. But in fact, it can only tell you **How much code will run during your test**. Instead of **Will this code work according to the business requirements**. 

Always keep in mind that you are writing tests for increasing your confidence, and there is a **trade-off** of what code should you cover in testing. One thing is more important than another thing. For example, writing tests for the "About Us" pages won't increase too much confidence for you, right? We have a lot of pure UI pages in frontend, we could cover them by [snapshot testing](https://jestjs.io/docs/snapshot-testing#:~:text=Snapshot%20tests%20are%20a%20very,file%20stored%20alongside%20the%20test.), which frees your hand to do something more important.

For some common libraries, trying to go for 100% coverage is totally appropriate because they are usually more isolated and small, and they are really important code due to the fact that they're shared in multiple projects.

### Mistake 3: repeat/coupling testing

**Tests should always work in isolation.** There are two types of tests that are not isolating:

#### Repeat testing

Let's say you have 100 tests in E2E testing that need an authenticated user. How many times do you need to run through the registration flow to be confident that the flow works? 100 times or 1 time? I think it is safe to say that if it worked once, it should work every time. **Those 99 extra runs are wasted effort.** 

So instead of running through the happy path every time, it's a better idea to make the same HTTP request that your application makes when you register and log in a new user. Those requests will be **much faster** than clicking and typing around the page.

#### Coupling testing(This name is created by me🤣)

Let's take a simple example here:

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

We could write tests for the component like this:

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

Looks pretty good, right? We have 100% coverage of code, we are very confident to say that our code is been well tested. But wait, now developer joe takes our project and looks at those tests. He considers that the second test is unnecessary because the add one button is already tested in the following test case, so he decides to delete it. Boom! He got 3 fail tests immediately:


This is because those tests are not isolated, instead, they rely on each other. So if we refactor or skip one of them, other tests are likely to fail.

The solution is we can wrap the render utils into a function, and call it in every test. So that every test will get its own instance and isolate it from other tests. (You can use `beforeEach` to do the same thing here but I will show you why I don't like it later.)

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
