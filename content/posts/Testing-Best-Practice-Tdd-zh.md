---
title: 测试最佳实践：TDD
date: 2022-07-24 17:42:10
tags: [testing, tdd]
lang: zh
i18n_key: Testing-Best-Practice-Tdd
permalink: zh/2022/07/24/Testing-Best-Practice-Tdd/
---


> 通常，在科学和工程领域对现象建模时，我们从简化的、不完整的模型开始。随着我们对细节的深入研究，这些简单模型变得不再适用，必须被更精细的模型所取代。
> --_《计算机程序的构造和解释》_

## 什么是测试驱动开发（TDD）？

> **测试驱动开发**（**TDD**）是一种[软件开发过程](https://en.wikipedia.org/wiki/Software_development_process)，它依赖于在软件完全开发之前将软件需求转化为[测试用例](https://en.wikipedia.org/wiki/Test_case)，并通过反复对所有测试用例进行测试来跟踪所有软件开发进度。这与先开发软件、后创建测试用例的方式相对。

## 测试驱动开发循环

TDD 循环遵循以下步骤：

1. 添加测试：在添加功能之初，首先**根据需求**（用例或用户故事）添加一个测试。
2. 运行所有测试：我们将运行所有测试，新测试应该因**预期**的原因而失败。这确保我们的测试是正常工作的，而不是一直通过。
3. 编写**最简单的**能通过新测试的代码：不应该添加超出被测功能之外的代码。（代码无论如何都会在第 5 步中打磨。）
4. 所有测试现在都应该通过：如果有任何失败，新代码必须修改直到它们通过。这确保新代码满足需求并且不会破坏现有功能。
5. 按需重构：为了可读性和可维护性对代码进行重构，每次重构后继续使用测试。一些重构示例：
   - 将代码移到最合适的位置
   - 删除[重复代码](https://en.wikipedia.org/wiki/Duplicate_code)
   - 使[命名](https://en.wikipedia.org/wiki/Name)[自文档化](https://en.wikipedia.org/wiki/Self-documenting_code)
   - 将方法拆分为更小的片段
   - 重新排列[继承层次结构](https://en.wikipedia.org/wiki/Inheritance_(object-oriented_programming))
6. 重复：对每个新功能重复上述循环，直到满足所有需求。经常使用**版本控制**（提交），这样如果新代码导致某些测试失败，你可以简单地**回滚**，而不是花费大量时间调试。

简单来说，我们称之为测试驱动开发的咒语——**红/绿/重构**：

<img alt="Red Green Refactor" src="/img/tdd/red-green-refactor.jpeg">

## 优势

TDD 有许多经过验证的优势，其中一些是：

- 它符合工程建模现象的方式，即从简化和不完整的模型开始，当对模型进行更深入的检验时，它变得不再适用，必须被更精细的模型所取代。
- 因为它要求开发者在写代码之前先写测试：
   - 它让开发者在写代码之前专注于**需求**。
   - 它迫使开发者编写具有**可测试性**的代码。
   - 它帮助开发者关注**软件质量**。
- 因为开发者需要编写**最简单的**代码来通过测试：
   - 它符合"保持简单和愚蠢"（**KISS**）和"你不会需要它"（**YAGNI**）原则。
   - 开发者倾向于保持代码库更简单，并防止开发者引入不必要的代码。
- 因为它可以与 git 配合使用，当开发者进行修改并导致某些测试失败时，可以简单地**撤销**或**回滚**，而不是花费太多时间调试。
- 因为每个测试用例最初都会失败，它确保了**测试真的有效**并且能够捕获每个错误，而不是一直通过。
- 因为 TDD 倾向于每次编写最简单的功能测试：
   - 它可以作为**文档**：小型测试用例易于理解。
   - 它可以**减少调试工作**：小型测试用例帮助更精确地追踪错误。

## 最佳实践

要获得上述优势，开发者需要遵循一些最佳实践。

### TDD 的三条法则

1. 在编写任何产品代码之前，你**必须先写一个失败的测试**。
2. 你**不能写**超过**足以失败或无法编译**的**测试**内容。
3. 你**不能写**超过足以**使当前失败测试通过**的产品**代码**。

### 以 ZOMBIES 为指导的测试驱动

<img alt="Zombies Testing" src="/img/tdd/zombies.png" >

ZOMBIES 测试是一种思考从哪里开始[了解更多](https://www.agilealliance.org/resources/sessions/test-driven-development-guided-by-zombies/)以及如何编写下一个测试的方法：

- Zero（零）：你需要为**传入模块的**零个事物和**从模块返回的**零个事物编写测试用例。（特殊情况）
- One（一）：然后你开始考虑传入一个事物或返回一个事物的情况。（特殊情况）
- Many（多）：最终你来到多个的情况。（一般情况）
- Interfaces（接口）：**早期**测试关注接口。当你完成 Zero 到 One 步骤时，你的**接口已经定义好了**。
- Boundaries Behaviors（边界行为）：当它遇到边界时会有什么行为？（Zero 和 One，满的情况）
- Exceptions（异常）：不要忘记异常情况。（例如，错误的输入格式，错误的值）
- Simple scenarios, Simple solutions（简单场景，简单解决方案）：尽可能保持场景和解决方案的简单。

## 示例
### 示例一：一个简单的数字栈类
#### 需求：

- 我们可以将数字压入栈中。
- 我们可以弹出刚才压入的数字。
- 顺序应该是 FILO（先进后出）。

#### 流程：

首先，根据需求，我们可以从零情况开始写第一个测试：

```javascript
it('should return false when pop in an empty stack', () => {
        const stack = new Stack()

        expect(stack.pop()).toBe(false)
})

```

它应该失败，因为我们甚至还没有创建这个类。
我们编写最简单的代码来通过测试：

```javascript
class Stack {
    constructor() {
    }

    pop() {
        return false
    }
}

```

现在测试通过了。

你可能认为写这样的硬编码是荒谬的，并且说我们最终无论如何都会改变实现，这完全是在浪费时间。其实不然。如你所见，虽然在这一步你的实现是幼稚的，但你已经做了两件事：

1. 你定义了单元的接口。
2. 你为_零_情况添加了测试，并理解了这个特殊情况的需求。

让我们继续为_一_的情况编写测试：

```javascript
it('should return 1 when we push 1 to an empty stack and then pop', () => {
        const stack = new Stack()

        stack.push(1)

        expect(stack.pop()).toBe(1)
})

```

它失败了，因为我们之前没有考虑一的情况，所以我们修改代码来通过它：

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

现在我们的测试再次通过了，我们可以看到此时我们已经创建了两个接口，分别是 pop 和 push，即使它们只能处理_零_和_一_的情况。

我们继续让这个类更加通用。我们开始考虑_多_的情况。

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

当测试再次失败时，我们切换到代码库重新设计算法：

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

当所有测试再次通过后，我们现在有信心说我们的代码从_零_到_多_的情况都运行良好。
我们可以继续考虑_异常_情况：如果我们的用户没有传入数字怎么办？我们可以简单地向用户抛出一个带有信息的错误：

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

这样，我们考虑了这个类会遇到的所有情况（希望如此），并为该类编写了测试和代码，现在我们应该有信心说我们的代码对用户和开发者来说都是**健壮的**和**可维护的**。

更重要的是，当你重构这个类时，你不需要担心新代码会导致回归，毕竟你通过了所有测试。
