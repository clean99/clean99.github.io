---
title: "运营管理心跳系统设计"
date: 2026-06-19 12:00:00
tags: [Software Engineering, reliability, fault-tolerance]
area: engineering
summary: "从用户动作、长链接入、Redis 时间窗口、HCM 状态提交、下游传播、跨 region 切流和 TT/IES 拆分，一步步推导运营管理心跳系统的设计。"
featured: true
audience: [public, interviewers]
lang: zh
i18n_key: Designing-an-Operations-Heartbeat-System
permalink: zh/2026/06/19/Designing-an-Operations-Heartbeat-System/
---

运营管理系统里有一个很基础的问题：怎么知道一个运营现在是否在线？

最小实现很简单。前端每隔几秒发一个心跳包，服务端保存 `last_seen_at`。如果超过一段时间没有收到心跳，就把这个人标成离线。

这个版本能点亮一个在线灯。要支撑派单、排班、监控和工时统计，它还差很多上下文。运营是否在线，需要同时看他是否有任务、属于哪个技能组、当前状态能不能接单、是否在灰度规则里、异常状态是否已经通知过、下游系统是否已经拿到最新状态。

我维护的 HCM/Heartbeat 系统服务 47,149 个 agent、7,000 个 skill group、约 4,000 QPS 和 141 个上游调用方。这篇文章从一个最朴素的实现开始，一层一层把系统推出来。

先看最终目标：

![最终目标：HCM 心跳状态平台](/img/hcm-heartbeat-design/v13-final-target.png)

图 0：最终目标是一套状态平台。图片由 gpt-image-2 生成。用户动作先经过统一工作台 SDK、WS-API 和 Frontier 长链，再进入 Heartbeat、MQ、Compute、HCM 和下游状态传播链路。

下面从 `last_seen_at` 开始，一步步把这张图搭出来。

每加一层，都先问一个问题。

## 问题 1：怎么知道运营有没有活跃？

第一版可以直接写状态。

![版本 0：收到心跳就直接写状态](/img/hcm-heartbeat-design/v0-direct-write.png)

图 1：最朴素的心跳实现。图片由 gpt-image-2 生成。它可以记录最近心跳时间，但缺少任务数、技能组、业务规则和 region 信息。

这个方案的数据结构大概是：

```text
agent_id
last_seen_at
status
```

前端每隔 N 秒发心跳。服务端更新 `last_seen_at`。定时任务扫描超时的人，把状态改成 `OFFLINE`。

这个模型适合很轻的场景，比如显示一个在线灯。运营管理系统的问题更具体：

- 在线的人是否可以接单？
- 正在处理工单的人能不能被自动切成异常？
- 某条异常规则只对部分业务线生效，怎么灰度？
- 状态变化之后，WFM、路由和数据侧怎么同步？
- 多 region 切流时，哪个 region 可以发送状态变更？

`last_seen_at` 只能提供最近活跃时间。上面这些问题需要更多业务上下文。

所以第一版适合作为思维起点，生产系统还要继续往前推。

## 问题 2：UI 到 Heartbeat 的事件怎么可靠进入系统？

下一步先补 UI 到 Heartbeat 的接入层，再把事件放进 Raw MQ。

![版本 1：把工作台动作变成事件流](/img/hcm-heartbeat-design/v1-event-buffer.png)

图 2：统一工作台先用 SDK、WS-API 和 Frontier 承接浏览器里的动作事件，再交给 Heartbeat 和 Raw MQ。图片由 gpt-image-2 生成。状态计算留到下一层。

前端上报的内容不只有定时心跳，还有点击、输入、鼠标、URL 变化、打开工单、回复工单、完成工单、转交工单等动作。

这些动作的含义不同，但它们有一个共同点：都只能说明“这个 agent 在某个时间点发生过动作”。

在统一工作台里，UI 到 Heartbeat 之间还有一层长链通道：

```text
Agent UI
-> Workbench SDK
-> WS-API
-> Frontier
-> Heartbeat Service
-> Raw MQ
```

Workbench SDK 在一个 window 内维护一个长链接。业务模块按 `module + entity` 注册，`deviceID` 标识这条通道。`module + entity` 的粒度要控制好，粒度太细，切换 entity 时容易出现短暂未建联，推送就会掉在窗口外。

WS-API 负责初始化长链、注册/注销 module，也负责短链补偿。Frontier 负责长链通道。Frontier 异常时，端上可以通过短链轮询补未 ack 的消息，默认间隔是 30 秒，可以用配置调整。

重复消息也在这一层先处理一遍。业务后端传 `ReqID`，SDK 保存最近一批 `ReqID` 做去重；RPC 推送服务生成 `msgID`，长链推送和短链补偿都按 `msgID` 做兜底去重。业务需要顺序时，可以带 `Index`，排序语义由业务自己维护。

这一步解决的是工程问题：

- 浏览器里多个业务模块共用一条长链。
- Frontier 异常时，可以用短链补偿。
- 端上可以按 `ReqID` / `msgID` 去重。
- 峰值流量可以被队列削掉。
- 消费者重启后可以继续消费。
- 事件接收和状态计算可以分开部署。
- 后面新增规则时，可以复用同一份事件流。

Raw MQ 里的事件是输入数据。

如果消费端拿到一个 `keyup` 事件就直接把人标在线，拿不到事件就标异常，系统还是会误判。因为事件缺上下文：它不知道当前状态、任务数、技能组、业务线规则，也不知道这条异常是否已经处理过。

这就需要下一层。

## 问题 3：怎么把事件变成状态判断？

我们加一个 Compute 层。

![版本 2：加一层计算，把事件变成候选状态](/img/hcm-heartbeat-design/v2-compute-layer.png)

图 3：Compute 消费原始事件，回查 HCM 拿当前事实，再生成异常候选。图片由 gpt-image-2 生成。

Compute 层只做一件事：把“事件”转成“候选状态变更”。

常见的事件类型可以分成几组：

| 类型 | 含义 |
| --- | --- |
| `1` | 在线心跳 |
| `2` | 工作状态变化 |
| `3-12` | 打开、回复、完成、转交、升级工单等业务动作 |
| `100-105` | 点击、输入、鼠标、切状态、呼出、URL 变化 |
| `3001` | no action 15 min 计算结果 |
| `3002` | abnormal 15 min 计算结果 |
| `3003` | not on app |
| `4000` | Rule Config V2 计算结果 |

Compute 收到原始事件后，不直接写状态。它先问 HCM：

```text
GetWorkStatus(agent_id, tenant_id, channel)
```

HCM 返回当前工作状态、任务数、技能组关系等信息。Compute 再结合规则判断这个 agent 是否进入异常候选。

这一步的核心是把判断拆开：

```text
事件 + 当前事实 + 规则 = 候选
```

候选只是待确认结果。比如一个 agent 在 10:00 后没有动作，Compute 在 10:10 认为他可能要转异常。但 10:10:01 他可能刚接到新任务。最终能不能改状态，还要由 HCM 再读一次事实。

Compute 层的边界要硬。它负责算候选，不负责提交最终状态。

## 问题 4：怎么计算“多久没有动作”？

很多心跳规则都带时间窗口：

| 场景 | 系统动作 |
| --- | --- |
| `ONLINE` 且 30 秒没有任务 | 自动转成 `IDLE` |
| `ONLINE / IDLE / BUSY` 超过 8 分钟无操作或不在工作台 | 发提醒 |
| `ONLINE / IDLE / BUSY` 超过 10 分钟无操作或不在工作台 | 自动转成 `ABNORMAL` |
| `ABNORMAL` 再持续 10 分钟无操作或不在工作台 | 自动转成 `OFFLINE` |

最直觉的实现是给每个 agent 建一个 timer。

这个方案很快会变麻烦。进程重启时 timer 丢失，扩缩容时 timer 分散到不同实例，跨 region 切流时还要处理 timer 归属。对几万个 agent 来说，进程内 timer 会把复杂度绑到实例生命周期上。

我们用 Redis zset 表达时间窗口。

![版本 3：用 Redis zset 表达时间窗口](/img/hcm-heartbeat-design/v3-time-window.png)

图 4：候选 agent 按事件时间写入 Redis zset。图片由 gpt-image-2 生成。Cron 扫描到期数据，再把异常消息送回状态更新流程。

Redis 里维护几类队列：

```text
agent_no_action_for_8_min
agent_no_action_for_10_min
queue_agent_no_action_for_15_min
agent_in_abnormal_status_more_then_10_min
queue_agent_in_abnormal_status_more_then_15_min
agent_not_on_app_for_5_min
queue_agent_not_on_app
```

score 存事件时间戳。到期扫描时，用 `zrangebyscore` 取出 `now - threshold` 之前的 agent。

这个结构有几个好处：

| 需求 | zset 怎么处理 |
| --- | --- |
| 按时间窗口判断 | score 存 timestamp |
| Compute 重启后保留候选 | 候选状态在 Redis |
| 多套规则同时存在 | 不同规则拆到不同 zset |
| 避免重复提醒 | agent/message/rule 维度加锁 |
| 支持灰度和回滚 | 队列、规则、IDC 开关走配置 |

Cron 每 2 秒扫一次队列。扫描之前先检查当前 IDC 是否允许发送，再抢一个短 TTL 的全局锁，避免多个实例重复发同一批异常消息。

这里有个容易踩坑的点：业务窗口和防重锁时间要分开设置。

比如 10 分钟无操作触发提醒，业务窗口是 600 秒，但 agent 维度的防重锁可以设成 840 秒。这样同一阶段可以减少刷屏，后续 `ABNORMAL -> OFFLINE` 也还有计算机会。

## 问题 5：谁可以写最终状态？

Compute 算出来的是候选。最终状态只能由 HCM 写入。

原因很简单：HCM 才拥有 agent、skill group、任务数、当前状态和状态变更日志。状态写入必须集中，否则下游系统会看到多个版本的事实。

座席状态本身是一组枚举：

```text
ONLINE(1000)
TRAINING(1001)
BREAK(1002)
MEETING(1003)
ABNORMAL(1004)
IDLE(1005)
LUNCH(1006)
OFFLINE(1007)
OTHER(1008)
BUSY(1009)
STANDBY(1010)
```

HCM 消费异常候选后，会重新读取当前状态，然后做二次判断：

1. 当前状态是否还匹配规则。
2. 当前任务数是否允许切换。
3. 当前 agent 是否属于规则覆盖的 skill group。
4. 当前 region 是否允许发送状态变更。
5. 这次异常是否已经通知或处理过。

规则配置可以长这样：

```json
{
  "access_party_ids": [2, 3, 9, 45, 46],
  "status": [1000, 1005, 1009],
  "no_heart_time_limit": 600,
  "status_to": 1004,
  "status_change_note": "No action for 10min, automatically changes to abnormal.",
  "notifies": [
    {
      "type": "Lark",
      "title": "abnormal hint"
    }
  ]
}
```

这段配置同时影响状态变更和通知。Compute 的 TCC、Redis 队列和 HCM 规则共同约束最终行为。

这套设计里，HCM 的职责很清楚：

- 拒绝过期候选。
- 根据当前事实判断能不能改状态。
- 写 status table。
- 写 `unified_work_status_log`。
- 把状态变化交给下游传播链路。

## 问题 6：下游怎么拿到一致的状态？

状态写进 HCM DB 后，还要继续传播给下游。

WFM、RouteQueue、数据侧和其他业务通常通过状态变更消息更新自己的视图。

最终链路长这样：

![最终链路：事件进入，状态由 HCM 提交，下游消费事实](/img/hcm-heartbeat-design/v4-final-pipeline.png)

图 5：最终链路保留了前面几个版本的组件，但职责被拆开：事件接收、候选计算、时间窗口、状态写入、状态传播。图片由 gpt-image-2 生成。

状态传播走的是：

```text
HCM UpdateWorkStatus
-> status_table
-> DBus / binlog
-> status change MQ
-> WFM / Routing / Analytics
```

这个设计让所有下游都从 DB 变更事实出发。代价是链路变长了，任何 binlog handler、事件分发、MQ 堆积或下游消费延迟，都会让用户看到旧状态。

我们踩过这个坑。

一次 US-TTP 事故里，WFM 的 Omni-channel view 没有反映实时状态。排查时 HCM DB 里的 agent 已经 offline，HCM 到 WFM 的消息看起来也发成功了。

最后问题出在更前面：binlog 到 HCM MQ 链路堆了约 300k 条消息。work status handler 没有变慢，另一个依赖 ES 的 handler 超时了。多个 handler 共用一条消费链路，慢 handler 把其他状态传播一起拖住了。

这个事故之后，我们补了 handler 维度耗时指标，也把“消费 binlog 后直接发 RMQ，减少中间事件分发阻塞”列进改造项。

这类问题在设计阶段就应该被问出来：哪个 handler 可以拖住主链路？哪个消费组有共享故障面？哪个指标能说明下游真的收到状态？

## 问题 7：跨 region 切流时，事件怎么不断？

前面的链路在单 region 内已经能工作。新的问题来自容灾和切流。

Heartbeat 事件是状态计算的输入。切流时，如果流量调度先把请求打到目标 region，但目标 region 的 Raw MQ 里没有前一段时间的事件，Compute 会缺少时间窗口里的上下文。结果可能是 agent 刚切过去就被判断成无操作，或者异常计算延迟一段时间才恢复。

所以跨 region 的第一层改造是 MQ mirror。

![版本 5：跨 region mirror 心跳事件](/img/hcm-heartbeat-design/v5-mq-mirror.png)

图 6：Raw MQ 在 region 之间做 mirror。图片由 gpt-image-2 生成。目标 region 在接管流量前，已经有一份可消费的事件流。

这层解决的是事件连续性。

```text
Region A Raw MQ <-> Region B Raw MQ
```

切流前，两个 region 都能拿到最近的心跳事件。真正调度流量时，目标 region 不需要从空队列开始计算。它已经能看到 agent 最近的点击、输入、心跳、工单动作和状态事件。

切流 SOP 也围绕这条链路设计：

1. 先看当前 region 的 Heartbeat、HCM、Raw MQ、binlog MQ、status MQ 指标。
2. 用条件化调度切一小段流量，比如 2%。
3. 看 `from_dc` 维度，确认目标 region 收到预期流量。
4. 看 mirror 后的 Raw MQ lag、错误率和消费速率。
5. 异常时删除调度配置，把流量切回。

MQ mirror 让事件更难丢。新的问题也随之出现：两个 region 都可能看到同一条事件。

事件重复本身还好，真正危险的是重复触发状态变更。比如同一条 no action 候选在两个 region 各发一次，HCM 可能收到两条异常消息，下游也可能收到两次状态变化。

所以下一层要处理重复。

## 问题 8：mirror 之后，重复事件怎么处理？

重复事件要分两段处理。

第一段在发送侧：只有一个 region 能发送异常消息。

第二段在状态侧：HCM 写状态前再读一次当前事实，做幂等判断。

![版本 6：让 mirror 后的事件可以安全消费](/img/hcm-heartbeat-design/v6-region-dedupe.png)

图 7：mirror 保证事件连续，active region 和 dedupe lock 控制状态变更只提交一次。图片由 gpt-image-2 生成。

Compute 可以在两个 region 都消费事件，但 Cron 扫描到期队列时会先检查 `active_idc`：

```text
active_idc = true  -> can emit exception message
active_idc = false -> calculate only, no emit
```

发送前再加一层 dedupe lock。锁的粒度不能太粗，否则不同规则会互相挡住；也不能太细，否则同一阶段的重复消息挡不住。比较合适的是把 agent、规则和时间窗口放进同一个去重键：

```text
agent_id + rule_id + window_start
```

Redis zset 也会帮忙收敛一部分重复候选。相同 member 重复写入时，后写入会更新 score。Cron 真正发消息时，还要按 agent/rule/window 抢锁。

HCM 是最后一道保护。

收到异常消息后，HCM 重新读取当前状态、任务数、skill group 归属和规则配置。只有当前事实还满足规则，才写 `status_table` 和 `unified_work_status_log`。如果 agent 已经有任务，或者状态已经被别的路径改走，这条候选会被丢掉。

跨 region 之后，状态链路多了三类开关：

| 开关 | 作用 |
| --- | --- |
| 流量调度 | 控制请求进哪个 region |
| MQ mirror | 控制事件是否跨 region 复制 |
| `active_idc` | 控制哪个 region 可以发送异常状态消息 |

这三个开关要分开：请求入口、事件复制、状态发送权可以按不同节奏切换。这样切流、回滚和演练才有操作空间。

## 问题 9：TT 和 IES 拆分时，怎么不打断老链路？

HCM/Heartbeat 后来同时服务 IES 和 TT 侧业务。两边共用 HCM、Heartbeat、DB、MQ 和 routing 更新链路时，发布、容量和容灾都会绑在一起。

TT 内容侧要拆出去，最简单的做法是新建 TT HCM、TT Heartbeat、TT DB 和 TT MQ，然后让上游一次性切走。

这个方案风险很高。HCM 连着登录、状态更新、skill group、任务数、路由、WFM 和 binlog 传播。一次性切干净，任何一个字段、过滤条件或 MQ 消费组出错，都会影响接单和状态同步。

所以第一阶段先做共存。

![版本 7：TT 拆分先进入共存阶段](/img/hcm-heartbeat-design/v7-tt-ies-coexistence.png)

图 8：TT upstream 先迁到 TT HCM，写入事实仍由 IES HCM 承担。图片由 gpt-image-2 生成。dsyncer 和转发逻辑保留回滚空间。

第一阶段的链路是：

```text
TT upstream
-> TT HCM
-> forward RPC to IES HCM
-> IES DB
-> dsyncer
-> TT DB
```

这一步的目标很明确：先把调用入口迁走，写入事实先留在旧链路。

为了让旧 HCM 知道哪些数据要转给 TT，需要加 ownership filter。判断路径是：

```text
agent_id
-> agent_skill_group_rel
-> skill_group
-> access_party
-> TT or IES
```

判断结果写 Redis cache。cache miss 时查 DB，拿到 access party 后再写回。工作状态、agent-skillgroup 关系和 routing 更新都可以按这个结果过滤。

这层改造带来的好处是可回滚。TT HCM 出问题，可以继续走 IES 原链路。filter 出问题，也可以通过配置关掉转发，先保住旧路径。

## 问题 10：什么时候可以真的拆开？

共存阶段跑稳之后，才进入第二阶段。

第二阶段要把写入、事件、MQ 和 routing 更新都拆开：

![版本 8：迁移后隔离 TT 和 IES](/img/hcm-heartbeat-design/v8-tt-ies-isolation.png)

图 9：拆分完成后，TT 和 IES 各自拥有 upstream、HCM、DB、MQ 和 routing 更新链路。图片由 gpt-image-2 生成。

拆分动作包括：

1. TT HCM 停止把 RPC 转发到 IES HCM。
2. IES 到 TT 的 dsyncer 停止。
3. IES heartbeat/MQ 停止消费 TT agent 消息。
4. TT routing 只消费 TT 侧状态更新。
5. IES routing 只消费 IES 侧状态更新。

拆完后，旧 HCM 侧减少约 3,000 个 agent 和约 2,000 QPS。

这里要验证两件事：服务已经拆出来，两边的状态事实也各自闭合。

- TT agent 的心跳只进入 TT 侧。
- TT agent 的状态只由 TT HCM 提交。
- TT 状态变化只进 TT routing/WFM/data 链路。
- IES 侧保留原有路径，不被 TT 发布和切流影响。

这时 TT/IES 拆分才算完成。

## 问题 11：前端动作没进来，系统怎么发现？

状态计算依赖输入事件。后端 RPC 全绿，只能说明后端还活着，说明不了用户动作真的进了 Heartbeat。

GCP -> NO1A 切流后，出现过 agent 频繁 abnormal。人还在工作台操作，系统却判断他长时间没动作。最后查到的问题在工作台长链路配置：`keyup` / `keydown` 事件没有稳定进入 Heartbeat。

HCM 错误率覆盖不到这段输入链路。状态计算前面要加一层输入健康检查。

![版本 9：监控输入事件链路](/img/hcm-heartbeat-design/v9-input-health.png)

图 10：状态计算之前先确认用户动作事件稳定进入系统。图片由 gpt-image-2 生成。Workbench SDK、WS-API、Frontier、Heartbeat 接收、Raw MQ 都要上报输入健康指标。

输入健康可以按几个维度看：

| 指标 | 用途 |
| --- | --- |
| `event_rate{event_type, region, channel}` | 看点击、输入、心跳等事件是否突然下降 |
| `client_lag` | 看客户端动作到服务端接收的延迟 |
| `frontier_error_rate` | 看长链通道是否异常 |
| `ws_register_failure` | 看 module/entity 注册是否失败 |
| `short_poll_lag` | 看短链补偿是否跟得上 |
| `raw_mq_lag` | 看事件进入 MQ 后是否堆积 |
| `synthetic_action` | 每个 region 定时打模拟动作，验证链路能跑通 |
| `no_action_ratio` | 看异常候选是否突然集中在某个 region、版本或 channel |

工程上更稳的做法是把输入健康接进规则层。

如果某个 region 或工作台版本的输入健康已经异常，自动 abnormal 规则应该降级：延长窗口、暂停自动切异常，或者只发提醒。等输入链路恢复后，再回到正常计算。

这样做会牺牲一部分自动化程度，但能避免“因为采集链路断了，把正在工作的人切成异常”。

## 问题 12：HCM 已经写状态，下游还是旧状态怎么办？

状态提交成功以后，下游还要拿到同一个事实。这里出过一个很典型的事故：US-TTP ES down 时，WFM 的 Omni-channel view 没有反映实时状态。

排查时，HCM DB 里的 agent 已经 offline，HCM 到 WFM 的消息看起来也发成功了。最后发现 binlog 到 HCM MQ 堆了约 300k 条消息。work status handler 本身没慢，另一个依赖 ES 的 handler 超时了。多个 handler 共用一条消费链路，慢 handler 把工作状态传播拖住了。

这个问题把 V4 的状态传播继续往前推一层：状态变更要有独立车道。

![版本 10：隔离状态传播 handler](/img/hcm-heartbeat-design/v10-handler-isolation.png)

图 11：binlog 下游按业务语义拆成独立 handler。图片由 gpt-image-2 生成。Search handler 变慢时，work status handler 仍然可以把状态送到 WFM 和 routing。

更好的目标形态是把状态变化当成一等事件处理：

```text
HCM transaction
-> status_table
-> status_change_outbox
-> work_status_dispatcher
-> status MQ
-> WFM / Routing
```

`status_change_outbox` 和状态写入放在同一个事务里。dispatcher 只负责把 outbox 里的状态事件送到状态 MQ。

Search、analytics、audit 这些消费者可以继续消费 binlog 或订阅自己的事件流，但它们不应该和 work status propagation 共用同一个阻塞点。慢 handler 要进入自己的 retry / DLQ，不能拖住 WFM 和 routing。

这层还要补端到端指标：

| 指标 | 说明 |
| --- | --- |
| `status_commit_to_mq_latency` | HCM 写 DB 到状态消息发出的延迟 |
| `mq_to_wfm_latency` | 状态 MQ 到 WFM 消费完成的延迟 |
| `handler_lag{handler}` | 每个 handler 自己的堆积 |
| `handler_error_rate{handler}` | 每个 handler 自己的错误率 |
| `downstream_state_age` | 下游看到的状态距离 HCM 提交多久 |

状态系统最怕“主库已经对了，下游还错着”。只有把提交、出站、消费分开看，才能知道慢在哪一段。

## 问题 13：热读接口把 HCM 打爆怎么办？

`GetWorkStatus` 是这条链路里的热接口。Compute 要查它，上游也要查它。一次 OOM 事故里，downstream error rate spike 和 `GetWorkStatus` 流量峰值对齐。

这说明状态系统还需要容量防线。

![版本 11：保护热状态读接口](/img/hcm-heartbeat-design/v11-status-read-guard.png)

图 12：`GetWorkStatus` 前面加 quota，内部按调用方隔离线程池，后面用短 TTL cache 和自动扩容信号保护 DB。图片由 gpt-image-2 生成。

这里的目标是把不同调用方隔开。单个上游出问题时，故障范围停在自己的预算里。

`GetWorkStatus` 至少需要这几层保护：

| 防线 | 作用 |
| --- | --- |
| per-caller quota | 单个上游打爆时，先限制这个上游 |
| bulkhead pool | Compute、WFM、管理台等调用方分开线程池 |
| read cache | 短 TTL 缓存状态，挡住重复读 |
| stale read budget | 非写路径允许读到短时间内的旧状态 |
| circuit breaker | DB 或依赖异常时快速失败 |
| autoscale signal | 按 QPS、heap、GC、p99 延迟扩容 |

Heartbeat Compute 侧也要配合。比如同一个 agent 在短时间内连续上报动作，不需要每条事件都 RPC 查一次当前状态。可以按 agent 做小窗口合并，或者读取本地/Redis 状态快照，再把最终提交交给 HCM recheck。

这层改造把 `GetWorkStatus` 从“谁来都查 DB”变成“有预算、有隔离、有降级的状态读服务”。

## 问题 14：查询改动怎么安全上线？

HCM 4.3 的 DB query rollback 暴露的是发布防线。

canary 阶段看起来正常，ROW 后出现新错误日志。原因是两个 `LEFT JOIN` 放大了 `count` SQL 的数据量，最后打到 DB timeout。

“先 canary 再全量”覆盖不了这类问题。canary 流量小，数据分布也可能偏，复杂查询要单独过成本检查。

![版本 12：让查询改动可控上线](/img/hcm-heartbeat-design/v12-query-release-guard.png)

图 13：查询改动先经过 feature flag、canary、shadow query、EXPLAIN 和慢 SQL 监控。图片由 gpt-image-2 生成。异常时切回 old query。

查询发布可以按这条路径走：

```text
query change
-> feature flag
-> canary
-> shadow query
-> row traffic
-> auto rollback
```

`shadow query` 不参与线上返回，只比较结果和成本。发布系统要看几类信号：

| 信号 | 动作 |
| --- | --- |
| `EXPLAIN` row estimate 超阈值 | 拦住发布 |
| shadow query 结果不一致 | 拦住发布 |
| p99 查询耗时超过预算 | 降级或回滚 |
| 新错误日志增加 | 回滚 |
| DB timeout 增加 | 回滚 |

对查询路径来说，feature flag 不能只开关整个功能。更实用的是按 filter 字段选择 old query 或 join query：

```text
simple filter -> old query
join filter   -> join query
```

这样某个复杂 filter 出问题时，可以只回退这条查询路径，不影响其他查询。

## 后续还要解决什么？

上面的 V9 到 V12 把系统推成一个状态平台。输入链路、计算链路、提交链路、传播链路、容量链路、发布链路都要能被单独观测和单独降级。

后面还可以继续扩：

| 问题 | 扩展方向 |
| --- | --- |
| 规则变多以后怎么验证 | 做 rule simulator，用历史事件回放新规则，看会影响多少 agent |
| 状态错误怎么快速定位 | 做 per-agent timeline，把输入事件、候选、zset、HCM 提交、下游消费串起来 |
| 多 region 会不会脑裂 | 定期演练 `active_idc` 切换，检查重复消息和丢消息 |
| 下游状态长期落后怎么处理 | 增加状态 reconciliation job，把 WFM/routing 与 HCM 事实对账 |
| 热读缓存会不会读脏 | 给缓存结果加版本号和过期预算，写路径仍由 HCM recheck 收口 |

## 最终设计

回到最开始的问题：怎么知道一个运营是否在线？

回到开头那张最终目标图，可以按两条线看：数据面和控制面。

数据面负责把用户动作变成状态事实：

```text
Agent UI
-> Workbench SDK
-> WS-API
-> Frontier
-> Heartbeat Service
-> Raw MQ
-> Compute
-> Redis zset
-> Exception MQ
-> HCM
-> DB + Outbox
-> Status MQ
-> WFM / Routing / Analytics
```

控制面负责让这条链路在异常时还能收住：

- 前端负责上报动作和心跳。
- Workbench SDK 负责长链单例、断链重连、短链补偿和端上去重。
- 输入健康确认动作事件真的进入 Heartbeat。
- MQ mirror 保留跨 region 事件连续性。
- Redis zset 和 dedupe lock 控制候选重复。
- `active_idc` 控制哪个 region 能发送异常消息。
- HCM recheck 收口最终状态提交。
- Outbox 和 handler 隔离保护工作状态传播。
- quota、cache、bulkhead 和 circuit breaker 保护热读接口。
- query gate 控制复杂查询发布。
- TT/IES ownership 控制 agent、skill group、MQ 和 routing 更新归属。

这个设计看起来比第一版复杂很多。每一层都是被上一个问题推出来的：

| 版本 | 新问题 | 新增设计 |
| --- | --- | --- |
| V0 | 怎么记录最近活跃 | `last_seen_at` |
| V1 | UI 到 Heartbeat 的事件怎么可靠进入系统 | Workbench SDK + WS-API + Frontier + Raw MQ |
| V2 | 事件怎么变成状态判断 | Compute + `GetWorkStatus` |
| V3 | 多分钟窗口怎么计算 | Redis zset + Cron |
| V4 | 谁写最终状态，下游怎么拿事实 | HCM + DB/binlog/status MQ |
| V5 | 跨 region 切流时事件怎么不断 | MQ mirror |
| V6 | mirror 之后重复事件怎么处理 | `active_idc` + dedupe + HCM recheck |
| V7 | TT 拆分怎么保留回滚路径 | TT HCM 转发 + ownership filter + dsyncer |
| V8 | 怎么把 TT/IES 真正拆开 | 独立 HCM/DB/MQ/routing 链路 |
| V9 | 前端动作没进来怎么发现 | input health + synthetic action |
| V10 | 下游状态被慢 handler 拖住怎么办 | handler isolation + outbox + DLQ |
| V11 | 热读接口把 HCM 打爆怎么办 | quota + cache + bulkhead + load shedding |
| V12 | 查询改动怎么安全上线 | feature flag + shadow query + auto rollback |

最开始的问题只是“这个人还在不在线”。最后系统回答的是一组更具体的问题：这个 agent 最近有没有动作，输入事件链路是否健康，当前有没有任务，属于哪个 skill group，规则是否覆盖他，哪个 region 可以发异常，状态能不能提交，下游是否拿到了同一个事实，热读接口是否在预算内，查询发布是否能回滚，TT 和 IES 的 ownership 是否已经分开。
