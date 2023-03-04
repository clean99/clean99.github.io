---
title: 'Introduce to Code Complexity Metric: Cognitive Complexity'
date: 2023-03-04 14:57:22
tags:
---

## Background

When we say that someone's code quality is bad, in most of the time, what we really mean is that the code is hard to understand. Many developers prefer to start a new project from scratch rather than add features to a legacy project, because the mental cost of understanding the code is much higher than creating something new. As the features of the project increases, it inevitably becomes more difficult to understand. Therefore, it's important to have a way to measure and control the code's complexity and understandability.

In this article, I will introduce two mainstream methods for measuring code complexity - **cyclomatic complexity** and **cognitive complexity**. While explaining why cyclomatic complexity may not always be sufficient, I will also introduce you cognitive complexity. Using its rules, I will explain which programming behaviors can make code harder to comprehend.

## Cyclomatic Complexity

Cyclomatic Complexity was initially formulated as a measurement of the **“testability and maintainability”** of the control flow of a module.

Cyclomatic Complexity measuring code complexity via those metrics:

- Number of decision points: The number of decision points in the code, such as loops, conditionals, and case statements.
- Number of independent paths: The number of independent paths through the code. This is calculated using the formula **V(G) = E - N + 2**, where E is the number of edges in the code's control flow graph, and N is the number of nodes.

<img alt="Flow Graph" src="/img/code-complexity/flowgraph.png">

Image we have a function with flow graph above, we can calculate the cyclomatic complexity is **V(G) = 9(edges) - 8(nodes) + 2 = 3**. So when the numbers of decision points increases, while the node numbers is not changing, We will say it is more complex in cyclomatic complexity metric.

Simply put, we can calculate cyclomatic complexity via counting **the independent flow paths(decision points) that our abstraction can take while executing**. 

### Code Example

```tsx
function makeConditionalState(x){
  const state = createEmptyState();
  if(x){
    state.push(x);
  }
  return state;
}
```

```tsx
   ○       // Entry
   ↓
   ⬢       // StatementA -> Always executes
   ↓
   ⬢       // Conditional
   |  ↘    
   |    ⬢  // If conditional is true execute StatementB
   ↓  ↙
   ⬢       // Exit conditional
   ↓
   ●       // Exit
```

The presence of the conditional statement `if(x)` in this program creates a decision path, resulting in a cyclomatic complexity of 2.

## An illustration of the problem

Cyclomatic complexity is a useful metric to measure code complexity, but it has its problem. Let’s looks into two examples:

```tsx
function sumOfPrimes(max) { // +1
  let total = 0;
  OUT: for (let i = 1; i <= max; ++i) { // +1
    for (let j = 2; j < i; ++j) { // +1
      if (i % j === 0) { // +1
        continue OUT;
      }
    }
    total += i;
  }
  return total;
}
// Cyclomatic Complexity 4
```

```tsx
function getWords(number) { // +1
  switch (number) {
    case 1: // +1
      return "one";
    case 2: // +1
      return "a couple";
    case 3: // +1
      return "a few";
    default:
      return "lots";
  }
}
// Cyclomatic Complexity 4
```

While Cyclomatic Complexity gives equal weight to both the `sumOfPrimes` and `getWords` methods, it is apparent that `sumOfPrimes` is much more complex and difficult to understand than `getWords`. This illustrates that measuring understandability based solely on the paths of a program may not be sufficient.

## Cognitive Complexity

Cognitive Complexity is a more comprehensive metric than Cyclomatic Complexity, as it measures not only the number of control flow structures, but also how they interact with each other and the **mental effort** required to understand the code. It assigns a cognitive weight to each control flow construct based on its complexity and interactions with others, enabling a more accurate assessment of code readability and maintainability. This is important because certain code constructs, such as nested loops and conditional statements, can be more difficult for humans to understand and reason about than others.

### Basic criteria and methodology

A Cognitive Complexity score is assessed according to three basic rules:

1. Ignore structures that allow multiple statements to be readably **shorthanded** into one
2. Increment (add one) for each **break** in the linear flow of the code
3. Increment when flow-breaking structures are **nested**

Additionally, a complexity score is made up of four different types of increments:

1. Nesting - assessed for nesting control flow structures inside each other
2. Structural - assessed on control flow structures that are subject to a nesting
increment, and that increase the nesting count
3. Fundamental - assessed on statements not subject to a nesting increment
4. Hybrid - assessed on control flow structures that are not subject to a nesting
increment, but which do increase the nesting count

These rules and the principles behind them are further detailed in the following sections.

### Ignore shorthand

A guiding principle in the formulation of Cognitive Complexity has been that it should incent
good coding practices. That is, it should either ignore or discount features that make code
more readable.

**Null-coalescing**

```tsx
// bad practice
function something(a) {
	if(a != null) { // +1
		return a.map(item => item + 1);
  }
}

// good practice
function something(a) {
  return a?.map(item => item + 1);
}
```

Cognitive Complexity will ignore null-coalescing to incent good coding practices.##

### Increment for breaks in the linear flow

Another guiding principle in the formulation of Cognitive Complexity is that **structures that
break code’s normal linear flow from top to bottom, left to right** require maintainers to work
harder to understand that code.

Some of them are:

- Loop structures: for, while, do while, ...
- Conditionals: ternary operators, if, #if, #ifdef, ...

**Catches**

```tsx
try { // +1
  // something
} catch(err) {
  // something
}
```

A `try...catch` will contribute complexity very similiar to `if...else` . So it also increment to cognitive complexity.

**Switches**

A `switch` and all its cases combined incurs a single structural increment. This is different than cyclomatic complexity, which incurs increment for each case.

But for maintainer’s point of view, a `switch` with cases is much easier to understand than `if...else if` chain. 

```tsx
function getAnimalSound(animal) {
  switch (animal) {
    case "cat":
      return "meow";
    case "dog":
      return "woof";
    default:
      return "unknown";
  }
}

function getAnimalSound(animal) {
  if (animal === "cat") {
    return "meow";
  } else if (animal === "dog") {
    return "woof";
  } else {
    return "unknown";
  }
}
```

When we using `switch` we only need to compare a single variable to a named set of literal values, making it easier to understand and maintain.

### Sequences of logical operators

```tsx
a && b
a && b && c && d
a || b && c || d // +1
```

Understanding the first two lines isn’t very difficult. On the other hand, there is a marked difference in the effort to understand the third line.

When **mixed operators**, boolean expressions become more difficult to understand.

```tsx
if (a // +1 for `if`
		&& b && c // +1
		|| d || e // +1
		&& f) // +1

if (a // +1 for `if`
		&& // +1
		!(b && c)) // +1
```

### Recursion

Unlike Cyclomatic Complexity, Cognitive Complexity adds a fundamental increment for each
method in a recursion cycle, whether direct or indirect. Because Recursion contribute very similiar complexity like Loop.

### Increment for nested flow-break structures

Nesting flow-break is something that heavily increase code complexity, five `if...else` nested is much harder to understand than same five linear series of `if...else` .

```tsx
void myMethod () {
	try {
		if (condition1) { // +1
			for (int i = 0; i < 10; i++) { // +2 (nesting=1)
				while (condition2) { … } // +3 (nesting=2)
			}
		}
	} catch (ExcepType1 | ExcepType2 e) { // +1
		if (condition2) { … } // +2 (nesting=1)
	}
}
```

## Intuitively ‘right’ complexity scores

Let’s look back to our first example, where cyclomatic complexity give them the same score. 

```tsx
function sumOfPrimes(max) {
  let total = 0;
  OUT: for (let i = 1; i <= max; ++i) { // +1
    for (let j = 2; j < i; ++j) { // +2
      if (i % j === 0) { // +3
        continue OUT; // +1
      }
    }
    total += i;
  }
  return total;
}
// Cyclomatic Complexity 7
```

```tsx
function getWords(number) {
  switch (number) { // +1
    case 1:
      return "one";
    case 2:
      return "a couple";
    case 3:
      return "a few";
    default:
      return "lots";
  }
}
// Cyclomatic Complexity 1
```

The Cognitive Complexity algorithm gives these two methods markedly different scores,
ones that are far more reflective of their relative understandability.

### Metrics that are valuable above the method level

With Cyclomatic Complexity, it can be difficult to differentiate between a class with a large number of simple getters and setters and one that contains complex control flow, as both can have the same number of decision points. However, Cognitive Complexity addresses this limitation by not incrementing for method structure, making it easier to compare the metric values of different classes. As a result, it becomes possible to distinguish between classes with simple structures and those that contain complex control flow, enabling better identification of areas of a program that may be difficult to understand and maintain.

## Setup Complexity Metrics for You Code with ESLint

One effective way to manage complexity metrics for your code is by using ESLint, a popular linting tool that can help detect and report on various code issues, including Cyclomatic and Cognitive Complexity.

### Cyclomatic Complexity

To set up ESLint to report on Cyclomatic Complexity, you can use the **`eslint-plugin-complexity`** plugin, which provides a configurable rule for enforcing a maximum Cyclomatic Complexity threshold. First, you'll need to install the plugin by running **`npm install eslint-plugin-complexity`**. Then, you can add the plugin to your ESLint configuration file and configure the maximum threshold value:

```tsx
{
  "plugins": ["complexity"],
  "rules": {
    "complexity": ["error", 10]
  }
}
```

In this example, we've set the maximum threshold to 10. If the Cyclomatic Complexity of a function or method exceeds this threshold, ESLint will report an error.

### Cognitive Complexity

To set up ESLint to report on Cognitive Complexity, you can use the **`eslint-plugin-cognitive-complexity`** plugin, which provides a configurable rule for enforcing a maximum Cognitive Complexity threshold. First, you'll need to install the plugin by running **`npm install eslint-plugin-cognitive-complexity`**. Then, you can add the plugin to your ESLint configuration file and configure the maximum threshold value:

```tsx
{
  "plugins": ["cognitive-complexity"],
  "rules": {
    "cognitive-complexity": ["error", 15]
  }
}
```

In this example, we've set the maximum threshold to 15. If the Cognitive Complexity of a function or method exceeds this threshold, ESLint will report an error.

By setting up these metrics in ESLint, you can proactively monitor and manage the complexity of your code, making it easier to understand and maintain over time.

## Summary

In conclusion, code complexity is a crucial factor that can significantly impact work efficiency and project maintainability. The use of Cyclomatic Complexity and Cognitive Complexity metrics can help measure and manage code complexity, allowing developers to identify potential problem areas and optimize code readability and maintainability.

There are several ways to reduce code complexity, like using design patterns and applying TDD({% post_link Testing-Best-Practice-Tdd %}). Overall, by understanding and managing code complexity, developers can build better, more maintainable software that delivers value and meets user needs.
