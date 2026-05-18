---
title: "Workspace v2 Tab System Performance: First Load, Hot Switch, And Background Pressure"
date: 2026-05-18 16:31:00
tags: [Frontend, Web Performance, Software Engineering, React]
lang: en
i18n_key: Workspace-v2-Tab-System-Performance-First-Load-Hot-Switch-Background-Pressure
---
## Background And Goals

After the tab system was introduced, Workspace no longer had only one foreground page. Users can keep multiple workstreams, subapps, and objects open, while the host may keep more routes, runtimes, iframes, SDKs, and background tasks alive. Performance is therefore no longer one question of "is this page slow?" It is three separate user paths.

| Path | Problem | Metric And Acceptance Standard |
| --- | --- | --- |
| First Load / FMP | When users enter Workspace or a subapp for the first time, they only need the current page, but network and main-thread budget may be spent on future paths, non-current subapps, or low-priority SDKs. | route FMP, critical-resource waterfall, first-screen APIs. A win must show a blocker moving earlier, disappearing, or shrinking, and final FMP must improve. |
| Hot Tab Switch | When users click an already-open tab, the frame may be visible but still not clickable, or visible work may be blocked by long tasks. | tab switch v3, post-visible blocking, long task. Shell-visible alone is not enough. |
| Background Pressure | Hidden tabs, prewarm jobs, SDKs, WebSocket, analytics, and monitoring tasks may steal main-thread time while the user switches tabs. | long task, frame gap, foreground lease, C02 stress gate. Background work must yield to the foreground tab. |

Business goals and technical constraints:

| Goal | Engineering Constraint |
| --- | --- |
| Users can keep multiple workstreams, subapps, and objects open. | First load, hot switch, and background tasks must not become obviously slower because more runtimes exist. |
| Tab switching should feel close to a browser. | We cannot reload every tab to save memory, and we cannot keep every runtime alive to make switching fast. |
| Refresh, sharing, multiple windows, and subapp SDK behavior must remain correct. | Performance work must not break tab state recovery, business URLs, cross-window sync, or subapp open intent. |
| Performance claims must be credible. | preview FMP, strict tab switch, and local stress gates must be measured separately. |

Optimization principle:
> First identify the user path. Then decide whether a resource should start earlier, move later, stay warm, or be cancelled. Every accepted win must show the blocker moving, disappearing, shrinking, or moving after the visible path.

![performance map](/img/workspace-v2-tab-system-performance/performance-map.png)

*Figure P1: Performance optimization map. The map separates first-screen critical path, hot tab switch, and background pressure, and also lists false wins that were rejected.*

## Results

| Area | Problem | Before | After | Delta | Evidence |
| --- | --- | --- | --- | --- | --- |
| Scheduling | Route chunks were discovered too late and overlapped the final FMP window. | route FMP `14773ms` | `11926ms` | `-2847ms / -19.3%` | strict preview waterfall; route chunks changed from late discovery to route-aware preload |
| Official Forecast | Route-critical CSS was discovered near the end of the path. | route FMP `14271ms` | `11612ms` | `-2659ms / -18.6%` | strict preview waterfall; CSS moved from around 13.8s to around 1.9s |
| Workspace FMP cleanup | Host uploader started before FMP on every measured main route. | pre-FMP count `7/7 routes` | `0/7 routes` | main run improved on 6/7 paths, average about `-1037ms` | strict FMP loop; cleanup pattern evidence |
| Seto entry fanout | Non-current Seto entry competed with the current route. | affected routes `5` | `0` | average about `-366ms` vs previous accepted run | strict FMP loop; non-current Seto entry moved after FMP |
| Cold tab switch | The target runtime and view were loaded only after click. | p95 duration `1829.8ms` | `812.3ms` | `-55.6%` | strict tab-switch probe; idle prewarm |
| Cold tab switch | Frame was visible, but users were still blocked. | p95 post-visible blocking `1193.7ms` | `8.7ms` | `-99.3%` | strict tab-switch probe; blocking moved from after click to before click |
| Spike control | Hidden prewarm and background SDK work stole foreground CPU. | A1 p95 duration `1700.1ms` | `703.1ms` | `-58.6%` | strict tab-switch probe; hidden prewarm paused during switch |
| Background pressure | Background SDKs could become future tab-switch jank sources. | max long task present risk | max post-visible long task = 0 | guardrail, not preview-environment main win | local C02 stress gate; Notification/WebSocket/Tea/Slardar moved into scheduler |

Two guardrails:

1. Strict preview FMP, strict tab switch, and local C02 gate are not combined into one total number.
1. Moving resources is not a win by itself. We only keep a change when the user metric improves and the diagram explains why.

## Measurement Contract

Strict FMP comparisons used the same setup:

- authenticated preview environment;
- target preview-lane headers;
- browser cache disabled;
- CPU 4x throttle;
- 4G network throttle;
- same route set and same final FMP marker semantics;
- failed experiments kept in the record and excluded from wins.

Tab switch uses v3 metrics instead of only "how long after click until the frame appears."

| v3 Field | Meaning |
| --- | --- |
| `inputDelayMs` | From user input to React handler start; captures main-thread queueing. |
| `shellVisibleMs` | From handler start to focused hot frame visible. |
| `interactiveReadyMs` | Target tab can respond to interaction. |
| `postVisibleBlockingMs` | Time after frame is visible while the user is still blocked. |
| `postVisibleJankMs` | Frame gap / long task after visibility. |
| `settledReadyMs` | Time to a 500ms quiet window; compatible with old duration but with clearer semantics. |

The most important measurement repair was separating visible from interactive. Old metrics could report tens of milliseconds while strict probe still found hundreds or thousands of milliseconds of post-visible long task. After this repair, only changes that reduce post-visible blocking or final FMP are accepted.

## Measurement & Gates: Harness And E2E Coverage

These wins did not come from one manual run. We split validation into three harnesses, each answering one question.

| Harness | How It Runs | What It Captures | What It Accepts Or Rejects |
| --- | --- | --- | --- |
| Strict preview FMP profiler | Authenticated CDP Chrome; target preview route; target preview-lane headers; cache disabled; CPU 4x; 4G; every run starts from clean root-tab; 30s capture | route FMP, subapp load-start, critical-resource waterfall, pre-FMP resource count | A route win must improve previous/current delta for the same marker and have a waterfall explanation. Cleaner resource counts with worse FMP are rejected. |
| Strict tab-switch probe | CDP drives real tab activation; samples cover Workstream native, Workstream Seto/Supervisor, and other opened tabs; v3 starts from real input timestamp and waits for visible stable frame / quiet window | `inputDelayMs`, `shellVisibleMs`, `interactiveReadyMs`, `postVisibleBlockingMs`, `postVisibleJankMs`, frame gap, long task | Frame visible alone is not accepted. p95/max, post-visible blocking, and worst samples must improve across repeated strict profiles. |
| Local stress gate | Workspace tab-switch stress spec; mocked backend + real browser; 20 opened tabs, 5 hot workstream caches, overlay containment, background SDK/prewarm tasks | hot switch summary, post-visible blocking, long task, warm-pool count, cache miss, overlay hit-test | Regression gate, not preview-environment main win. It requires no new post-visible long task, bounded warm pool, and no hidden tab / overlay stealing foreground interaction. |

E2E cases protect correctness while performance changes move work around. Mock-off integration connects through preview-lane routing to the real backend instead of mistaking mock data for preview evidence.

| Case | What It Verifies | Regression It Prevents |
| --- | --- | --- |
| Cold/hot switch | Starts from a workstream and records readiness, post-visible blocking, and long task | Idle prewarm or warm-pool changes cannot push loading to after the page becomes visible. |
| Stress switch | 20-tab / 5-hot-workstream stress switching plus overlay containment | Hot switch cannot rely on unlimited keep-alive; background tabs, cache eviction, and overlays cannot affect foreground. |
| Preview routing | Mock-off works; preview routing reaches the workspace backend | If environment is wrong, FMP / tab-switch numbers do not enter the conclusion. |
| Tab backend contract | `tab/list/add/remove/pin/unpin/reorder` and invalid payloads | React Query / optimistic mutation optimizations cannot create dirty tab lists, duplicate tabs, or wrong order. |
| Refresh recovery | Refresh recovers the business URL and per-tab session state shape is valid | Per-tab URL persistence and cache changes cannot break refresh, sharing, or recovery. |
| `T-BCH-C01, C03` | Window B syncs through BroadcastChannel after Window A adds or removes a tab | Multi-window cannot rely only on local React state. |
| Subapp open intents | Subapp open requests, legacy navigation, dedupe, invalid payload, origin reject, and bus-v2 behavior | SDK bridge latency, merge, or refactor cannot lose, duplicate, or escalate subapp intent. |
| `T-LFC-C01` | Focus switch emits `TAB_BLURRED` before `TAB_FOCUSED` | Background tabs must actually enter background; otherwise polling, WebSocket, and prewarm continue stealing CPU. |

## What Changed: Optimization Map

This table is not a commit list. It is an index for the rest of the article. Each row follows the same chain: problem, blocker/cause, solution, evidence, and guardrail.

| Category | Problem | Blocker / Cause | Solution | Evidence / Impact | Guardrail |
| --- | --- | --- | --- | --- | --- |
| Measurement contract | Old tab switch duration looked fast while users could still see an unclickable page. FMP experiments could also treat lower resource count as a false win. | Shell visible and interactive were mixed; local gate, preview FMP, and strict switch had different meanings. | FMP uses final first-screen marker; tab switch v3 measures input, visible, interactive, and post-visible blocking; C02 is only a regression gate. | Later wins can point to blocker movement or reduced post-visible blocking. | Measurement repair itself is not counted as a performance win. |
| Critical-path reduction | Current page was not visible yet, but network and CPU were serving future paths. | Workstream list, host uploader, AIS, and non-current Seto entry fanout entered pre-FMP. | Keep only current-route first-screen work before FMP; schedule low-priority SDK and non-current runtime work after first-screen ready. | `/workspace/api/workstream/list` moved out of pre-FMP on 6/7 root-subapp paths; host uploader `7/7 -> 0/7`; Seto fanout affected routes `5 -> 0`. | Only defer work that is not part of current first screen; if FMP gets worse, revert. |
| Route-critical early start | Real first-screen route resources were discovered too late. | Scheduling chunks appeared at `6785ms-15464ms`; Official Forecast CSS appeared at `13789ms-14988ms`. | Route-aware early discovery for Scheduling chunks and Official Forecast CSS. | Scheduling FMP `14773ms -> 11926ms`; Official Forecast FMP `14271ms -> 11612ms`. | Preload only resources proven to block first screen. |
| Runtime cache | Users want a tab to be immediately usable after switching back, but not every runtime can stay alive. | Cold switch loaded runtime, restored view, and waited for iframe/subapp ready after click. | Split opened tabs, hot runtime, and view cache; WarmPool keeps recent working set; IdlePrewarm prepares likely targets after first screen. | cold switch p95 `1829.8ms -> 812.3ms`; post-visible blocking `1193.7ms -> 8.7ms`. | Hot is not opened. Seto sandbox is heavier and prewarms more conservatively. |
| Main-thread scheduling | Hidden prewarm or SDK init stole foreground main thread during switch. | An async import may be safe at check time, but foreground state can change before the bundle finishes loading. | Foreground-aware scheduler; re-check before import, after import, before init, before render/open. | A1 p95 `1700.1ms -> 703.1ms`; C02 gate max post-visible long task = 0. | Notification/WebSocket/Tea/Slardar are guardrails, not preview FMP wins. |
| Reject false wins | Cleaner waterfall or faster shell-visible does not mean users are faster. | Resource counts, shell visible, and local memo experiments can produce attractive but wrong numbers. | Treat resource movement as a hypothesis; reject if strict profile gets worse. | Swimlane chunk average FMP `+1217ms` reverted; all-hot strict p95 reached `1792.0ms` with `517ms` post-visible long task. | User metric first, causality second; resource shape is only an explanation. |

## Category 1: First Load / FMP

### 1. Remove Work That Does Not Belong To The Current First Screen

Problem: while the user waits for the current route's first screen, network and main-thread time can be spent on future paths or low-priority SDKs. The solution is not a fixed sleep. It is route-specific first-screen readiness: only work that is not part of the current first screen can move after FMP.

![critical path cleanup](/img/workspace-v2-tab-system-performance/critical-path-cleanup.png)

*Figure P2: Critical-path cleanup waterfall. This is a strict FMP-loop pattern chart. It explains how host uploader moved from 7/7 pre-FMP routes to 0/7, and non-current Seto entry fanout moved from 5 affected routes to 0. The example route is illustrative; exact route deltas are covered by Scheduling and Official Forecast.*

| Change | Pre-FMP Blocker | Movement | Impact Scope |
| --- | --- | --- | --- |
| Remove pre-FMP `/workspace/api/workstream/list` refresh | Root-subapp first screen did not need Workstream list, but it entered the waterfall. | 6/7 root-subapp paths no longer had it pre-FMP. | Main run improved on 4/7 paths, average about `-1051ms`. |
| Defer AIS / uploader | host-owned `lib-uploader` appeared pre-FMP on 7/7 paths. | `7/7 -> 0/7` | 6/7 main paths improved, average about `-1037ms`. |
| Defer non-current Seto entry fanout | app `10218` manifest and `static/js/entry.*` competed with the current route. | affected routes `5 -> 0` | average about `-366ms` vs previous accepted run. |

Implementation sketch:
```typescript
// Mounted after route first-screen ready.
// Only schedule work that does not belong to the current first screen.
afterFirstScreenReady(() => {
  scheduleLowPrioritySdkInit();
  scheduleUploaderInit();
  scheduleNonCurrentSetoPreload();
});

```

The key is that we defer non-current work, not all work.

### 2. Scheduling: Route Chunks Moved From Late Discovery To Early Discovery

Problem: Scheduling route chunks were discovered at `6785ms-15464ms`, overlapping the final FMP window. The root cause was not simply slow network; the browser learned too late that these chunks were required for the current first screen.

Scheduling FMP moved from `14773ms` to `11926ms`, a `-2847ms / -19.3%` improvement.

![scheduling route chunks](/img/workspace-v2-tab-system-performance/scheduling-route-chunks.png)

*Figure P3: Scheduling route chunks waterfall. Before, route chunks were discovered at `6785ms-15464ms` and covered the FMP window. After, matching chunks started as link resources at `1928ms-1961ms`.*

Code strategy:
```typescript
// Mounted after route resolver identifies the Scheduling route.
// Preload only chunks needed by this first screen, not the whole route family.
if (currentRouteMatches('/scheduling/schedule')) {
  preloadRouteChunks([
    'schedule route chunk',
    'schedule view panel chunk',
  ]);

  // This still waits for core data; do not prefetch dependent data too early.
  prefetchScheduleViewPanelAfterCoreData();
}

```

Why it works:

- route chunks and first-screen data do not have to be fully serial;
- early route chunk discovery lets code loading run in parallel with shell/data;
- the remaining FMP window is Seto runtime, data, and render, not late code discovery.

### 3. Official Forecast: Route-Critical CSS Cannot Wait Until The End

Problem: Official Forecast CSS appeared at `13789ms-14988ms`, so the final marker waited for late stylesheet discovery. The solution is not "preload everything"; it is only to start the stylesheet that stabilizes the first screen.

Official Forecast FMP moved from `14271ms` to `11612ms`, a `-2659ms / -18.6%` improvement.

![official forecast css](/img/workspace-v2-tab-system-performance/official-forecast-css.png)

*Figure P4: Official Forecast CSS waterfall. Before, CSS appeared at `13789ms-14988ms`. After, CSS started at `1872ms-2632ms` and ran in parallel with route code/data.*

Code strategy:
```typescript
// Only when Official Forecast route matches.
// This CSS affects first-screen stability, so it is route-critical.
if (currentRouteMatches('/scheduling/official_forecast')) {
  preloadStylesheet('official forecast critical css');
}

```

Why it works:

- this is not generic "add more preload";
- the CSS directly affects final first-screen stability;
- moving it away from the final wait window removes a late FMP blocker.

### 4. Counterexample: Swimlane Chunk Was Not A Win

One experiment moved the Swimlane chunk out of pre-FMP. The waterfall looked cleaner: pre-FMP count `7/7 -> 0/7`. Strict runs showed average FMP got worse by `+1217ms`, and load-start also regressed, so the change was reverted.

This counterexample matters because performance optimization is not waterfall beautification. Fewer resources with slower users is a failure.

## Category 2: Hot Tab Switch

The hot-switch target is not "the frame appears." It is "the user can operate after seeing the frame." That is why v3 measures post-visible blocking.

![hot tab switch causality](/img/workspace-v2-tab-system-performance/hot-tab-switch-causality.png)

*Figure P5: Hot tab switch causality. Before, the cold runtime loaded after click, and the frame still had `1193.7ms` blocking after becoming visible. After, idle prewarm moved the main preparation work before click, reducing post-visible blocking to `8.7ms`.*

### 1. Idle Prewarm

Problem: cold switch loaded runtime, restored view, and waited for iframe/subapp ready after the user clicked. The frame could appear first, but long tasks still blocked interaction. The solution is to prepare likely return targets during idle windows after first screen.

| Metric | Before | After | Delta |
| --- | --- | --- | --- |
| cold switch p95 duration | `1829.8ms` | `812.3ms` | `-55.6%` |
| visibleToReady p95 | `1693.7ms` | `508.7ms` | `-70.0%` |
| postVisibleBlocking p95 | `1193.7ms` | `8.7ms` | `-99.3%` |
| max post-visible long task | `692ms` | `73ms` | significantly lower |

Implementation sketch:
```typescript
// Mounted after first-screen ready.
// Native runtime is lighter, so it can enter the queue earlier.
// Seto sandbox is heavier and needs a more conservative delay.
afterFirstScreenReady(() => {
  queuePrewarm(nativeTabs, { delay: 1000 });
  queuePrewarm(setoTabs, { delay: 3000, primeLifecycle: true });
});

```

Why it works:

- part of runtime loading, initialization, and lifecycle priming happens before click;
- click no longer puts large subapp loading and long tasks after visibility;
- prewarm only runs after first screen, so it does not steal FMP budget.

### 2. Runtime-Aware Prewarm

The tradeoff is explicit: prewarming every runtime immediately is simple, but Seto sandbox is heavier and can turn a background optimization into foreground pressure. The final policy warms native runtimes earlier and Seto runtimes more carefully.

| Scenario | p95 duration | visibleToReady | postVisibleBlocking |
| --- | --- | --- | --- |
| immediate cold baseline | `1853.8ms` | `1657.7ms` | `1157.7ms` |
| runtime-aware early switch | `1285.3ms` | `1029.8ms` | `529.8ms` |
| delta | `-30.7%` | `-37.9%` | `-54.2%` |

Warm pool and idle prewarm must consider runtime type, foreground pressure, and whether a switch is settling. "Preload earlier" is not automatically good.

### 3. Pause Hidden Prewarm To Remove Foreground Spikes

Problem: while the user switched to Supervisor, hidden/background Audit Workbench, xlsx, Slardar, and related work competed on the main thread. The solution is a foreground lease: while the foreground tab is switching or not settled, background tasks must yield.
```typescript
// Every hidden prewarm and background SDK task checks before running.
// Async import must re-check after loading because foreground state can change.
function shouldRunBackgroundTask(tabId) {
  if (foregroundTabHasLease() && tabId !== focusedTabId) return false;
  if (tabSwitchIsSettling()) return false;
  return true;
}

```

Impact:

| Metric | Spike Before | After | Delta |
| --- | --- | --- | --- |
| p95 duration | `1700.1ms` | `703.1ms` | `-58.6%` |
| shell visible | `1199ms` | `194ms` | `-83.8%` |
| interactive | `1250ms` | `194ms` | `-84.5%` |

This proves the scheduling rule: prewarm that steals from the current tab is a negative optimization.

## Category 3: Background Pressure

Problem: hidden tabs can still be alive, and SDKs such as Notification, WebSocket, Tea, Slardar, visit, storage health, and AIS can create future tab-switch long tasks if they run like a normal single-page app. The solution is a foreground-aware scheduler.
```typescript
// Background work cannot run directly. It goes through one arbiter.
function scheduleWorkspaceBackgroundTask(task, options) {
  requestIdleCallback(() => {
    if (shouldDeferWorkspaceBackgroundTask(options.tabId)) {
      retryLater();
      return;
    }

    task();
  });
}

```

Async tasks must re-check around import / loader:
```typescript
async function safeLoadSdk() {
  if (shouldDefer()) return retryLater();

  const sdk = await importSdk();

  // Import can take hundreds of milliseconds.
  // By the time it returns, the foreground tab may be switching.
  if (shouldDefer()) return retryLater();

  sdk.init();
}

```

| Background Task | Change | Evidence Scope |
| --- | --- | --- |
| MF preload | Re-check foreground state before and after `getEntries`. | Local C02: p95 visual about `31.2ms`, postVisibleBlocking about `7.8ms`, max long task = 0. |
| Notification SDK | `lib-kefu-notify` about `657.2KB gzip`; re-check before/after import/open/render. | Local C02: postVisibleBlocking about `7.1ms`, max long task = 0. |
| WebSocket | Import, init, and register enter scheduler. | Local C02: visual `42.1ms -> 36.6ms`, about `-13.1%`. |
| Tea | Flush queue in slices and yield to foreground. | Local C02: visual `31.5ms -> 29.5ms`, about `-6.3%`. |
| Slardar / visit / storage health / AIS | after first screen, idle, foreground-aware. | Guardrail; not claimed as preview-environment main win. |

These changes prevent future SDK work from becoming a tab-switch jank source. They are the stability base, not inflated FMP wins.

## Rejected Optimizations

| Experiment | Why It Looked Reasonable | Why It Was Rejected |
| --- | --- | --- |
| Move Swimlane chunk out of pre-FMP | Cleaner waterfall and lower pre-FMP count | Average FMP regressed by `+1217ms`; user metric got worse; reverted. |
| Full optimistic focus / all-hot activation | Frame could theoretically become visible faster | strict p95 reached `1792.0ms` and produced `517ms` post-visible long task; reverted. |
| Broad Seto prewarm / hidden layout-visible | Hoped to finish sandbox work earlier | Easy to steal foreground CPU; unstable benefit; not used as the main policy. |
| Small component memo / local cache experiments | Looked like they would reduce render | Local p95 got worse or strict benefit was missing; not kept. |
| Old tab switch duration only | Could produce numbers in tens of milliseconds | Missed input queue and post-visible blocking; metric itself was not trustworthy. |

## Engineering Review Lens

1. **Split by path first.** FMP, tab switch, and background pressure are different problems and need different measurements.
1. **Assign resource ownership.** Current first-screen resources move earlier; non-current first-screen work moves later; future resources can only run through idle prewarm.
1. **Draw causality before writing the conclusion.** The chart must show the blocker moving, disappearing, shrinking, or moving after FMP.
1. **Accept failures.** If a resource moves but FMP gets worse, revert it.
1. **Keep local gates and preview wins separate.** C02 is a regression gate, not an online/preview win.

The tab system performance gains do not come from one trick. They come from three mechanisms working together:

- the first-screen critical path keeps only current-route required work;
- hot switching uses bounded runtime cache plus idle prewarm;
- background work yields to the foreground scheduler.

This mechanism matters more than any single optimization. Workspace will keep adding more subapps, SDKs, and runtimes. Without path classification and resource arbitration, more tabs would make the system progressively less predictable.
