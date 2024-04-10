---
title: Learning How React Hooks Work by Building a Naive useState
date: 2024-04-10 18:49:41
tags: [Software Engineering, Frontend, React]
---

## An Interview Question
Have you been asked questions like this during interviews?: 
- Why react hook cannot be written in conditional or loop statements?

(This is a classic question of Chinese style interview, we call it '八股文', which basically means that the questions is too classic and everyone can answer it by remembering it)

In this article, we will learn the **software engineering principles** behind the scenes. After learning these principles, you will easily understand how other state management tools(redux, jotal) work.

## The Rules of Hooks
- Don’t call Hooks inside `loops`, `conditions`, or `nested` functions

## Learning How React Hooks Work by Building a Naive useState
### Part 1: What is a State?
> A state is nothing more than a `getter` and a `setter`.

You can see the concept of `state` exists in almost all programming languages. (Some programming languages use `stream` instead given that the issues state causes)
- It is a powerful abstraction given that we ordinarily view the world as populated by independent objects, each of which has a state that changes over time. 
- An object is said to "have state" if its behavior is influenced by its **history**.

Let's take an example using Javascript:
Say, we wanna build a bank account system. Whether we can withdraw a certain amount of money from a bank account depends upon the **history** of deposit and withdrawal transactions.
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
As you can see, in javascript, the state is pretty simple:
- `init`: use keyword let to define a state `let balance = 50;`
- `setter`: use = to assign(set) a new value to state `balance = 666;`
- `getter`: use the variable name to get the value `balance`

### Part 2: Implement useState
Once you understand the essence of state, you can easily understand react state too.
> React state is nothing but a state abstraction with a rerender mechanism in react component.

I will walk through how to build a `useState` step by step. Before that, let's sort out what features we need to react state.
- `init`: init a state, in react `useState()` init a state in a component.
- `getter`: the first value of return array of `useState()` is the `getter`.
- `setter`:  the second value of return array of `useState()` is the `setter`.
- `rerender`: when set a new state, it should trigger react component `rerender` using the latest state.
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

Here is how we use our state:
```js
const App = () => {
    const [balance, setBalance] = useState(666);
    
    return (<div onClick={() => setBalance(888)}>{balance}</div>);
}
```

Now it works pretty well! But as our react component becomes more complex, we find that this implementation is not sophisticated enough, it will break when there are **multiple states** are declared.

#### Multiple States
It breaks when we add a name state:
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

This is because we only store `states` in a single variable. Now we change it to `Array(List)`, we need a `cursor` to indicate the index of the current state, so that we can get the correct state: 
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

Now let's take a look at what happens when we call the code below:

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

#### Why is Order Important?
As you can see, the order is very important because we use array and index to help `useState` to map to correct state's getter and setter.
Let's take a look if we write `hook` inside a conditional statement:

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

As you can see, the `name` state is mapped to the wrong state using the wrong `cursor`. This is why we cannot break the order of state execution using conditional or loop statements in react.
