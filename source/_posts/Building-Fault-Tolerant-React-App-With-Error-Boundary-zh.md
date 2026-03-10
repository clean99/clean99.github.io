---
title: 使用 Error Boundary 构建容错 React 应用（Error Boundary 最佳实践）
date: 2024-05-06 16:45:11
tags: [frontend, react, error-handling, error-boundary, fault-tolerance, robustness, reliability]
lang: zh
i18n_key: Building-Fault-Tolerant-React-App-With-Error-Boundary
permalink: zh/2024/05/06/Building-Fault-Tolerant-React-App-With-Error-Boundary/
---

本文将展示如何利用 error boundary 的最佳实践来构建一个健壮且容错的 React 应用，包括：何时使用 Error Boundary、构建带有错误处理和错误上报功能的 Error Boundary HOC。

## 核心概念

### 容错性
提高系统可靠性的一种常见做法是使系统具备容错性。这意味着即使用户、系统某些部分或上游服务产生错误，你的系统也必须保持弹性。

### 最小化错误影响
使系统具备容错性的一种方式是最小化错误的影响范围。如果某个模块发生错误，我们不希望它影响到其他模块。

### Error Boundary
React 提供了 `<ErrorBoundary />` 来处理组件抛出的错误。目前，大多数应用只在应用层级（最高层）使用它来捕获和处理错误。这意味着一旦应用中的任何组件抛出错误，整个应用都会崩溃。

> 在一个不重要的筛选组件中抛出错误，导致整个应用崩溃。

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

上面的代码会导致整个应用崩溃！

## Remix：路由级别的 Error Boundary

[Remix](https://remix.run/) 提供了一种在路由级别处理错误的方式，应用的每个部分都是嵌套路由，我们可以使用 `<ErrorBoundary />` 为每个路由处理错误。


> 没有路由级别的 error boundary，错误会导致整个应用崩溃。

<img alt="remix" src="/img/error-boundary/1.png">

> 有了路由级别的 error boundary，错误只会导致该路由崩溃。

<img alt="remix" src="/img/error-boundary/2.png">

## 何时使用 Error Boundary 的通用实践

为每个组件都添加 ErrorBoundary 是不可行的，这会大幅增加代码复杂性。我们需要做出权衡，在代码可维护性和错误处理范围之间取得平衡。

### 功能级别的错误处理

我们希望最小化错误的影响范围。然而，某些组件协同工作以形成完整的使用流程。例如，表单的不同部分，表单内部任意部分出现问题。保持表单其他部分继续工作是没有意义的。因此，我们在表单级别添加 Error Boundary，这样表单任何部分的崩溃都不会影响其他功能（如表格、搜索等）。

### 组件级别的错误处理
某些组件确实很容易产生错误，而它们本身并不是非常重要的功能。在这种情况下，我们也希望为这些组件添加组件级别的错误处理，例如表格中的筛选、搜索功能。以下情况下组件容易出错：

1. 组件处理来自网络请求的数据，这些数据可能格式意外。
2. 组件处理来自用户输入的数据，这些数据也可能格式意外。
3. 组件具有非常复杂的业务逻辑和状态变更。

### withErrorBoundary HOC（错误处理与错误上报）

为了降低添加组件级别错误处理的成本，我们可以创建一个 HOC 来为组件包装错误处理和错误上报功能。

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

功能特性：

1. 错误处理与降级展示：捕获错误并向用户展示降级内容（可自定义），而不影响其他模块。
2. 错误上报：将带有组件名称和错误信息的日志上报到 slardar，以便调试。
