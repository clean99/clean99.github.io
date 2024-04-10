---
title: Web Performance Optimization Strategies and Practices
date: 2024-04-10 18:41:30
tags: [Software Engineering, Web Performance, Frontend]
---

Web performance optimization is crucial and it has a lot of ways to implement, this is a note of how I optimize my company's project, and come up with several generic strategies that can be applied in different situations:

- **Profiling**: Before we apply the strategies below to optimize the website, we need to know where is the load of our website. Chrome provides a Profiling tool that helps us to do so.
- **Caching**: Utilizing Caching to reduce loading time.
- **Lazy Loading**: Reducing loading time by only loading resources when they are needed.
- **Integration (BFF)**: Utilizing BFF to integrate API calls.
## Profiling(Build Context)

1. **PV/UV(Page Views/Unique visitor)**: We can get the PV/UV of our website first, so that we can know how important each page in your website, which page might be the load, so that we can make the trade-off about whether to optimize them later.
2. **FMP(First Meaningful Paint)**: From opening the URL until your user can start working on it, how long does it take?
3. **Profiling**: Use profiling to analyze the whole flow of the opening website, to see which parts are slowing down the website. I won't go through this part in detail, refer to: ([Analyze runtime performance - Chrome](https://developer.chrome.com/docs/devtools/performance))

After these steps, I came out with those data:

1. FMP: ~10000ms(extremely low, it was that slow when I took this website)
2. Profiling result breaks down, initially diagnose the main problems:

| Priority | Item | Fmp Duration | Possible Next Steps |
| --- | --- | --- | --- |
| P1 | UI libraries initialization | 300ms | 1. Prefetch <br> 2. Lazy-load those not been used on the first page. |
| P0 | Blocking network requests <br> - Block part 1: <br> - API A request - 720ms<br> - Configuration APIs - 689ms <br> - Block part 2:<br> - permission checking - 1000ms | 1600ms | 1. Cache<br> 2. Lazy load<br> 3. Parallel requests execution<br> 4. APIs Integration |
| P3 | Download sub-app HTML | 21ms | - |
| P0 | Download and Run sub-app <br> 1. UI libraries initialization 800ms <br> 2. Common Libraries 900ms | 1700ms | 1. Caching using Chrome. |
| P0 | Query configuration | 1000ms | 1. Integrate and remove unnecessary request content <br> 2. Cache <br> 3. Prefetch |
| P0 | Unnecessary components loaded | 1210ms | 1. Lazy load(dynamic import) |

## Caching: Reducing Load Times Efficiently
Caching is a common strategy in web performance optimization, especially when dealing with high-traffic websites. Based on the concept that space is now not as valuable as time in most cases, caching frequently accessed data in a storage area can reduce load times and server load, making the website more responsive and efficient.
**Reducing duplicate common libraries download by utilizing chrome script cache feature**:
The micro-frontend framework in our company uses `eval` to load sub apps scripts:

```javascript
eval(proxyWindow){
    // ...code
}
eval(lodash) {
    // ...code
}
```

<img alt="OP 1" src="/img/web-op/1.png">

There is a better option `script`, it can utilize [Code caching for JS](https://v8.dev/blog/code-caching-for-devs) feature in Chrome to cache the compiled code. So that next time the code loads:

1. We don't need to download it from the remote again.
2. We don't need to compile it again.

So we change to use this `script` as a means of loading micro frontend scripts and libraries. And prevent downloading common libraries like UI library that are used by the main app and sub-app.
```javascript
// Execute Subapp's script
    const iframe = createIframe();
    patchWindow(iframe);
    patchDocument(iframe);

    scriptUrls.forEach(scriptUrl -> {
        const script = document.createElement('script');
        script.src = scriptUrl // Will create compile cache - Chrome feature
        iframe.append(script);
    });
```
## Lazy Loading: Loading on Demand
Lazy loading is a strategy used to delay the loading of certain resources until they are actually needed. This approach can significantly reduce initial load times and save bandwidth, particularly beneficial for websites with a large number of images or other heavy resources.
**Use **`**React.lazy()**`**to defer the loading of components**
I found that there are some containers that are:

1. They are rarely used by users.
2. They don't affect users' workflow on the main page.

So they are not necessary to be loaded until users really wanna get into them when I'm doing profiling(What should be loaded and what should be delayed depends on your users' behaviors, that's why we need to build enough context(gather data, talk to PM and your users) before optimizing it).
So I utilize [Code-Splitting – React](https://legacy.reactjs.org/docs/code-splitting.html) to remove the loading of them when users open the page:
```jsx
const XXX = lazy(() => import('./containers/XXX'));
const YYY = lazy(() => import('./containers/YYY'));
```
## Fetching Timing
My project has a set of request calls that go like this:

config API 1 call -> config API 2 call -> sidebar info API call -> sidebar loading -> main list API call -> main list loading

However, the config loadings and sidebar loading don't affect users' operation, what really matters is the main list.

So I change the fetching timing to make the main list load prior to others:

main list API call -> main list loading -> config API 1 call -> config API 2 call -> sidebar info API call -> sidebar loading

This makes the main list display much faster.

## APIs Integration (BFF): Reduce Requests to Improve Speed
Due to historical reasons, my website's APIs are quite legacy:

1. **Breaking APIs with the Same Functionality**: Some APIs are doing the same things but they need to be called by different parameters, for example, `getConfig(id)` will be called multiple times with different ids, this significantly slows down network requests in the browser as browser's network request pool has a certain limitation.
2. **Unnecessary Data in Response**: APIs are serving different websites, and each of them has different requirements. There are lots of unnecessary data in response to my website, which also slows down the network requests.

In my project, I implemented a BFF layer to consolidate and optimize API calls. This involved merging multiple(14+) configuration APIs.
## Result&Summarization
After the first round of optimization, my website has significant improvement in FMP(From 10000ms to 4000ms).
The keys to optimizing websites are:

1. **Build Enough Context**: You must know what your users' behaviors, what is the bottleneck of your projects, and what is the direction so that you can make reasonable tradeoffs.
2. **Timing**: We don't wanna load unnecessary resources for certain moments(lazy-loading), and we wanna load something first for the future(prefetching).
3. **Caching**: Time is usually more important than space, and we can utilize space to cache so that we don't need to use time resources in the future.
