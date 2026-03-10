---
title: Building Fault Tolerant React App With Error Boundary(Error Boundary Best Practice)
date: 2024-05-06 16:45:11
tags: [frontend, react, error-handling, error-boundary, fault-tolerance, robustness, reliability]
lang: en
i18n_key: Building-Fault-Tolerant-React-App-With-Error-Boundary
---

This Article will showcase what is the best practice to utilize error boundary to build a robust and fault tolerant react app. It includes: When to use Error Boundary, Build a Error Boundary HOC with Error Handling and Error Reporting.

## Concepts

### Fault-tolerant
A common practice to increase your systems reliability is to make your system fault-tolerant. Which means that your system must stay resilient even if there are errors produced by users, some parts of the systems, and upstream services.

### Minimize Influence of Errors
One way to make your system fault-tolerant is to minimize the influence of errors. If one module receives an error, we don't want it to affect the other modules.

### Error Boundary
React provides `<ErrorBoundary />` to handle errors thrown by components. Currently, most application only use it to catch and handle errors at app level(highest level). This means that once any component in your app throws an error, the whole application will crash.

> Throwing error at an unimportant filter component, causing the whole application crash.

```jsx
function App() {
  return (
    <div className="App">
      <ErrorBoundary>
        <Home />
      </ErrorBoundary>
    </div>
  );
}

function Home() {
  return (
    <div className="Home">
      <ComponentA />
      <ComponentB />
    </div>
  );
}

function ComponentA() {
    throw new Error('error');
}
```

The above code will crash the whole application!

## Remix: Router Level Error Boundary

[Remix](https://remix.run/) provides a way to handle errors at router level, each part of the application is nested router, and we can use `<ErrorBoundary />` to handle errors for each router.


> Without router level error boundary, the error will crash the whole application.

<img alt="remix" src="/img/error-boundary/1.png">

> With router level error boundary, the error will only crash the router.

<img alt="remix" src="/img/error-boundary/2.png">

## Generic Practice for when to use Error Boundary

It is infeasible to add ErrorBoundary to every component. This will dramatically increase code complexity. We need to make trade-offs to balance code maintainability and error handling scope.

### Feature Level Error Handling

We wanna minimize the influence of errors. However, some components work together to form a complete use flow. For example, different portions of a form, any portion breaks inside the form. It is meaningless to keep other parts of the form working. So we will add Error Boundary at the form level, so that any part of the form breaking won't affect other features like tables, search and so on.

### Component Level Error Handling
Some components indeed are very easy to produce errors, and themselves aren't very important features. In this case, we wanna add component level error handling to these components too, for example, filter, search features at table. Components are error-prone when:

1. The component is handling data from network requests, which could be an unexpected format.
2. The component is handling data from user input, which could also be an unexpected format.
3. The component has very complex business logic and state mutation.

### withErrorBoundary HOC(Error handling and Error Reporting)

To reduce the effort of adding component level error handling, we can create a HOC to wrap the component with error handling and error reporting feature.

```jsx
import { ErrorBoundary } from 'react-error-boundary';
import { sendEvent } from '@/libs/event';
import { IconAlertCircle } from '@/components/icons';

export default function withErrorBoundary<T>(WrappedComponent: React.FC<T>, text?: string) {
  return (props: T) => (
    (
        <ErrorBoundary
          FallbackComponent={() => (
                <div className='flex items-center gap-2'>
                    <IconAlertCircle style={{ color: 'red' }} />
                    {text}
                </div>
          )}
          onError={error => {
            sendEvent({
              name: 'component_error',
              content: `${WrappedComponent.name} error: ${error?.message}`,
            });
          }}
        >
          {<WrappedComponent {...props} />}
        </ErrorBoundary>
      ));
}
```

```jsx
// usage: add boundary to your component
export default withErrorBoundary<ComponentAProps>(ComponentA);
```

Features:

1. Handling Error & Fallback: Catch error and display a fallback(can customize) to user without affecting other modules.
2. Report error: log to slardar with component name and error message for debugging.

