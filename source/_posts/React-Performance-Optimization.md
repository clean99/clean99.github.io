---
title: React Runtime Performance Optimization
date: 2024-04-16 08:32:53
tags: [Software Engineering, Frontend, React]
---

There are two directions that we can optimize the performance of react application:
1. **Rendering**: The rendering process is one of the most expensive part of react application(Diff calculation).
2. **Calculation**: Due to the limited resources of the browser, browser are not suitable for heavy calculation.

## Rendering

### React.memo

When a component is rerendered, its children are rerendered whatsoever, no matter if parents component pass the same props to children or not.

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

In the above example, the `A` component is rerendered every time the `count` or `text` state is changed, even if the `name` props is the same.

Even if B didn't pass any props to A, the `A` component will be rerendered too. This is because React won't assume that the props that passed to the component are the same as the previous props, even if they are the same value. When the B function is called, it create a new props object and pass to A component.

To avoid this, we can use `React.memo` to memoize the component.

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

Now, the `A` component will only be rerendered when the `name` props is changed.

### React.useCallback

`React.useMemo' performs a **shallow** comparison of props and state, so if B passes a function to A, if we don't memorize the function, the function will be re-created every time the component is re-rendered.

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

In the above example, the `A` component is rerendered every time the `count` or `text` state is changed, because the `handleInputChange` function is recreated every time the B component is re-rendered.

We can use `React.useCallback` to memoize the function.

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

Now, the `A` component will only be rerendered when the `name` props is changed, and the `handleInputChange` function will only be rerendered when the `text` state is changed.

## Calculation

### React.useMemo

Another direction is to use `React.useMemo` to memoize the calculation result, so that we can avoid the expensive calculation when the component is re-rendered.

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

when `num` or `state2` is changed, the `result` will be recalculated.

Use `React.useMemo` to memoize the result.

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

Now the `result` will only be recalculated when the `num` state is changed.

### Things to Know When Using Hooks

- **Shallow Comparison**: All hooks dependencies are shallow compared, so if the dependencies are reference types, they will be compared by reference, not by value. In this case, use `lodash.isequal` to compare the value and decide whether to move on.


### Server-side Rendering/Generation

If our application is calculation-heavy, we can extract the components that require calculation to the server side, so that we can utilize server's resources.

There are three ways to do this:

1. **Server-side generation**: Generate the page on build time, so that no calculation is required on the client side.
2. **Server-side rendering**: Render the page on server side whenever the page is requested.
3. **React service component**: We can separate the calculation-heavy components to a service component, and use `React.lazy` to load the service component incrementally, while keeping the interactive components on the client side.