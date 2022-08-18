---
layout: posts
title: Testing Best Practice Tdd
date: 2022-07-24 17:42:10
tags: [testing, tdd]
---


> In general, when modeling phenomena in science and engineering, we begin with simplified, incomplete models. As we examine things in greater detail, these simple models become inadequate and must be replaced by more refined models. 	
> --_Structure and Interpretation of Computer Programs_

## What is Test-driven development(TDD)?

> **Test-driven development** (**TDD**) is a [software development process](https://en.wikipedia.org/wiki/Software_development_process) relying on software requirements being converted to [test cases](https://en.wikipedia.org/wiki/Test_case) before the software is fully developed, and tracking all software development by repeatedly testing the software against all test cases. This is as opposed to software being developed first and test cases created later.

## Test-driven development cycle

A TDD cycle follows those steps:

1. Add a test: At the beginning of adding a feature, first add a test **according to the requirement**(use case or use story).
2. Run all tests: We will run all tests and new tests should fail for the **expected** reasons. This ensures our test is working correctly instead of passing all the time.
3. Write the **simplest** code that passes the new test: No code should be added beyond the tested functionality. (The code will be honed anyway in step 5.)
4. All tests should now pass: If any fail, the new code must be revised until they pass. This ensures the new code meets the requirement and doesn't break existing features.
5. Refactor as needed: Code is refactored for readability and maintainability, keep using tests after each refactor. Some examples of refactoring:
   - moving code to where it most logically belongs
   - removing [duplicate code](https://en.wikipedia.org/wiki/Duplicate_code)
   - making [names](https://en.wikipedia.org/wiki/Name) [self-documenting](https://en.wikipedia.org/wiki/Self-documenting_code)
   - splitting methods into smaller pieces
   - re-arranging [inheritance hierarchies](https://en.wikipedia.org/wiki/Inheritance_(object-oriented_programming))
6. Repeat: The cycle above is repeated for each new feature until all requirements are met. Use **version control**(commit) often so if new code fails some tests, you can simply **revert** rather than debugging excessively.

For simply, we call it: test-driven development mantra--**red/green/refactor**:

<img alt="Red Green Refactor" src="/img/tdd/red-green-refactor.jpeg">

## Benefit

TDD has lots of proven benefit, some of them are:

- It fits the way that modeling phenomena in engineering, which is to start at simplied and incomplete model, and when examine the model in greater details, it become inadequate and must be replaced by more refined model.
- Because it requires developer to write tests before writing code:
   - It makes developer focus on **requirements** before writing code.
   - It forces developer to write code with **testability**.
   - It helps developer to focus on **software quality**.
- Because developer is required to write **simplest** code to pass the tests:
   - It meets the principles of "Keep it simple and stupid"(**KISS**) and "You aren't gonna need it"(**YAGNI**). 
   - Developer trend to keep the codebase more simple, and it prevents developer from introducing unnecessary code.
- Because it can work with git, developer can simply **undo** or **revert** when he makes change and failed some tests, instead of spending too much time debugging.
- Because each test case fails initially, it ensures that the **test really works** and can each error rather than pass all the time.
- Because TDD trend to write simplest feature's test each time:
   -  It can serve as **documentation**: small test cases are easy to understand.
   - It can **reduce debugging effort**: small test cases help track error more precisely.

## Best practices

To get benefits above, developer needs to follow some best practices.

### 3 laws of TDD

1. You must **write a failing test** before you write any production code.
2. You **must not write more** of a **test** than is **sufficient to fail**, or fail to **compile**.
3. You **must not write more** production **code** than is sufficient to **make the currently failling test pass**.

### Test-driving guided by zombies

<img alt="Zombies Testing" src="/img/tdd/zombies.png" >

Zombies testing is a way to think about where to start [Read more](https://www.agilealliance.org/resources/sessions/test-driven-development-guided-by-zombies/), and how to write next test:

- Zero: You need to write for the test case of zero things **being pass to the module**, and zero thing **being return from the module**.(special case)
- One: Then you start thinking about one thing being pass or one thing being return.(special case)
- Many: Finally you get to the many case.(general case)
- Interfaces: **Early **tests focus on interface. When you finished Zero to One steps, your** interfaces are defined**.
- Boundaries Behaviors: What it will behaviors when it meets boundaries?(Zero and One, Full)
- Exceptions: Don't forget about the exception.(For example, wrong input format, wrong value)
- Simple scenarios, Simple solutions: Keep the scenarios and solutions simplied as far as possible.

## Examples
### Example 1: A simple number stack class
#### Requirement: 

- We can push numbers in the stack.
- We can pop numbers that we just push.
- The order should be  FILO(first in last out).

#### Flow:

First, according to the requirement, we can write our first test from zero cases:

```javascript
it('should return false when pop in an empty stack', () => {
        const stack = new Stack()

        expect(stack.pop()).toBe(false)
})

```

It should fail because we don't even create the class.
We write the simplest code to pass the test:

```javascript
class Stack {
    constructor() {
    }

    pop() {
        return false
    }
}

```

Now the test is passed.

You might think it is ridiculous to write a hardcode like this, and say that when will eventually change the implementation anyway, it's totally wasting time. Well, it isn't. As you can see, although your implementation is naive at this step, you have done two things: 

1. You defined the interface of the unit. 
2. You added the test for the _zero_ case, and understand the requirement of this special case.

Let's continue to write tests for the _one_ case:

```javascript
it('should return 1 when we push 1 to an empty stack and then pop', () => {
        const stack = new Stack()

        stack.push(1)

        expect(stack.pop()).toBe(1)
})

```

It failed because we don't consider the one case previously, so we change the code to pass it:

```javascript
class Stack {
    constructor() {
        this.number = -1
        this.isEmpty = true
    }

    pop() {
        if(this.isEmpty) return false
        return this.number
    }

    push(number) {
        this.isEmpty = false
        this.number = number
    }
}

```

So now our tests pass again, we can see at this point we have already created two interfaces, which are pop and push, even though they can only handle the _zero_ and _one_ case.

We continue by making the class more general. We start to consider the _many_ cases.

```javascript
it('should return 1 2 3 when we push 3 2 1 to an empty stack and then pop', () => {
        const stack = new Stack()

        stack.push(3)
        stack.push(2)
        stack.push(1)

        expect(stack.pop()).toBe(1)
        expect(stack.pop()).toBe(2)
        expect(stack.pop()).toBe(3)
})

```

And as the test failed again, we switch to our codebase to redesign the algorithm:

```javascript
class Stack {
    constructor() {
        // we don't wanna use Array for this example
        this.list = {}
        this.top = -1
    }

    pop() {
        if (this.top === -1) return false
        const record = this.list[this.top]
        this.top = this.top - 1
        return record
    }

    push(number) {
        this.top = this.top + 1
        this.list[this.top] = number
    }
}

```

As all of the tests pass again, now we have confidence that our code works great from _zero_ to _many_ cases.
We can continue by considering the _Exception_ cases: what if our user doesn't pass a number? We can simply throw an error with some information to our user:

```javascript
it(`should throw an error with msg: "invalid type,
please push a number" when input isn t a number`, () => {
        const stack = new Stack()

        // if you want to expect a function throwing error in jest, you should wrap it
        // in a function an pass to expect instead of calling it directly. Otherwise it
        // can't be catched by expect.
        function shouldThrowError() {
            stack.push(`I'm a string`)
        }

        expect(shouldThrowError).toThrowError('invalid type, please push a number')
})

```

```javascript
class Stack {
    constructor() {
        this.list = {}
        this.top = -1
    }

    pop() {
        if(this.top === -1) return false
        const record = this.list[this.top]
        this.top = this.top - 1
        return record
    }

    push(number) {
        if(typeof number !== 'number') throw new Error('invalid type, please push a number')
        this.top = this.top + 1
        this.list[this.top] = number
    }
}

```

So, we consider all the cases(hopefully) that this class will meet, and write both tests and code for the class, now we shall have the confidence to say that our code is **robust** and **maintainable** for both user and developer.

What's more, when you refactor the class, you don't need to be afraid that your new code will cause some regression, after all, you pass all the tests. 
