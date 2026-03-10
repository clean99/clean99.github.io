---
title: React 运行时性能优化
date: 2024-04-16 08:32:53
tags: [Software Engineering, Frontend, React]
lang: zh
i18n_key: React-Performance-Optimization
permalink: zh/2024/04/16/React-Performance-Optimization/
---

优化 React 应用的性能，主要有两个方向：
1. **渲染（Rendering）**：渲染过程是 React 应用中开销最大的部分之一（包含 Diff 计算）。
2. **计算（Calculation）**：受限于浏览器的有限资源，浏览器并不适合执行重计算任务。

## 渲染

### React.memo

当一个组件重新渲染时，无论父组件传给子组件的 props 是否发生变化，子组件都会跟着重新渲染。

```jsx
const A = ((props: any) => {
  console.log("A is Updating...");
  return (
      <div>
          <div>text:{props.name}</div>
      </div>
  )
})
const B = () => {
  const [count, setCount] = useState(0);
  const [text, setText] = useState("")
  const handleClick = () => {
      setCount(count + 1);
  }
  const handleInputChange = (e) => {
      setText(e.target.value)
  }
  return (<div>
        <input onChange={handleInputChange} />
      <button onClick={handleClick}>+1</button>
      <A name={text} />
  </div>)
}
```

在上面的例子中，每当 `count` 或 `text` 状态发生变化，`A` 组件都会重新渲染，即使 `name` 属性没有变化也一样。

即便 B 没有向 A 传递任何 props，`A` 组件也会重新渲染。这是因为 React 不会假设传递给组件的 props 与之前相同，即使它们的值一样。每次调用 B 函数时，都会创建一个新的 props 对象并传递给 A 组件。

为了避免这种情况，可以使用 `React.memo` 来缓存组件。

```jsx
const A = React.memo((props: any) => {
    console.log("A is Updating...");
    return (
        <div>
            <div>text:{props.name}</div>
        </div>
    )
})
```

现在，`A` 组件只会在 `name` 属性变化时才重新渲染。

### React.useCallback

`React.memo` 对 props 和 state 进行**浅比较**，因此如果 B 向 A 传递了一个函数，且该函数没有被缓存，那么每次组件重新渲染时，函数都会被重新创建。

```jsx
const A = React.memo((props: any) => {
    console.log("A is Updating...");
    return (
        <div>
            <div>text:{props.name}</div>
        </div>
    )
})
const B = () => {
    const [count, setCount] = useState(0);
    const [text, setText] = useState("");
    const handleClick = () => {
        setCount(count + 1);
    }
    const handleInputChange = (e) => {
        setText(e.target.value)
    }
    return (<div>
        <input onChange={handleInputChange} />
        <button onClick={handleClick}>+1</button>
        <A name={text} handleInputChange={handleInputChange} />
    </div>)
}
```

在上面的例子中，由于每次 B 组件重新渲染时 `handleInputChange` 函数都会被重新创建，`A` 组件会在每次 `count` 或 `text` 状态变化时都重新渲染。

可以使用 `React.useCallback` 来缓存该函数。

```jsx
const A = React.memo((props: any) => {
    console.log("A is Updating...");
    return (
        <div>
            <div>text:{props.name}</div>
        </div>
    )
})
const B = () => {
    const [count, setCount] = useState(0);
    const [text, setText] = useState("");
    const handleClick = () => {
        setCount(count + 1);
    }
    const handleInputChange = React.useCallback((e) => {
        setText(e.target.value)
    }, [])
    return (<div>
        <input onChange={handleInputChange} />
        <button onClick={handleClick}>+1</button>
        <A name={text} handleInputChange={handleInputChange} />
    </div>)
}
```

现在，`A` 组件只会在 `name` 属性变化时重新渲染，而 `handleInputChange` 函数也只会在 `text` 状态变化时重新创建。

## 计算

### React.useMemo

另一个优化方向是使用 `React.useMemo` 缓存计算结果，从而避免组件重新渲染时重复执行昂贵的计算。

```jsx
const A = (props: any) => {
    const [num, setNum] = useState(0);
    const [state2, setState2] = useState(0);
    const result = new Array(num).fill(0).map((_, i) => i * i); // O(n)
    console.log("A is Updating...");
    return (
        <div>
            <div>text:{props.name}</div>
        </div>
    )
}
```

当 `num` 或 `state2` 发生变化时，`result` 都会被重新计算。

使用 `React.useMemo` 缓存计算结果：

```jsx
const A = React.memo((props: any) => {
    const [num, setNum] = useState(0);
    const [state2, setState2] = useState(0);
    const result = React.useMemo(() => new Array(num).fill(0).map((_, i) => i * i), [num]); // O(1)
    console.log("A is Updating...");
    return (
        <div>
            <div>text:{props.name}</div>
        </div>
    )
})
```

现在，`result` 只会在 `num` 状态变化时才重新计算。

### 使用 Hooks 时需要注意的事项

- **浅比较**：所有 Hook 的依赖项都进行浅比较，因此如果依赖项是引用类型，比较的是引用而非值。在这种情况下，可以使用 `lodash.isequal` 来进行值比较，以决定是否需要重新执行。

### 服务端渲染/生成

如果我们的应用计算量很大，可以将需要大量计算的组件抽取到服务端，从而利用服务器的资源。

有三种方式可以做到这一点：

1. **服务端生成（Server-side generation）**：在构建时生成页面，这样客户端不需要执行任何计算。
2. **服务端渲染（Server-side rendering）**：每次请求页面时在服务端进行渲染。
3. **React 服务器组件（React Server Component）**：可以将计算密集型组件单独拆分为服务器组件，并使用 `React.lazy` 增量加载，同时保留交互组件在客户端渲染。
