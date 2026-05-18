---
title: "Workspace v2 Tab System: Building Browser-Grade Tabs Inside a Workbench"
date: 2026-05-18 16:30:00
tags: [Frontend, React, Software Engineering]
lang: en
i18n_key: Workspace-v2-Tab-System-Browser-Grade-Tabs
---
## Background And Goals

Workspace v2 changes the workbench from a single-page, single-context product into a workspace that can hold multiple workstreams, sub-application views, and ticket objects at the same time. From the user's perspective, the expected experience is close to a browser: several tasks stay open, switching back keeps state, refresh and shared links still land on the right business page, and a modal opened by one sub-application cannot cover another tab.

![workspace tab system demo](/img/workspace-v2-tab-system/workspace-tab-system-demo.svg)

*Figure 0: A generic workbench using browser-like tabs. Users keep several work items open, switch back without reload, and only the focused tab owns URL, overlays, events, and foreground CPU.*

Business goals:

| Goal | User Experience |
| --- | --- |
| Multi-tasking | Users can keep multiple workstreams, subapps, and tickets open without repeatedly returning to the home page. |
| Context retention | Filters, scroll position, iframe state, and inner Workstream views should survive common tab switches. |
| Reliable links | Refresh, copied links, and external deep links should recover to a reasonable tab and business page. |
| Subapp integration without tab internals | Sub-applications express intent such as "open this page"; they do not need to understand the host tab implementation. |
| Browser-like responsiveness | Switching should be fast, and background tabs should not steal foreground CPU. |

Technical goals:

| User Expectation | Engineering Requirement | Failure If Missing |
| --- | --- | --- |
| Multiple workstreams can stay open | Persist opened tabs, order, and pinned state | Refresh loses tabs, or different browser windows show different tab lists. |
| Switching back keeps state | Keep a bounded number of DOM / iframe runtimes warm | Every switch reloads the page; filters, scroll, and iframe state are lost. |
| URLs remain refreshable and shareable | Recover the target tab from the browser URL; write the business URL when a tab is activated | Copied links open as orphan pages, or the address bar points to the wrong tab. |
| Multiple windows work together | Synchronize tab-list mutations across windows | One window closes a tab while another still shows stale state. |
| Subapps can open pages | SDKs and event buses express intent; the host decides how to open | Tab behavior becomes scattered across subapps and bypasses capacity/reuse rules. |
| Hidden tabs do not affect the current tab | Scope history, DOM, overlays, events, and focus by tab | A hidden iframe changes the current URL, shows an overlay on another tab, or starts background work. |
| Switching feels responsive | Measure and schedule first load, hot switch, and background work separately | The page is visible but not clickable, while old metrics report a short duration. |

![architecture goals](/img/workspace-v2-tab-system/architecture-goals.png)

*Figure A1: Product goals mapped to engineering constraints. The diagram breaks "browser-grade tabs" into concrete system requirements and failure modes.*

The final design principle is:
> Keep the address bar as a real business URL; use server state to record which tabs are open; keep only a bounded working set warm; and put host-owned boundaries around subapp history, DOM, overlays, and events.

The system has two core questions:

1. **Should two entries reuse the same tab?** For example, the same workstream should reuse one tab, while its internal view is preserved as URL/subPath state.
1. **Which tab owns runtime side effects now?** Only the focused tab can write the browser URL, show overlays, receive foreground events, and consume foreground CPU.

## Architecture Layers

![architecture layers](/img/workspace-v2-tab-system/architecture-layers.png)

*Figure A2: Final layered architecture. Isolation and Observability are intentionally separate: Isolation prevents hidden runtimes from changing the current tab; Observability proves where latency, blocked writes, or regressions happen.*

| Layer | Problem | Core Mechanism |
| --- | --- | --- |
| Intent Interface | The same business object should not duplicate tabs or behave differently when opened from a menu, subapp button, SDK, iframe, or URL. | Normalize every entry into an open intent; the host decides new browser tab, absorb current tab, focus existing tab, or create a new tab. |
| URL And Tab Ownership | Refresh or shared links should recover to the same business page, not an internal orphan tab route. | Keep the address bar as a business URL; parse it into a tab input and match it against opened tabs. |
| Persistent Tab State | Refresh should not lose tabs; two browser windows should not split into different tab lists. | BFF stores opened tabs; React Query gives instant local UI; BroadcastChannel invalidates other windows after mutation. |
| Runtime Cache | Recent tabs should switch back quickly, but many opened tabs must not create unbounded memory or CPU pressure. | Separate opened tabs, hot runtime pool, and Workstream view cache. Evicting a runtime does not delete the tab. |
| Isolation Boundary | After switching to tab B, tab A must not change the URL, show overlays on B, receive foreground events, or start foreground work. | Scope history, `window.parent`, document/body, overlays, and focus events by current owner. |
| Rendered Runtimes | Users should see and interact with only the current tab. Clicks, overlays, and URL writes must belong to that tab. | Put every hot runtime into a stable frame; only the focused owner is visible, clickable, and allowed to receive foreground events. |
| Observability | When first load is slow, switching is janky, an overlay crosses tabs, or the URL is wrong, we need to know which layer failed. | FMP for first load, tab switch v3 for switching, long task/frame gap for visible jank, scope-drop logs for blocked writes, stress gates for regressions. |

## Layer 1: Intent Interface

### Problem

Users can open the same business object from many entry points: sidebar, tab row, a subapp button, MF event bus, iframe `postMessage`, or a copied business URL. The expected result is consistent: an already-open object is focused, a new object opens once, and a view inside the same subapp can often navigate within the current tab.

If each entry makes its own decision, users see direct failures: a menu click reuses a tab but a subapp button creates a duplicate; a shared link restores the page but SDK navigation loses the last inner view; one entry respects tab capacity while another bypasses it.

### Solution

Subapps only express intent. The host decides how to execute it.

| Source | Input | Host Decision |
| --- | --- | --- |
| User tab click | tab row id | Restore saved tab URL, activate runtime, write browser URL. |
| React subapp SDK | `openWorkstreamTab`, `openSubappViewTab`, `openSubApp` | Normalize payload, find existing tab, create if needed. |
| MF event bus | `TAB_OPEN_REQUEST`, `NAVIGATE_TO_URL` | Focus existing tab, absorb into current tab, create a tab, or open a new browser window. |
| Seto iframe | `window.postMessage` envelope | Validate origin and payload, then convert to a host event bus request. |

Simplified pseudocode:
```typescript
// A subapp sends intent. It does not mutate host state.
function openSubappView(viewType, viewId) {
  emit('TAB_OPEN_REQUEST', { itemType: 'SUBAPP_VIEW', viewType, viewId });
}

function handleTabOpenRequest(raw) {
  const input = normalizeAndValidate(raw);

  if (raw.openInNewBrowserTab) {
    window.open(buildBusinessUrl(input));
    return;
  }

  // existing: the target business object already owns a tab.
  const existing = findExistingTab(tabs, input);

  // absorbing: the currently focused tab is a suitable carrier for this navigation.
  const absorbing = findFocusedTabThatCanAbsorb(input);

  // If a subapp root can absorb but an exact tab already exists, prefer the exact tab.
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

`existing` and `absorb` are not the same feature. `existing` means "the target already has a stable tab"; `absorb` means "the current tab does not yet need a new runtime and can carry this navigation." Without `absorb`, a placeholder or subapp root would leave useless tabs behind. Without `existing`, a real duplicate tab would be created.

### Difficulty

The difficult part is not sending an event. It is making every entry point converge to the same find / absorb / add / focus / capacity-control path. Otherwise the user sees duplicate tabs, wrong focus, capacity bypass, and inconsistent return paths.

## Layer 2: URL And Tab Ownership

### Problem

The browser has one address bar, while the workspace can keep multiple tab runtimes alive. We cannot replace business URLs with internal routes such as `/tabs/:id`.

| URL Shape | What Happens When Users Share It |
| --- | --- |
| `/tabs/abc123` | It only means "my local tab list has id=abc123." Another user or another window does not know which workstream, ticket, or view it represents. |
| `/workspace/workstream/123/schedule/456` | The URL contains the business object. Refresh, bookmarks, IM sharing, and external deep links can recover the same business page. |

So the address bar stays as a real business URL:

- `/workspace/workstream/:id/...`
- `/workspace/scheduling/schedule/view/:viewId`
- `/workspace/audit_workbench/ticket/custom_view/:viewId`

Internally, the host extracts business fields from the URL and uses them to decide whether two entries should reuse the same tab.

| Tab Type | Fields Used For Identity | Meaning |
| --- | --- | --- |
| Workstream | `workstreamId` | Inner views are stored as path/subPath under one Workstream tab. |
| SubApp root | `subAppType` | The subapp root is a stable tab. |
| SubApp view | `viewType + viewId` | A concrete business view can become its own tab or be absorbed into the current subapp tab. |
| Ticket | `ticketId + viewType` | Ticket objects are suitable independent tabs. |
| Non-tab route | None | Home, notification, redirect, and unknown routes do not enter tab lifecycle. |

![url tab sync](/img/workspace-v2-tab-system/url-tab-sync.png)

*Figure A3: URL and tab synchronization. The address bar remains a business URL; the host maps it to an internal tab owner.*

### Browser URL -> Tab

This path handles refresh, copied links, and external deep links.
```typescript
function onRouteChanged(location) {
  // Parse the business URL into "does this route belong to a tab?"
  const resolved = resolveTabFromUrl(location.pathname, appList);

  if (resolved.kind !== 'tab') {
    // Home, redirect, or fallback pages render normally.
    // They do not create tab rows or hot runtime entries.
    renderSingleOutlet();
    return;
  }

  const matched = findOpenedTab(tabs, resolved.input);
  if (matched) {
    focusRuntime(matched.id);
    return;
  }

  // Direct URL recovery:
  // The user opened a valid business URL, but BFF has no opened tab yet.
  addTab(toAddWorkspaceTabRequest(resolved.input));
  focusRuntimeWhenReady(resolved.input);
}

```

### Tab -> Browser URL

This path handles tab clicks.
```typescript
function activateTab(tab) {
  // Restore the tab's last business URL, not an internal /tabs/:id URL.
  const path = loadSavedTabUrl(tab.id) ?? buildDefaultBusinessUrl(tab);

  startTabSwitchMetric({ toId: tab.id, targetPath: path });

  // The next history write belongs to this target tab.
  prepareScopedNavigation({ targetTabId: tab.id, url: path });

  navigate(path, {
    state: { workspaceTargetTabId: tab.id },
    flushSync: true,
  });
}

```

### Window -> Window

Tab list mutations are persistent facts, not local React state.
```typescript
async function mutateTabs(mutation) {
  // Current window updates optimistically for fast feedback.
  queryClient.setQueryData(tabListKey, applyOptimistic(mutation));

  await bff.mutateTabs(mutation);

  // Other windows do not receive the full state through BroadcastChannel.
  // They only get invalidation and refetch from BFF.
  broadcastChannel.postMessage({ type: 'TAB_LIST_INVALIDATED' });
}

```

### Difficulty

URL is both a user contract and a runtime locator. Users must see shareable business URLs, while the host must know which tab owns a URL change. The resolver and activation state satisfy both constraints.

## Layer 3: Persistent Tab State

### Problem

Users see three concrete failures if tab state is only local: refresh loses the tab row, add/remove/pin feels delayed if every mutation waits for the server, and two browser windows drift apart after one window mutates the tab list.

### Solution

Persistent state is handled by BFF plus React Query.

![persistent tab state](/img/workspace-v2-tab-system/persistent-tab-state.png)

*Figure A3.5: Persistent tab state. React Query makes the current window fast; BFF stores the final fact; BroadcastChannel tells other windows to invalidate and refetch.*

| Module | Responsibility |
| --- | --- |
| BFF tab controller | `list/add/remove/pin/unpin/reorder`, plus merging opened tabs and pinned tabs. |
| React Query | Single tab-list cache key, stale-time policy, focus refetch. |
| Optimistic mutation | Insert a temporary tab before server response; replace it when BFF returns the final tab. |
| BroadcastChannel | After mutation succeeds, tell other windows to invalidate and refetch. |

Simplified flow:
```typescript
function useAddTab() {
  return useMutation({
    mutationFn: bff.addTab,

    onMutate(input) {
      // Current window becomes fast immediately.
      addOptimisticTab(input);
    },

    onSuccess(serverTab) {
      // Server id and order are the final facts.
      replaceOptimisticTab(serverTab);
      broadcast('TAB_LIST_INVALIDATED');
    },
  });
}

```

### Difficulty

Optimistic UI can reduce interaction latency, but it cannot replace the server fact. Final tab id, pin state, order, and cross-window consistency must return to the BFF tab list.

## Layer 4: Runtime Cache

### Problem

Users expect recently used tabs to switch back quickly, with scroll, form, and iframe state intact. But if every opened tab keeps a live runtime, the current tab slows down and memory grows without a bound.

The key is to separate three concepts that look similar in UI but have different lifecycles.

![runtime cache layers](/img/workspace-v2-tab-system/runtime-cache-layers.jpg)

*Figure A4: Three cache layers. Opened tabs are durable user intent; hot runtime pool is bounded live resource; scoped view cache keeps inner Workstream views. Idle prewarm prepares likely future switches after first screen; it is not unlimited background loading.*

| Layer | Question It Answers | Lifecycle |
| --- | --- | --- |
| Opened tabs | Which tabs should appear in the tab row? | Persisted by BFF. Evicting runtime does not delete the tab. |
| Hot runtime pool | Which runtimes are alive now? | Bounded LRU/working set. Hidden runtimes are warm but not foreground. |
| Scoped view cache | Can an inner Workstream view return quickly? | Cached by Workstream `scopeKey`; capped inner views. |

Hot-pool update:
```typescript
function onTabActivated(tabId) {
  warmPool.touch(tabId);

  for (const evicted of warmPool.evictOverflow()) {
    // Evicting runtime only frees DOM / iframe / JS resources.
    // It does not delete the opened tab from BFF.
    disposeRuntime(evicted.tabId);
  }
}

```

Idle prewarm:
```typescript
afterFirstScreenReady(() => {
  requestIdleCallback(() => {
    for (const candidate of predictLikelyNextTabs()) {
      if (foregroundTabIsSettling()) break;
      prewarmRuntime(candidate);
    }
  });
});

```

### Difficulty

Keeping everything alive is simple but turns background runtimes into unbounded resource consumers. Keeping nothing alive is safe but destroys the browser-like switch experience. The design preserves user intent in opened tabs while putting a hard cap on live runtimes.

## Layer 5: Isolation Boundary

### Problem

After the user switches to tab B, a subapp inside tab A can still be alive in the background. If we only hide the DOM, users can still see these failures:

| Problem | Cause |
| --- | --- |
| The current address bar suddenly changes to another tab's URL. | A hidden iframe can still call `history.pushState` / `replaceState`. |
| Browser back wakes up a route inside a non-current tab. | Multiple iframes can observe the same `popstate` / `hashchange`. |
| A modal or toast from tab A covers tab B; dropdown positioning drifts. | Component libraries append overlays to the global `document.body`. |
| A background tab thinks it is focused and starts fetching or running heavy work. | Lifecycle events are broadcast globally instead of filtered by tab id. |

![seto isolation](/img/workspace-v2-tab-system/seto-isolation.png)

*Figure A5: Seto integration and tab isolation. Seto loads the HTMLSandbox; the Workspace host adds tab ownership around Seto lifecycle and sandbox window boundaries.*

### Seto Integration: Start From The Failure

We did not start from a list of Seto APIs. We started from the invariant users need, then mapped each failure to the platform capability we had to wrap.

| Problem | Cause / Seto Constraint | Boundary Needed |
| --- | --- | --- |
| After switching to tab B, tab A changes the address bar, shows an overlay on B, or starts foreground work. | Seto loads and runs the subapp, but does not know which Workspace tab should own DOM/history/event side effects. | Add a host tab-ownership context around Seto runtime. |
| Switching back shows another tab's content or scroll state. | Sandbox content mounted to a global container has no per-tab DOM root. | `getContainer()` must return the current `HotTabFrame` root. |
| First entry occasionally writes the wrong URL, or early patching causes sandbox errors. | The raw sandbox window is only stable after ready; patching too late misses first history writes. | Register runtime frame in `onSandboxReady()`. |
| A hidden tab's internal navigation changes the current address bar. | Seto maintains its own `RAW_HISTORY`; patching host history alone is not enough. | Patch `sandbox.raw.win.RAW_HISTORY` and validate target tab. |
| A subapp button navigates the wrong tab or refreshes other tabs. | Default `window.parent` may expose raw host history, document, or event bus. | Return a tab-scoped parent Proxy. |
| A modal/toast from tab A covers tab B; dropdown aligns to the wrong place. | Component libraries append Modal/Dropdown/Toast to global `document.body`. | Route document/body operations to a tab-owned overlay root. |
| Modal is contained, but Dropdown/Tooltip position drifts. | Floating overlays depend on the trigger's coordinate system. | Separate content overlays from floating overlays. |
| A background tab receives `TAB_FOCUSED` and starts refreshing. | Lifecycle events are global by default. | Filter focus/blur by tab id. |

Seto capabilities used:

| Seto Capability | Requirement | Integration |
| --- | --- | --- |
| `HTMLSandbox` | Reuse Seto loading, entry, basename, and lifecycle. | The host wraps tab owner around Seto runtime; it does not rebuild the runtime. |
| `getContainer()` | Mount DOM into the current tab, not the global page. | Return the root inside `HotTabFrame`; re-register DOM scope when root changes. |
| `onSandboxReady(sandbox)` | Access a patchable sandbox window. | Use `sandbox.raw.win` to register runtime frame and patch history/parent/event. |
| `BaseSandbox` | Know which sandbox is calling document/body APIs. | Use WeakMap to associate sandbox with its tab root. |
| `DocExternals` / document plugin context | Scope `document.body`, queries, and append operations. | Restrict queries to scoped root; route body portals to tab overlay root. |
| `sandbox.raw.win.RAW_HISTORY` | Patch the history Seto actually uses. | Validate `pushState` / `replaceState` target before syncing host history. |

Integration order:
```plaintext
function SetoTabRuntime({ tabId, entry, initialUrl }) {
  const root = getCurrentHotTabRoot(tabId);
  let sandboxRef = null;

  return (
    <HTMLSandbox
      entry={entry}
      url={initialUrl}

      // DOM must mount into this tab's frame, not a global container.
      getContainer={() => root}

      onSandboxReady={(sandbox) => {
        sandboxRef = sandbox;

        registerRuntimeFrame({
          tabId,
          window: sandbox.raw.win,
          rawHistory: sandbox.raw.win.RAW_HISTORY,
        });

        installScopedHistory(tabId, sandbox.raw.win);
        installScopedParentProxy(tabId, sandbox.raw.win);
        installScopedEventBridge(tabId, sandbox.raw.win);
      }}
    />
  );
}

```

### History / Window Scope
```typescript
function scopedPushState(state, unused, url) {
  const target = getNavigationTargetFromStateOrPreparedScope(state, url);

  if (target.tabId !== currentRuntime.tabId) {
    recordScopeDrop({
      reason: 'history-write-to-wrong-tab',
      from: currentRuntime.tabId,
      to: target.tabId,
      url,
    });
    return;
  }

  rawHistory.pushState({ ...state, workspaceTargetTabId: target.tabId }, unused, url);
}

```

`window.parent` is also a Proxy, not the raw host window:
```plaintext
parentProxy.get('history')  -> scopedHistory
parentProxy.get('document') -> scopedDocumentFacade
parentProxy.get('__workspaceMFEventBus__') -> scopedEventBus

```

Subapps still use the same interface shape, but every capability they receive is already scoped by tab.

### Event Scope
```typescript
function publishTabLifecycle(type, targetTabId) {
  for (const runtime of runtimeRegistry.all()) {
    if (runtime.tabId !== targetTabId) continue;
    runtime.eventBus.emit(type, { tabId: targetTabId });
  }
}

```

### DOM / Overlay Scope

The user-facing issue is simple: a popup or dropdown looks like UI of the current tab, but many libraries append it to global `document.body`. If the host does not intercept that, hidden tab overlays can cover the current tab or dropdowns can drift because their coordinate system changed.
```typescript
function appendChild(parent, node) {
  const owner = resolveOwnerFromCurrentSandboxCallStack();

  if (parent === rawDocument.body && owner) {
    const overlayRoot = getOverlayRoot(owner.tabId, node);
    overlayRoot.appendChild(node);
    return node;
  }

  return rawAppendChild(parent, node);
}

```

Overlay types are different:

- Select, Dropdown, and Tooltip are floating overlays and need trigger-relative positioning.
- Modal, Drawer, Toast, and Notification are content overlays and should be constrained to the tab content area.
- Large-overlay geometry heuristics should only apply to `position: fixed`, otherwise absolute dropdowns drift.

### Difficulty

A hidden runtime can still produce visible side effects. Without tab owner boundaries around sandbox window and document APIs, "hidden" only means invisible; it does not mean safe.

## Layer 6: Rendered Runtimes

### Problem

The user sees one current tab, but the host may keep native Workstream, Seto iframe, and MF subapp runtimes alive. If these runtimes are treated as ordinary React components, users see direct failures:

| Problem | Cause |
| --- | --- |
| After switching from tab A to B, A's DOM or iframe still blocks the page or receives clicks. | Hot runtime is kept alive but not removed from the interactive layer. |
| B is visible, but a click, overlay, or URL write still applies to A. | Visual focus and runtime owner are not synchronized. |
| A background tab re-renders because the current URL changed. | Every retained runtime reads the same global location instead of per-tab location. |
| Some pages keep state while others remount. | Native routes, Seto sandbox, and MF iframe have different lifecycle models. |
| Metrics say "switch complete", but the visible page cannot be clicked. | Mounted, visible, and interactive are different phases. |

### Solution

Every hot tab gets a stable frame. The frame is not decoration; it normalizes different runtimes into host semantics.

| Frame Responsibility | Why It Matters |
| --- | --- |
| Stable DOM container | Switching away does not unmount hot runtime; switching back can keep DOM/iframe state. |
| Focused / hidden state | Only focused tab is visible and clickable; hidden tabs stay warm but do not participate in current interaction. |
| Per-tab location | The focused tab uses current browser URL; hidden hot tabs use their saved URL. |
| Owner synchronization | Switching updates Seto runtime owner, overlay owner, and event owner together. |
| Unified visible timing | Tab-switch metric reports when the frame is actually visible, not when an arbitrary runtime says ready. |

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
      <Routes location={location}>
        <WorkstreamTabRoutes />
        <SetoHTMLApp />
        <MFSubAppFrame />
      </Routes>
    </section>
  );
}

```

Switching becomes an ownership update:
```typescript
function commitFocusedTab(nextTabId) {
  setVisibleFrame(nextTabId);
  setRuntimeOwner(nextTabId);
  setOverlayOwner(nextTabId);
  publishTabLifecycle('TAB_FOCUSED', nextTabId);
  reportTabSwitchVisible(nextTabId);
}

```

### Difficulty

The focused tab visible to the user must match router location, runtime owner, overlay owner, event owner, and metric owner. If any of them lags behind, the user sees B while the background still behaves like A.

## Key Tradeoffs

| Topic | Simpler Option | Final Decision |
| --- | --- | --- |
| URL | Use `/tabs/:id` internally | Keep business URLs. It is harder internally, but refresh and sharing remain correct. |
| Open intent | Let each subapp call routing/state directly | Use host-owned intent. It centralizes reuse, absorb, capacity, and validation. |
| Cache | Keep every runtime alive | Use bounded hot runtime pool. Recent tabs are fast, but background resource use is capped. |
| Seto | Reload on every switch | Keep Seto runtime warm, then scope host-facing APIs. |
| Isolation | Hide non-current panels | Scope history, parent, document, overlays, and events. Hidden DOM alone is insufficient. |
| Observability | Only look at old duration numbers | Split FMP, tab switch v3, long task, scope drop, and stress gates. |

The design is not a tab bar with a more complex UI. A normal tab bar decides which panel is visible. This system also decides which runtime can write the URL, show overlays, receive events, and consume foreground resources.
