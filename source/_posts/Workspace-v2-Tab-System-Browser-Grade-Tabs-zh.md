---
title: "Workspace v2 Tab System：把浏览器标签页能力带进单页工作台"
date: 2026-05-18 16:30:00
tags: [Frontend, React, Software Engineering]
lang: zh
i18n_key: Workspace-v2-Tab-System-Browser-Grade-Tabs
permalink: zh/2026/05/18/Workspace-v2-Tab-System-Browser-Grade-Tabs/
---
## 背景和目标

Workspace v2 要把原来偏“单页面、单上下文”的工作台，改成可以同时承载多个工作流、多个子应用视图、多个工单对象的工作空间。对用户来说，这个体验更接近浏览器：我打开了几个工作流，切来切去状态还在；我刷新页面或者把链接发给别人，应该还能回到正确的业务页面；我在一个子应用里打开弹窗，不能盖到另一个 tab 上。

![workspace tab system demo](/img/workspace-v2-tab-system/workspace-tab-system-demo.png)

图 0：一个通用工作台里的 tab system 演示。用户可以同时打开多个工作对象，像浏览器一样切回；只有当前 tab 拥有 URL、弹层、事件和前台 CPU。

业务目标：

| 业务目标 | 用户看到的体验 |
| --- | --- |
| 多任务并行 | 同时打开多个 workstream / subapp / ticket，不需要反复回到首页找入口 |
| 上下文不丢 | 切回之前打开过的 tab，表格筛选、iframe 内状态、Workstream 内部 view 尽量保留 |
| 链接仍然可靠 | 刷新、复制链接、外部 deep link 都能恢复到合理 tab |
| 子应用无感接入 | 子应用继续表达“我要打开某个页面”，不需要理解宿主 tab 内部实现 |
| 体验接近浏览器 | 切换快，后台 tab 不抢当前 tab 的资源 |

技术目标：

| 用户期望 | 工程上必须解决的问题 | 如果没解决，实际后果 |
| --- | --- | --- |
| 打开多个 workstream | 持久化 opened tabs、顺序、pin 状态 | 刷新后 tab 丢失，或者不同窗口看到的 tab 不一致 |
| 切回来状态还在 | 保留有限数量的 DOM / iframe runtime | 每次切换都重新加载，筛选、滚动、iframe 内状态丢失 |
| URL 可刷新、可分享 | 从浏览器 URL 找回对应 tab；tab 激活时同步业务 URL | 复制链接打开后变成“没有 tab 归属的页面”，或者地址栏指向错误 tab |
| 多窗口同时使用 | 窗口之间同步 tab list 变化 | 一个窗口关闭 tab，另一个窗口仍显示旧 tab |
| 子应用能打开页面 | SDK / event bus 只表达意图，由宿主决定打开方式 | 业务方直接改宿主状态，tab 行为分散到各子应用里 |
| hidden tab 不影响当前 tab | history、DOM、overlay、event、focus 都按 tab 隔离 | 隐藏 iframe 改掉当前 URL；弹窗出现在另一个 tab；后台应用抢 CPU |
| 切换不卡 | 首屏、热切换、后台任务分别测量和调度 | 页面已经显示但点击无响应，旧指标还误报“只用了几十毫秒” |

![architecture goals](/img/workspace-v2-tab-system/architecture-goals.png)

图 A1：从产品目标到工程约束。它把“用户想要的浏览器级体验”拆成具体技术问题，也把失败后果写出来。

我们最终的设计原则是：
> 用真实业务 URL 判断页面应该落到哪个 tab，用服务端状态记录 tab 是否打开，用有限热池保留最近工作的 runtime，用宿主边界隔离子应用的 history、DOM、overlay 和事件。

核心是：

1. **怎么判断两个入口是不是同一个 tab。** 例如同一个 workstream 应该复用一个 tab，具体内部 view 通过 URL/subPath 保留。
1. **谁拥有当前页面的运行时权力。** 当前 focused tab 才能写浏览器 URL、显示 overlay、接收 focus event、占用前台 CPU。

## 架构分层

![architecture layers](/img/workspace-v2-tab-system/architecture-layers.png)

图 A2：Tab system 的最终分层。Isolation 和 Observability 是两件事：Isolation 是运行时边界，负责阻止 hidden runtime 改当前 tab 的 URL、弹层和事件；Observability 是横切能力，负责定位哪里慢、哪里被拦、哪里异常。

这套架构可以按七类职责理解：

| 职责 | 用户能感知的问题 | 核心机制 |
| --- | --- | --- |
| Intent Interface | 同一个业务对象从菜单、子应用按钮、URL 打开时，不应该有时重复开 tab、有时只在当前 tab 里跳转 | 所有入口先归一成打开意图；宿主统一决定新窗口、吸收当前 tab、聚焦已有 tab，还是新增 tab |
| URL and Tab Ownership | 用户刷新或分享链接后，应该回到同一个业务页面，而不是丢到一个没有 tab 归属的页面 | 地址栏始终保留业务 URL；宿主从 URL 解析业务对象，再判断它属于哪个 tab |
| Persistent Tab State | 刷新后 tab 不该消失；两个浏览器窗口看到的 tab list 不该互相分裂 | 服务端保存 opened tabs 事实；前端做乐观更新；mutation 成功后通知其它窗口失效重拉 |
| Runtime Cache | 切回最近 tab 要快，但打开很多 tab 后当前页面不能变卡、内存不能无上限上涨 | opened tabs 记录用户语义；hot runtime pool 只保留最近工作集；淘汰 runtime 不删除 tab |
| Isolation Boundary | 切到 tab B 后，tab A 不能改地址栏、弹窗盖到 B、或在后台刷新抢资源 | history、window.parent、document/body、overlay、focus event 都按当前 owner 过滤 |
| Rendered Runtimes | 用户只看到一个当前 tab，点击、弹层、URL 写入也必须属于这个 tab | 每个 hot runtime 放进稳定容器；只有 focused owner 可见、可点、可接收前台事件 |
| Observability | 首屏慢、切换卡、弹层串 tab、URL 写错时，必须能定位是哪一层出问题 | FMP 看首屏；tab switch v3 看切换；long task 看可见后卡顿；scope drop 看越界写入；stress gate 看回归 |

## 第一层：Intent Interface

### 问题场景

用户打开同一个业务对象的入口很多：左侧菜单、tab 点击、子应用内部按钮、MF event、iframe `postMessage`、复制来的业务 URL。用户期望很简单：同一个对象不要重复开多个 tab；已经打开的 tab 应该被聚焦；在子应用 root 里打开同应用 view 时，能在当前 tab 内继续导航。

如果每个入口自己决定怎么打开，就会出现用户能直接看到的问题：从菜单打开会复用 tab，从子应用按钮打开却新开重复 tab；从分享链接进入能恢复，从 SDK 进入却丢掉上次 view；超过 tab 上限时有的入口会拦住，有的入口绕过上限。背后的原因才是接口散落：有的子应用改 React state，有的发路由，有的自己调 BFF。

### 解决方案

我们把子应用能力收口成 intent：业务方只表达“我要打开什么”，宿主决定“怎么打开”。

| 来源 | 输入 | 宿主决策 |
| --- | --- | --- |
| 用户点击 tab | tab row id | 读保存的 tab URL，激活 runtime，写 browser URL |
| MF event bus | `TAB_OPEN_REQUEST`、`NAVIGATE_TO_URL` | 聚焦已有 tab、吸收到当前 tab、打开新 tab 或新浏览器窗口 |
| Seto iframe | `window.postMessage` envelope | 校验 origin 和 payload，再转成宿主 event bus 事件 |
| Subapp SDK | `openWorkstreamTab`、`openSubappViewTab`、`openSubApp`，通常通过宿主 event bridge 暴露 | 归一化 payload，查找已有 tab，必要时新增 |

简化后的伪代码：
```typescript
// 子应用只发意图，不碰宿主内部状态
function openSubappView(viewType, viewId) {
  emit('TAB_OPEN_REQUEST', { itemType: 'SUBAPP_VIEW', viewType, viewId });
}

// iframe 只把意图发给宿主；校验、去重和路由仍由宿主负责。
window.parent.postMessage({
  type: 'MF_EVENT',
  payload: {
    type: 'TAB_OPEN_REQUEST',
    data: {
      itemType: 'WORKSTREAM',
      workstreamId: 'from-iframe',
    },
    metadata: {
      source: 'REPORT_CENTER',
      timestamp: Date.now(),
    },
  },
}, targetOrigin);

// 宿主统一处理
function handleTabOpenRequest(raw) {
  const input = normalizeAndValidate(raw);

  if (raw.openInNewBrowserTab) {
    window.open(buildBusinessUrl(input));
    return;
  }

  // existing：目标业务对象已经有自己的 tab。
  // 例子：用户要打开 view A，而 view A 的独立 tab 已经在 tab list 里。
  const existing = findExistingTab(tabs, input);

  // absorbing：当前 focused tab 是一个可承载内部 view 的 carrier。
  // 例子：用户正在某个 SubApp root / SubApp view 里打开同属一个 app 的 sibling view；
  // 这时更像“在当前 app tab 内导航”，不是“打开一个全新工作上下文”。
  const absorbing = findFocusedTabThatCanAbsorb(input);

  // 这两个概念不是重叠的：
  // - existing 处理“目标是否已经有 tab”；
  // - absorbing 处理“当前 tab 是否可以直接承接这次导航”。
  //
  // 如果当前是 subapp root，并且目标已有精确 tab，优先跳已有 tab；
  // 否则会优先吸收到当前 carrier，避免在同一个子应用里频繁开重复 runtime。
  if (existing && absorbing?.kind === 'subapp-root') {
    focusTab(existing.id, savedUrlOrDefault(existing));
    return;
  }

  if (absorbing) {
    navigateInsideTab(absorbing.id, buildPath(input));
    return;
  }

  if (existing) {
    focusTab(existing.id, savedUrlOrDefault(existing));
    return;
  }

  addTabWithCapacityControl(input);
}

```

这一层同时解释了为什么“Interface”不应该单独放到后面：它就是入口层。SDK / event bus 的作用是把复杂性挡在宿主里面。

### 难点

难点不是发一个事件，而是 **用户从任何入口做同一件事，结果都必须一致**。用户点击、SDK、postMessage、直接 URL 恢复，最后都要落到同一套 find / absorb / add / focus / capacity 控制上。否则用户看到的就是重复 tab、错误聚焦、上限绕过和返回路径不一致。

## 第二层：URL and Tab Ownership

### 问题场景

浏览器地址栏只有一个，但工作台内部可能同时保活多个 tab runtime。我们不能把 URL 改成 `/tabs/:id`。根本原因不是“难看”，而是它会把链接从业务语义变成用户私有会话语义：

| URL 形态 | 用户复制给别人后发生什么 |
| --- | --- |
| `/tabs/abc123` | 只说明“我的 tab list 里有一个 id=abc123 的 tab”。别人没有这个 tab id，也不知道它对应哪个 workstream / ticket / view |
| `/workspace/workstream/123/schedule/456` | 链接本身包含业务对象。刷新、收藏、IM 分享、外部系统 deep link 都能恢复到同一个业务页面 |

所以 `/tabs/:id` 虽然让宿主实现更简单，但会牺牲刷新、分享和跨端恢复能力。对工作台这种协作产品来说，这是不可接受的。

所以我们保留真实业务 URL，例如：

- `/workspace/workstream/:id/...`
- `/workspace/scheduling/schedule/view/:viewId`
- `/workspace/audit_workbench/ticket/custom_view/:viewId`

同时，宿主内部用这些 URL 推导“这个页面属于哪个 tab”。更具体地说，就是从 URL 里抽出一组业务字段，用它判断两个入口是否应该复用同一个 tab。

| Tab 类型 | 判定是否同一个 tab 的字段 | 说明 |
| --- | --- | --- |
| Workstream | `workstreamId` | 内部 view 变化不一定开新 runtime，而是作为这个 Workstream tab 的路径 |
| SubApp root | `subAppType` | 子应用根入口是稳定 tab |
| SubApp view | `viewType + viewId` | 具体业务视图可以独立打开，也可能被当前 subapp tab 吸收 |
| Ticket | `ticketId + viewType` | 工单对象适合作为独立 tab |
| Non-tab route | 不进入 tab list | Home、notification、unknown route 不污染 tab lifecycle |

![url tab sync](/img/workspace-v2-tab-system/url-tab-sync.png)

图 A3：URL 和 tab 的双向同步。重点是：浏览器地址栏仍然是业务 URL，宿主在内部把它映射到 tab。

### Browser URL -> Tab

这条链路处理刷新、复制链接、外部 deep link。
```typescript
function onRouteChanged(location) {
  // 浏览器地址栏变化后，先把业务 URL 解析成“它是否属于某个 tab”。
  // appList 用来识别不同子应用的业务路由。
  const resolved = resolveTabFromUrl(location.pathname, appList);

  if (resolved.kind !== 'tab') {
    // Home、redirect、standalone fallback 这类页面不是工作 tab。
    // 它们走普通路由渲染，不创建 tab row，也不进入 hot runtime pool。
    renderSingleOutlet();
    return;
  }

  // 如果服务端 opened tabs 里已经有这个业务对象，只需要聚焦它。
  // 这里不能新增，否则刷新一次就可能多一个重复 tab。
  const matched = findOpenedTab(tabs, resolved.input);
  if (matched) {
    focusRuntime(matched.id);
    return;
  }

  // direct URL recovery:
  // 用户打开的是一个业务 URL，但 BFF 里还没有对应 tab。
  // 宿主要补开 tab，否则页面会变成“没有 tab 行归属”的孤儿页面。
  addTab(toAddWorkspaceTabRequest(resolved.input));
  focusRuntimeWhenReady(resolved.input);
}

```

### Tab -> Browser URL

这条链路处理用户点击 tab。
```typescript
function activateTab(tab) {
  // 每个 tab 都记住自己上一次停留的业务 URL。
  // 例如用户在 Workstream tab 内切到了某个 view，下次点回这个 tab 应该回到那个 view，
  // 而不是永远回到 Workstream 默认页。
  const path = loadSavedTabUrl(tab.id) ?? buildDefaultBusinessUrl(tab);

  // 从点击开始计时。后面会分别记录 frame visible、interactive、settled，
  // 防止“页面显示了但还不能点”的时间被旧指标漏掉。
  startTabSwitchMetric({ toId: tab.id, targetPath: path });

  // 告诉 Seto / iframe 的 history scope：
  // 接下来这次 URL 写入属于目标 tab，而不是某个 hidden runtime 的越界写入。
  prepareScopedNavigation({ targetTabId: tab.id, url: path });

  navigate(path, {
    // React Router 只看到一个全局 history。
    // 这里把目标 tab id 写进 history.state，后续 popstate / hashchange / Seto history
    // 才能判断这次导航应该投递给哪个 runtime。
    state: { workspaceTargetTabId: tab.id },

    // tab 激活是用户输入的直接结果，必须尽快让 focused frame 和 URL 对齐。
    flushSync: true,
  });
}

```

### Window -> Window

多个浏览器窗口不能共享 React state，所以同步的是“事实”，不是组件状态。
```typescript
function onTabMutationSuccess() {
  // 本窗口的缓存先失效。
  queryClient.invalidateQueries(WORKSPACE_TABS_KEY);

  // 其它窗口没有共享 React state，只能收到一个“事实变了”的通知后自己重拉。
  broadcastChannel.postMessage({ type: 'TABS_INVALIDATED' });
}

function onOtherWindowInvalidated() {
  queryClient.invalidateQueries(WORKSPACE_TABS_KEY);
}

```

### 难点

这层最大的难点是 **URL 既是用户契约，也是 runtime 定位输入**。用户看到的必须是业务 URL；宿主内部又必须知道这次 URL 变化属于哪个 tab。我们通过 URL resolver + activation state 同时满足这两个约束。

## 第三层：Persistent Tab State

### 问题场景

用户能感知到的目标是：刷新后刚才打开的 tab 还在；点“打开”后 tab row 立刻出现；在窗口 A pin / close / reorder 后，窗口 B 不会继续显示旧状态。

如果 tab list 只放在前端内存里，刷新后所有 tab 都会消失；如果每次 mutation 都等服务端返回，用户点击后 tab row 会慢半拍；如果多窗口不通知，A 已经关掉的 tab，B 里还会显示成可点击。

tab list 的后端动作也可能相对慢，因为 add / reorder / pin 可能会扇出到多个服务。前端需要 optimistic interaction，但不能把本地状态当成最终事实。

### 解决方案

持久状态由 BFF 和 React Query 共同处理：

| 模块 | 负责什么 |
| --- | --- |
| BFF tab controller | `list/add/remove/pin/unpin/reorder`，合并 opened tabs 和 pinned tabs |
| React Query | 单一 tab list cache key；staleTime；focus refetch |
| optimistic mutation | 新增 tab 时先插临时 tab，服务端返回后替换。临时 tab 在真实 id 返回前禁止 pin / unpin / delete 等动作 |
| BroadcastChannel | mutation 后通知其它窗口失效并 refetch |

![persistent tab state](/img/workspace-v2-tab-system/persistent-tab-state.png)

图 A3.5：Persistent tab state 的模块关系。React Query 让当前窗口先快起来，BFF 保存最终事实，BroadcastChannel 只通知其它窗口“事实变了”，其它窗口再自己从 BFF 拉最新 tab list。

伪代码：
```typescript
function addWorkspaceTab(input) {
  queryClient.setQueryData(WORKSPACE_TABS_KEY, tabs => [
    ...tabs,
    makeTempLockedTab(input),
  ]);

  post('/workspace/api/tab/add', input)
    .then(serverTab => replaceTempTab(serverTab))
    .finally(() => broadcastTabsInvalidated());
}

```

### 难点

这里的难点是 **既要快，又要以服务端事实为准**。Optimistic UI 只能改善交互延迟，不能绕开 BFF。最终 tab id、pin 状态、跨窗口一致性都必须回到服务端 tab list。

## 第四层：Runtime Cache

### 问题场景

用户打开很多 tab 后，有两个相互冲突的感受：切回最近几个 tab 应该很快，表格滚动位置、iframe 状态、内部 view 都最好还在；但如果所有 tab 都热运行，当前 tab 会变卡，后台 iframe 会继续跑任务，浏览器内存也会一路上涨。

因此 cache 不能只说“keep alive”。它有三种完全不同的职责。

![runtime cache layers](/img/workspace-v2-tab-system/runtime-cache-layers.jpg)

图 A4：Runtime cache 的三层职责。Opened tabs 是持久化事实；Hot runtime pool 是有限热运行资源；Scoped view cache 是 Workstream runtime 内部的局部保活。Idle prewarm 是后台准备策略，不是无限后台加载。

| 层 | 回答的问题 | 生命周期 |
| --- | --- | --- |
| Opened Tabs | 这个 tab 是否存在 | BFF 持久化；最多 20 个 opened tabs；pin 不计入 cap |
| Hot Runtime Pool | 切回时能不能马上显示 | 最多 5 个 hot frames；保留 DOM 或 Seto sandbox；LRU demote |
| Cold Tab | tab 存在但 runtime 不热 | 保留 tab row 和 URL；聚焦时重建 runtime |
| Scoped View Cache | Workstream 内部 view 能不能快速回来 | 按 workstream scopeKey 缓存；最多 30 个 inner views |
| Idle Prewarm | 用户点击前能不能先准备一部分 | 首屏后执行；native 更早，Seto 更晚；切换中暂停 |

### 核心原理

热池只回答一个问题：哪些 runtime 现在值得保活。它不决定 tab 是否存在，也不修改服务端 tab list。
```typescript
class WarmPool {
  promote(tabId, location, runtimeKind) {
    // 用户聚焦或预热命中时，把这个 tab 放进 hot set。
    hot.set(tabId, { tabId, location, runtimeKind, lastFocusedAt: now() });

    // Seto sandbox 更重，所以有单独上限；全局 hot frame 也有总上限。
    // 淘汰只会卸载 runtime，不会删除 opened tab。
    evictOldestSetoIfOverCap();
    evictOldestHotFrameIfOverGlobalCap();

    notifySubscribers();
  }
}

```

内容区根据当前 URL 选择渲染方式：
```plaintext
if (resolved.kind === 'nonTab') {
  // 非 tab 页面走普通路由，不放进 HotTabStack。
  return <Outlet />;
}

return (
  <HotTabStack>
    {hotTabs.map(tab => (
      <HotTabFrame
        tab={tab}
        // 只有 focused tab 可见、可交互；其它 hot tab 保留 runtime，但不接收前台事件。
        isFocused={tab.id === focusedTabId}

        // focused tab 用当前浏览器 URL；后台 hot tab 用自己上次保存的 URL。
        location={tab.id === focusedTabId ? currentLocation : tab.location}
      />
    ))}
  </HotTabStack>
);

```

Idle prewarm 的策略也不是“能预热就预热”：
```typescript
afterFirstScreenReady(() => {
  requestIdleCallback(() => {
    for (const candidate of selectIdlePrewarmTabs({ tabs, focusedTabId, hotTabs })) {
      if (foregroundTabIsSettling()) break;
      prewarmRuntime(candidate);
    }
  });
});

function selectIdlePrewarmTabs({ tabs, focusedTabId, hotTabs }) {
  if (!focusedTabId) return [];

  const hotIds = new Set(hotTabs.map(tab => tab.id));
  const recentIds = loadRecentHotTabIds(agentId);

  return sortRecentTabsBeforeOtherTabs(tabs, recentIds)
    .filter(tab => tab.id !== focusedTabId)
    .filter(tab => !hotIds.has(tab.id))
    .filter(tab => tab.isLocked !== true)
    .slice(0, 2);
}

// 1. idle queue 选出带 id、URL、runtime kind 的 candidate。
// 2. WarmPool promote 这个 candidate。
// 3. WorkspaceContentHost 通过 useSyncExternalStore 订阅 WarmPool。
// 4. HotTabFrame 在用户点回前先把 runtime mount 好。

```

### 难点

这层难点是 **性能收益和资源风险相互冲突**。全部保活最简单，但会把后台 runtime 变成无上限。我们把 opened tabs 和 hot runtimes 分开，保留用户语义，同时给内存和 CPU 一个硬上限。

## 第五层：Isolation Boundary

### 问题场景

用户切到 tab B 后，tab A 里的子应用虽然看不见，但它的 iframe 仍然可能在后台运行。用户能看到的异常不是抽象的“隔离失败”，而是这些具体后果：

| 用户能看到的问题 | 背后的原因 |
| --- | --- |
| 当前 tab 地址栏突然变成另一个 tab 的 URL | hidden iframe 仍然能写 `history.pushState` / `replaceState` |
| 按浏览器返回键时，非当前 tab 的内部路由被唤醒 | 所有 iframe 都可能收到同一个 `popstate` / `hashchange` |
| 切到 tab B 后，tab A 的 Modal/Toast 盖在 B 上；Dropdown 位置漂移 | 子应用或组件库把弹层 append 到全局 `document.body` |
| 后台 tab 以为自己被聚焦，开始拉数据或执行重任务 | lifecycle event 没有按 tabId 过滤，所有子应用都收到 `TAB_FOCUSED` |

![seto isolation](/img/workspace-v2-tab-system/seto-isolation.png)

图 A5：Seto integration and tab isolation。Seto 负责加载 HTMLSandbox；Workspace host 在 Seto 暴露的生命周期和 sandbox window 外围加 tab 归属上下文。

### Seto 接入：从目标倒推能力

这一层的目标不是“用了哪些 Seto API”。目标是更具体的四个不变量：

| 目标 | 不变量 |
| --- | --- |
| 复用 Seto 加载能力 | 子应用仍然由 Seto `HTMLSandbox` 加载，不重造一套 runtime |
| 每个 tab 有自己的挂载边界 | 子应用 DOM 必须落到当前 tab 的容器里，不能落到全局容器 |
| hidden runtime 不能越界 | hidden sandbox 不能改当前 tab 的 URL、弹层、focus event |
| 子应用不感知 tab 细节 | 子应用仍然按 `window.parent`、`document.body`、history、event bus 的旧方式写代码 |

为了满足这些目标，我们把“用户可见问题”和“背后原因”分开写：

| 用户能看到的问题 | 背后原因 / Seto 约束 | 需要的边界 |
| --- | --- | --- |
| 用户切到 tab B 后，地址栏变成 tab A 的 URL，tab A 的弹窗盖到 B，或 tab A 开始刷新抢资源 | Seto 默认解决“怎么加载子应用”，不知道这次 DOM / history / event 操作应该归属于哪个 Workspace tab | 宿主必须在 Seto 外围补一层 tab 归属上下文，把 DOM、history、event 都挂到目标 tab |
| 切回某个 tab 时，看到的是另一个 tab 的内容或滚动状态 | sandbox 内容如果挂到全局容器，就没有 per-tab DOM root | `getContainer()` 必须返回当前 HotTabFrame 的 root |
| 首次进入子应用时偶发地址栏写错、或 patch 太早导致空白 / 异常 | sandbox window 只有 ready 后才能访问；太晚 patch 又可能漏掉首次 history 写入 | `onSandboxReady()` 后立刻注册 runtime frame |
| 用户没有切回 tab A，但当前地址栏被 tab A 的内部跳转改掉 | Seto 自己维护 `RAW_HISTORY`，只 patch host history 不够 | patch `sandbox.raw.win.RAW_HISTORY`，按 tab target 校验 push / replace |
| 点击子应用按钮后，当前 tab 被跳到其它页面，或者其它 tab 也被刷新 | 子应用可能通过默认 `window.parent` 拿到裸 host history、document、event bus | 给 `parent` 返回按 tab 裁剪后的 Proxy |
| 切到 tab B 后，tab A 的 Modal/Toast 仍盖在页面上；Dropdown 跟触发器错位 | 组件库会把 Modal/Dropdown/Toast append 到全局 `document.body` | 通过 document/body API 把节点路由到 tab-owned overlay root |
| Modal 被限制住了，但 Dropdown / Tooltip 坐标漂移 | overlay 类型不一样：Modal 属于内容区，Dropdown/Tooltip 需要按触发器定位 | 区分 content overlay 和 floating overlay；大面积判断只用于 `position: fixed` |
| 后台 tab 收到 `TAB_FOCUSED` 后开始刷新、轮询或执行重任务 | lifecycle event 默认是全局广播 | event bus 按 tabId 过滤 focus / blur |
| 切换当前 tab 时，后台 runtime 抢 CPU | hidden runtime 仍可能继续 timer、lifecycle prime、prewarm 或刷新任务 | 用 foreground lease 和后台调度器；当前 tab 稳定前延后后台任务 |

所以我们最后用到的 Seto 能力，其实是被这些边界倒推出来的：

| Seto 能力 | 满足哪个要求 | 接入方式 |
| --- | --- | --- |
| `HTMLSandbox` | 继续复用 Seto 的加载、entry、basename 和生命周期 | 宿主只包一层 tab owner，不替换 Seto runtime |
| `getContainer()` | 让 DOM 挂到当前 tab，而不是全局页面 | 返回当前 HotTabFrame 内部的 root；root 变化时重新注册 DOM scope |
| `onSandboxReady(sandbox)` | 拿到可 patch 的 sandbox window | 拿 `sandbox.raw.win` 后注册 runtime frame，patch history / parent / event |
| `BaseSandbox` | 识别“这次 document/body 调用来自哪个 sandbox” | 用 WeakMap 把 sandbox 关联到 tab root |
| `DocExternals` / document plugin context | 接管 `document.body`、query、append 等 API | 查询限制在 scoped root；body portal 路由到 tab overlay root |
| `sandbox.raw.win.RAW_HISTORY` | 接管 Seto 真正使用的 history | 对 `pushState` / `replaceState` 做 tab target 校验，再决定是否同步 host history |

接入顺序可以简化成这样：
```plaintext
function SetoTabRuntime({ tabId, entry, initialUrl }) {
  const root = getCurrentHotTabRoot(tabId);
  let sandboxRef = null;

  return (
    <HTMLSandbox
      entry={entry}
      getContainer={() => {
        // 目标 1：Seto 内容必须挂到当前 tab 的容器。
        // 这里还不能假设 sandbox 已 ready，所以先返回 root；
        // 如果 sandboxRef 已经有值，再把 sandbox 和 root 绑定成 DOM scope。
        if (sandboxRef) {
          registerDomScope({ sandbox: sandboxRef, root, tabId });
        }
        return root;
      }}
      onSandboxReady={sandbox => {
        // 目标 2：sandbox window ready 后，马上接管运行时边界。
        sandboxRef = sandbox;
        registerDomScope({ sandbox, root, tabId });

        // 目标 3：history、parent、event 不能直接用裸 iframe window。
        registerRuntimeFrame({
          tabId,
          iframeWin: sandbox.raw.win,
          initialUrl,
        });
      }}
    />
  );
}

```

这个顺序很关键：`getContainer()` 解决“挂到哪里”，`onSandboxReady()` 解决“拿到哪个 window 可以 patch”，DOM scope 解决“document/body 属于谁”，runtime frame 解决“history、parent、event 属于谁”。

### History / Window scope

Seto 里有多层 history，只 patch 宿主 `window.history` 不够：

| History surface | 归属 | 风险 |
| --- | --- | --- |
| `window.history` | Workspace host | 直接改可见地址栏 |
| `iframeWin.history` | Seto sandbox subapp | 默认不知道自己的 Workspace tab 是否 active |
| `iframeWin.RAW_HISTORY` | Seto history plugin | Seto 内部 push / replace 可能绕过 host history 检查 |
| `scopedHistory` | Workspace isolation layer | 判断这次写入是否属于 focused tab |
| `window.parent.history` | 子应用逃逸到宿主的入口 | 如果不代理，可以直接写宿主 URL |

核心逻辑不是“禁止所有 history 写入”，而是只允许目标 tab 写。
```typescript
function scopedPushState(state, unused, url) {
  const targetTabId =
    preparedNavigation?.url === url
      ? preparedNavigation.targetTabId
      : readTabIdFromHistoryState(state) ?? resolveTabIdFromUrl(url);

  if (targetTabId !== currentFrame.tabId) {
    reportScopeDrop('history_drop');
    return;
  }

  rawHistory.pushState(state, unused, url);

  if (focusedRuntimeTabId === currentFrame.tabId) {
    hostHistory.pushState(addTabIdToState(state, currentFrame.tabId), unused, url);
  }
}

```

`window.parent` 也不是裸宿主窗口，而是 Proxy：
```typescript
parentProxy.get('history')  -> scopedHistory
parentProxy.get('document') -> iframeWin.document
parentProxy.get('location') -> iframeWin.location
parentProxy.get('__workspaceMFEventBus__') -> scopedEventBus

```

这样 Seto 子应用仍然按原接口访问 `window.parent`，但拿到的是按 tab 裁剪后的对象。

### Event scope

URL 类事件只投给目标 tab：
```typescript
function addEventListener(type, listener) {
  if (type !== 'popstate' && type !== 'hashchange') {
    return rawAddEventListener(type, listener);
  }

  rawAddEventListener(type, event => {
    if (resolveTargetTabForEvent(event) === currentFrame.tabId) {
      listener(event);
    } else {
      reportScopeDrop('event_drop');
    }
  });
}

```

MF event bus 也做生命周期事件过滤：
```typescript
scopedEventBus.listen(listener) {
  if (!listener.listensTo('TAB_FOCUSED', 'TAB_BLURRED')) {
    return hostBus.listen(listener);
  }

  return hostBus.listen(payload => {
    if (payload.data.tabId === currentFrame.tabId) {
      listener(payload);
    }
  });
}

```

### DOM / Overlay scope

这里的用户问题是：弹窗和下拉看起来是“当前 tab 的 UI”，但底层组件库经常把节点挂到全局 `document.body`。如果宿主不接管，hidden tab 的弹窗会盖到当前 tab，或者下拉框因为坐标系变了而漂移。

子应用仍然认为自己在 append 到 `document.body`，但宿主会按规则把节点路由到当前 tab 的内容层或弹层层。
```typescript
function appendToRuntimeBody(node) {
  if (isAppShell(node)) {
    scopedRoot.appendChild(node);
    return;
  }

  if (isContentOverlay(node)) {
    contentOverlayRoot.appendChild(node);
    return;
  }

  if (isFloatingOverlay(node)) {
    floatingOverlayRoot.appendChild(node);
    return;
  }

  scopedRoot.appendChild(node);
}

```

分类规则里最容易出 bug 的是 floating overlay 和 content overlay：

- Select、Dropdown、Tooltip 这类 floating overlay 需要跟触发器定位；
- Modal、Drawer、Toast、Notification 这类 content overlay 需要限制在 tab 内容区域；
- 大面积 overlay 的几何启发式只应用于 `position: fixed`，避免 absolute 下拉层因为坐标系变化而漂移。

### Foreground Leasing

tab 激活期间，前台任务应该优先于 hidden prewarm、lifecycle prime、polling 和其它后台任务。这里用一个短暂的 foreground lease 表达“当前 tab 正在稳定中”。

```javascript
// 用户聚焦 tab 时触发。
beginWorkspaceForegroundTabTask({
  tabId: targetTabId,
  reason: 'tab_activation',
});

function beginWorkspaceForegroundTabTask({ tabId, reason }) {
  foregroundLease = {
    tabId,
    reason,
    expiresAt: Date.now() + WORKSPACE_FOREGROUND_TASK_LEASE_MS,
  };
}

// prewarm / lifecycle prime 等后台任务执行前先检查：
if (shouldDeferWorkspaceBackgroundTask({ tabId: candidate.id })) {
  scheduleNext(1000);
  return;
}

function shouldDeferWorkspaceBackgroundTask({ tabId }) {
  const lease = activeForegroundLease();
  if (!lease) return false;
  if (lease.tabId === null) return true;
  return tabId !== lease.tabId;
}
```

### 难点

这层难点是 **用户看不到的 runtime 仍然会产生用户看得见的副作用**。如果不在 Seto 的 sandbox window 和 document API 边界加 owner，hidden tab 就不是“隐藏”，而是“后台仍然能改当前页面”。

## 第六层：Rendered Runtimes

### 问题场景

用户看到的是一个当前 tab，但异常会很明显：切到 B 后 A 的 iframe 还挡着，点击落到 A，URL 写到 A，或者指标说切换完成但页面不能操作。背后原因才是宿主同时管理 native Workstream、Seto iframe、MF subapp 三种 runtime，它们的生命周期和 location 来源都不一样。

如果只是把这些 runtime 当普通 React component 渲染，就会出现这些具体问题：

| 用户能看到的问题 | 背后原因 |
| --- | --- |
| 从 tab A 切到 tab B 后，A 的 DOM / iframe 还挡在页面上，或者还能接收点击 | hot runtime 只是被保活，不等于已经从交互层移除 |
| B 已经显示，但一次点击、弹层或 URL 写入仍然作用到 A | 视觉 focused tab 和 runtime owner 没有同步 |
| 后台 tab 因当前 URL 变化而重新渲染，切回时内容变了 | 所有保活 runtime 都读到同一个 location，没有 per-tab location |
| 同样是切 tab，有的页面状态保留，有的页面被重建 | native route、Seto sandbox、MF iframe 的生命周期不同，没有统一容器收口 |
| 指标显示“切换完成”，但页面已经 visible 后仍然点不动 | 有的 runtime 只是 mounted，不代表 focused frame 已经可交互 |

所以这里真正的问题不是“组件类型多”，而是 **用户视觉上的 focused tab，必须和 router location、runtime owner、overlay owner、event owner、metric owner 同步**。只要其中一个慢半拍，用户看到的就会是 B，但后台仍然按 A 在工作。

### 解决方案

我们给每个热运行 tab 一个统一的 frame。这个 frame 不是装饰层，它负责把不同 runtime 收敛成同一套宿主语义：

| 步骤 | 设置什么 | 用在哪里 |
| --- | --- | --- |
| Seto runtime focus | `focusedRuntimeTabId` | scoped history 判断 sandbox history 写入是否允许同步到宿主 URL |
| Overlay focus | `focusedWorkspaceOverlayTabId` | 通过 `data-workspace-overlay-tab-id` 显示或隐藏 tab-owned overlay root |
| Warm runtime | WarmPool entry 和 LRU timestamp | WorkspaceContentHost 渲染或复用对应 HotTabFrame |
| Lifecycle event | 带 `tabId` 的 `TAB_BLURRED` / `TAB_FOCUSED` | subapp、MF component、SDK listener 按 tab id 过滤生命周期事件 |
| Switch metric | `nextTabId` 的 visible timestamp | tab switch 指标区分 shell activation 和真正 frame visible |

```plaintext
function HotTabFrame({ tab, isFocused, location }) {
  return (
    <section
      data-hot-tab-id={tab.id}
      style={{
        visibility: isFocused ? 'visible' : 'hidden',
        pointerEvents: isFocused ? 'auto' : 'none',
      }}
    >
      {/* focused tab 用当前 URL；hidden hot tab 用保存的 location。 */}
      <Routes location={location}>
        <WorkstreamTabRoutes />
      </Routes>
    </section>
  );
}

```

聚焦 tab 时，宿主同步五类 owner：
```typescript
function commitFocusedTab(nextTabId) {
  // 1. Seto runtime 的 URL owner。
  setFocusedSetoRuntimeTab(nextTabId);

  // 2. overlay owner。
  setFocusedWorkspaceOverlayTab(nextTabId);

  // 3. runtime owner。
  warmPool.promote(nextTabId, currentLocation, runtimeKind);

  // 4. lifecycle owner。
  publishTabLifecycleTransition(prevTabId, nextTabId);

  // 5. metric owner。
  notifyTabSwitchFrameVisible(nextTabId);
}

```

这样视觉 owner、Seto runtime owner、overlay owner、event owner、metric owner 是同一个 tab。

### 难点

这层难点是 **用户看见的 focused tab 必须和运行时 owner 一致**。如果视觉上切到了 A，但 Seto scope 还认为 B 是 focused，history、overlay、event 都会错。

## 这套设计的关键取舍

| 取舍 | 为什么不选更简单方案 | 最终选择 |
| --- | --- | --- |
| URL | `/tabs/:id` 实现简单，但链接只对当前用户的 tab 会话有意义，别人拿到后无法恢复业务对象 | 保留业务 URL，宿主内部解析到 tab |
| Cache | 全部 keep-alive 切换快，但资源无上限 | opened tabs 和 hot runtime 分离，热池有 cap |
| Seto | 每次切换 reload 最干净，但状态丢失、切换慢 | 保留 Seto runtime，并在 host 边界加 scope |
| Interface | 让各子应用直接理解 tab 最省宿主代码，但耦合扩散 | 子应用只发 intent，宿主统一决策 |
| Observability | 只看旧 duration 数字简单，但会漏 post-visible 卡顿 | FMP、switch v3、long task、scope drop 分线观测 |

最终，这个系统的价值不是“页面上多了一排 tab”。真正的技术点是：在单页工作台里同时运行多个业务 runtime 时，宿主必须明确谁拥有 URL、谁拥有 DOM、谁拥有 overlay、谁能接收事件、谁能占用前台资源。把这些所有权定义清楚，tab system 才能像浏览器，而不是像一堆互相干扰的隐藏页面。
