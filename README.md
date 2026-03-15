# OpenClaw / Moltbot 项目中文说明

> 面向管理层、汇报场景和新成员阅读的中文版本说明。
> 这份文档重点不是罗列功能，而是把**系统组成、前后端关系、核心交互闭环、控制平面设计**讲清楚。

---

## 1. 项目简介

OpenClaw（当前仓库也兼容 `moltbot` / `clawdbot` 入口）本质上不是一个单纯的聊天页面，也不是一个只会调用大模型的 Bot。

它是一套“**个人 AI 助手控制平台**”：

- 运行在用户自己的设备或自控环境中；
- 把多种消息渠道、多种终端设备、多种 Agent 能力统一接到同一个控制平面；
- 让用户通过网页控制台、CLI、移动端、桌面端、消息渠道等多个入口与助手交互；
- 让系统把聊天、配置、渠道接入、设备能力、审批、安全、自动化任务统一纳入一个中枢管理。

一句话概括：

**这是一个以 Gateway 为核心控制平面的个人 AI 助手系统，而不是一个孤立的聊天应用。**

---

## 2. 这套系统解决什么问题

传统的 AI 应用通常存在几个问题：

1. 入口分散：网页一个入口、手机一个入口、消息软件又是另一个入口；
2. 能力分裂：聊天、配置、自动化、设备控制、消息渠道接入往往是不同系统；
3. 状态不统一：前端看到的状态、后台运行状态、消息通道状态、设备在线状态彼此割裂；
4. 治理能力弱：缺少审批、权限、配对、健康检查、运维观察面；
5. 不适合个人私有化长期运行：很多产品更像一次性网页，不像长期在线的助手基础设施。

OpenClaw 试图解决的正是这些问题：

- 用一个 **Gateway** 统一收敛系统状态；
- 用一个 **Control UI** 统一展示和操作系统；
- 用一套 **WebSocket 控制协议** 统一前端、CLI、设备节点、自动化入口；
- 用一套 **HTTP 辅助接口** 承接健康检查、Webhook、兼容 API、静态资源等外围入口；
- 用 **多渠道接入 + 多节点能力 + 多 Agent 路由** 的方式，把系统扩展成真正可长期运行的个人助手平台。

---

## 3. 系统整体架构总览

从系统视角看，这个项目可以分成四层：

1. **接入层**：消息渠道、浏览器控制台、CLI、移动端、桌面端、Webhook、兼容 API；
2. **控制层**：Gateway，整个系统唯一的控制平面；
3. **执行层**：Agent、技能、工具、节点命令、渠道发送、定时任务；
4. **观察与治理层**：配置、日志、健康、调试、审批、配对、使用量、会话管理。

### 3.1 系统全景图

```text
┌─────────────────────────────────────────────────────────────────────┐
│                           外部接入层                               │
│                                                                     │
│  浏览器 Control UI   CLI   macOS App   iOS/Android 节点   Webhook   │
│  OpenAI-compatible API   Slack/Discord/Telegram/WhatsApp/...       │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                │ HTTP / WebSocket
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         Gateway（控制平面）                         │
│                                                                     │
│  - HTTP 服务：UI 资源、bootstrap config、health/ready、Webhook、    │
│    插件路由、/v1/chat/completions、/v1/responses 等                 │
│  - WS-RPC 服务：connect / chat / config / channels / devices / ... │
│  - 事件广播：chat / agent / presence / health / approvals / ...    │
│  - 状态中枢：会话、设备、渠道、节点、配置、审批、任务、日志等       │
└─────────────────────────────────────────────────────────────────────┘
                                │
         ┌──────────────────────┼──────────────────────────┐
         │                      │                          │
         ▼                      ▼                          ▼
┌──────────────────┐   ┌──────────────────┐      ┌──────────────────┐
│   Agent Runtime  │   │ Channel Runtime  │      │   Node Runtime   │
│                  │   │                  │      │                  │
│ 推理 / 工具 /技能 │   │ 渠道连接 / 发消息 │      │ 设备能力 / 本地命令│
│ 会话上下文 / 流式 │   │ 状态监控 / 登录流 │      │ 相机/录屏/位置等   │
└──────────────────┘   └──────────────────┘      └──────────────────┘
                                │
                                ▼
                     最终回流到 UI / CLI / 渠道 / 设备
```

### 3.2 核心判断

这套系统最重要的架构判断是：

- **前端不是核心业务承载体，Gateway 才是核心业务中枢；**
- **前端负责展示、发起操作、接收事件、维持局部 UI 状态；**
- **后端负责鉴权、路由、执行、状态持有、事件广播、外部集成。**

---

## 4. Monorepo 代码结构与模块边界

这个仓库是一个 pnpm monorepo，但与常见“前端目录 + 后端目录”结构不同，它的后端核心直接位于根目录 `src/`。

### 4.1 关键目录说明

| 目录 | 作用 | 管理层理解方式 |
|---|---|---|
| [src/](src/) | 系统核心后端，包含 Gateway、协议、HTTP/WS 服务、会话、节点、渠道、自动化等 | 真正的系统中枢 |
| [ui/](ui/) | 浏览器控制台，基于 Lit 的单页应用 | 管理入口 / 控制界面 |
| [extensions/](extensions/) | 各类扩展包、渠道接入、记忆、语音、认证代理等 | 平台扩展能力层 |
| ~~[apps/](apps/)~~ | ~~Android / iOS / macOS / shared 原生应用~~ | ~~终端侧节点与伴生应用~~ |
| [packages/](packages/) | 兼容入口包（如 `moltbot`、`clawdbot`） | 兼容命令名 / 包装层 |
| [docs/](docs/) | 分领域文档、协议说明、渠道说明、自动化说明 | 外部说明体系 |

### 4.2 关键事实

这个项目最容易让新读者误解的一点是：

- 根目录 `src/` 不是“公共工具目录”；
- 它实际上就是整套系统的主后端；
- `ui/` 是挂在 Gateway 之上的控制台，而不是独立业务后端的前端壳子。

### 4.3 后端核心入口

从代码入口角度看，后端控制平面的装配中心在：

- [src/gateway/server.impl.ts](src/gateway/server.impl.ts)
- [src/gateway/server-http.ts](src/gateway/server-http.ts)
- [src/gateway/server-methods.ts](src/gateway/server-methods.ts)

这三个文件基本决定了：

- 系统如何启动；
- HTTP 服务暴露哪些入口；
- WebSocket 控制面支持哪些方法域；
- 不同子系统如何被挂接在一起。

### 4.4 前端核心入口

浏览器控制台的主链路在：

- [ui/src/main.ts](ui/src/main.ts)
- [ui/src/ui/app.ts](ui/src/ui/app.ts)
- [ui/src/ui/app-lifecycle.ts](ui/src/ui/app-lifecycle.ts)
- [ui/src/ui/app-gateway.ts](ui/src/ui/app-gateway.ts)
- [ui/src/ui/gateway.ts](ui/src/ui/gateway.ts)

这些文件决定了：

- 页面如何启动；
- 如何拉取 bootstrap 配置；
- 如何建立 WebSocket；
- 如何处理 hello、event、disconnect；
- 如何刷新 chat / config / channels / devices 等不同页面。

---

## 5. Gateway：系统控制平面

### 5.1 Gateway 是什么

Gateway 可以理解为“系统总控中心”。

它不是单一的 API Server，而是同时承担以下职责：

1. **对外连接中枢**：浏览器、CLI、原生 App、节点、Webhook、兼容 API 都接入这里；
2. **状态中枢**：持有会话、配置、渠道、设备、节点、审批、健康等运行状态；
3. **执行路由中枢**：把请求分发给 Agent、渠道运行时、节点运行时、自动化任务；
4. **安全治理中枢**：做鉴权、配对、Token 管理、审批与速率控制；
5. **观察中枢**：提供 health、ready、logs、usage、debug、sessions 等运维视图能力。

### 5.2 Gateway 的双接口模型

Gateway 同时提供两类接口：

#### 1）HTTP 面
主要用于：

- 提供 Control UI 静态资源；
- 提供控制台 bootstrap 配置；
- 提供 `/health`、`/ready` 健康探针；
- 接收 Webhook / hooks；
- 暴露 OpenAI-compatible `/v1/chat/completions`；
- 暴露 `/v1/responses`；
- 承接插件 HTTP 路由、~~Slack / Mattermost 相关 HTTP 入口~~、工具调用 HTTP 入口等。

关键文件：

- [src/gateway/server-http.ts](src/gateway/server-http.ts)

#### 2）WebSocket 控制面
主要用于：

- 控制台与后台之间的主交互；
- CLI 与 Gateway 之间的主控制链路；
- 节点设备（iOS / Android / macOS 等）接入；
- 实时事件推送；
- 聊天流式输出、审批、配置、节点、会话等的统一控制。

关键文件：

- [src/gateway/server-methods.ts](src/gateway/server-methods.ts)
- [docs/concepts/architecture.md](docs/concepts/architecture.md)

### 5.3 Gateway 的方法域

从 [src/gateway/server-methods.ts](src/gateway/server-methods.ts) 可以看到，Gateway 的 WS 方法不是零散的，而是按业务域组织的。

主要包括：

- `connect`
- `logs`
- `health`
- `channels`
- `chat`
- `cron`
- `devices`
- `exec-approvals`
- `web`
- `models`
- `config`
- `wizard`
- `talk`
- `tools-catalog`
- `tts`
- `skills`
- `sessions`
- `system`
- `update`
- `nodes`
- `push`
- `send`
- `usage`
- `agent`
- `agents`
- `browser`

这说明 Gateway 不是“给前端几个 API”的后端，而是已经形成了相对完整的**控制面协议层**。

---

## 6. Control UI：前端控制入口

### 6.1 Control UI 的定位

Control UI 是整个系统的浏览器端控制台。

它不是普通意义上的“业务前端页面”，而是一个面向系统控制的操作台，承担以下职责：

- 展示系统概况；
- 展示聊天界面；
- 展示渠道连接状态；
- 展示设备配对与节点能力；
- 展示配置、日志、调试、会话、使用量、技能、定时任务；
- 发起控制操作；
- 接收 Gateway 的实时事件并刷新页面。

### 6.2 前端不是主状态源

前端维护了一部分本地状态，例如：

- 当前 tab；
- UI 主题；
- 浏览器本地持久化设置；
- 当前聊天输入框与流式展示状态；
- 设备身份缓存与本地 Token；
- 页面滚动与局部交互状态。

但系统真正的主状态仍然在 Gateway：

- 配置真实值；
- 渠道运行状态；
- 设备配对关系；
- 会话数据；
- 节点在线能力；
- 审批队列；
- 系统健康状态。

因此，Control UI 更准确的定位是：

**状态展示和控制入口，而不是业务事实来源。**

### 6.3 控制台页签模型

从 [ui/src/ui/navigation.ts](ui/src/ui/navigation.ts) 可以看到，前端主要分为四组页面：

| 分组 | 页面 |
|---|---|
| chat | `chat` |
| control | `overview`、`channels`、`instances`、`sessions`、`usage`、`cron` |
| agent | `agents`、`skills`、`nodes` |
| settings | `config`、`debug`、`logs` |

这说明控制台并不是只做聊天，而是已经具备完整的“运营/治理/配置/观察”控制台属性。

---

## 7. 前端启动流程：从页面加载到建立控制连接

这是整个系统最关键的一条链路，因为它直接体现前后端关系。

### 7.1 启动流程总览

1. 浏览器加载 Control UI 页面；
2. 前端初始化应用外壳；
3. 前端先通过 HTTP 拉取 bootstrap 配置；
4. 前端根据配置和当前地址推断 basePath、gatewayUrl、session 等信息；
5. 前端建立 WebSocket 连接；
6. 执行 `connect` 握手与鉴权；
7. Gateway 返回 `hello-ok` 和初始 snapshot；
8. 前端加载助手身份、agent 列表、工具目录、节点、设备等数据；
9. 按页面类型启动补充轮询（logs/debug/nodes）。

### 7.2 关键代码路径

- 启动生命周期：[ui/src/ui/app-lifecycle.ts](ui/src/ui/app-lifecycle.ts)
- 连接 Gateway：[ui/src/ui/app-gateway.ts](ui/src/ui/app-gateway.ts)
- 浏览器 WS 客户端：[ui/src/ui/gateway.ts](ui/src/ui/gateway.ts)
- bootstrap 配置契约：[src/gateway/control-ui-contract.ts](src/gateway/control-ui-contract.ts)

### 7.3 bootstrap 配置

前端启动后，不会立即盲目建立 WebSocket，而是先通过 HTTP 获取控制台启动配置。

这个路径在 [src/gateway/control-ui-contract.ts](src/gateway/control-ui-contract.ts) 中定义为：

- `GET /__openclaw/control-ui-config.json`

其主要返回内容包括：

- `basePath`
- `assistantName`
- `assistantAvatar`
- `assistantAgentId`
- `serverVersion`

这一步的意义是：

- 让前端先知道当前部署路径；
- 知道默认助手是谁；
- 知道当前服务端版本；
- 为后续 WebSocket 连接建立统一上下文。

### 7.4 URL 与本地设置融合

前端在启动过程中还会结合：

- 当前 URL 参数；
- 本地 localStorage 设置；
- 当前 pathname 推导出的 basePath；
- sessionKey、theme、gatewayUrl 等信息。

这意味着 Control UI 启动不是一个“死页面加载”，而是一个“**按当前环境重建控制上下文**”的过程。

### 7.5 WebSocket connect 握手

在 [ui/src/ui/gateway.ts](ui/src/ui/gateway.ts) 中，浏览器端通过 `GatewayBrowserClient` 连接 Gateway。

握手阶段会携带：

- client 元信息；
- role（浏览器控制台通常是 `operator`）；
- scopes；
- token / password；
- device identity；
- userAgent、locale；
- 能力声明（如 `tool-events`）。

如果浏览器运行在安全上下文（如 HTTPS / localhost），前端还会：

- 生成或加载本地设备身份；
- 对握手 payload 做签名；
- 使用设备 Token 参与后续配对与认证流程。

### 7.6 hello / snapshot 初始化

连接成功后，Gateway 返回 `hello-ok` 与 snapshot，前端随后会：

- 标记连接成功；
- 清理之前断线遗留的流式状态；
- 加载助手身份；
- 加载 agent 列表；
- 加载工具目录；
- 静默刷新节点与设备列表；
- 根据当前 tab 刷新对应页面。

这说明前端拿到连接后，并不会一次性把所有页面数据全部拉满，而是采用：

- **hello 提供初始连接上下文；**
- **各页面再按需加载业务数据。**

---

## 8. 前后端协作模型：HTTP、WebSocket、事件、轮询如何分工

这是理解本项目交互逻辑的核心。

### 8.1 协作模型概括

系统不是单一请求-响应模式，而是四种机制协同：

1. **HTTP**：负责静态资源、bootstrap、健康探针、Webhook、兼容 API；
2. **WebSocket RPC**：负责控制台和 Gateway 之间的主请求链路；
3. **WebSocket Event**：负责实时状态回流与流式输出；
4. **Polling（轮询）**：负责日志、调试、节点等部分非事件视图的持续刷新。

### 8.2 前后端职责对照表

| 领域 | 前端职责 | 后端职责 |
|---|---|---|
| 启动配置 | 拉取 bootstrap 配置、恢复本地设置 | 提供 control-ui-config JSON |
| 页面导航 | 维护 tab 与浏览器 history | 无需感知页面细节 |
| 主业务操作 | 发起 WS-RPC 请求 | 校验权限、执行 handler、返回结果 |
| 实时反馈 | 接收 event、更新页面 | 广播 chat/agent/health/presence 等事件 |
| 配置编辑 | 表单编辑、原始文本编辑、差异感知 | 校验、保存、应用配置 |
| 设备与节点 | 展示配对和节点状态 | 维护设备信任关系、节点注册与能力路由 |
| 运行观察 | 展示日志、调试、会话、使用量 | 持有真实状态并提供查询/事件接口 |

### 8.3 为什么不是纯 REST

系统之所以以 WebSocket 为主，不是为了“时髦”，而是因为它天然适合以下场景：

- 聊天流式输出；
- Agent 工具流；
- 审批实时回流；
- Presence / health 变化推送；
- 节点状态变化推送；
- 长连接控制平面。

如果全部改成普通 HTTP，会导致：

- 前端必须自己维护大量轮询；
- 流式体验割裂；
- 控制面时效性下降；
- 节点 / 客户端 / UI 的协议不统一。

因此，本项目的设计选择是：

**HTTP 负责外围入口，WebSocket 负责核心控制。**

---

## 9. 核心交互流程一：聊天链路

聊天是最直观的业务流程，但在本项目中，它并不是“前端发一条消息，后端返回一句话”这么简单。

### 9.1 聊天链路步骤

#### 第 1 步：用户输入消息

用户在聊天页输入文本，必要时附加图片等附件。

前端代码主入口：

- [ui/src/ui/controllers/chat.ts](ui/src/ui/controllers/chat.ts)

#### 第 2 步：前端先做本地展示

在 `sendChatMessage()` 中，前端会先把用户消息追加到本地 `chatMessages` 中，实现“先显示，后发送”的交互体验。

同时前端会：

- 生成 `runId` / `idempotencyKey`；
- 初始化 `chatStream`；
- 标记当前正在发送；
- 把附件从 data URL 转成 API 可接收的 base64 结构。

#### 第 3 步：前端调用 `chat.send`

前端通过 WebSocket 发送：

- `chat.send`

关键参数包括：

- `sessionKey`
- `message`
- `deliver: false`
- `idempotencyKey`
- `attachments`

这一步说明，聊天并不是直接“向模型发请求”，而是进入 Gateway 的聊天控制域。

#### 第 4 步：Gateway 进行路由

Gateway 接到 `chat.send` 后，会根据：

- 当前 `sessionKey`
- 关联 agent
- 会话上下文
- 可能的发送策略 / reply-back 策略

决定如何把消息送入内部 Agent 运行时。

也就是说，Gateway 在这里承担的是：

- 会话路由；
- 状态接管；
- 与 Agent Runtime 的桥接；
- 后续事件广播。

#### 第 5 步：Agent 运行并产生事件流

Agent 运行过程中，Gateway 不一定等最终答案一次性出完，而是会以事件形式回推：

- 增量 delta；
- 工具事件；
- final；
- aborted；
- error。

这部分事件最终由前端在 [ui/src/ui/app-gateway.ts](ui/src/ui/app-gateway.ts) 和 [ui/src/ui/controllers/chat.ts](ui/src/ui/controllers/chat.ts) 中消费。

#### 第 6 步：前端实时更新流式内容

当前端收到 `delta` 时，会更新 `chatStream`；
收到 `final` 时，会把最终 assistant 消息并入 `chatMessages`；
收到 `aborted` 时，会保留必要的中间流式文本；
必要时还会调用 `chat.history` 重新加载历史，以确保工具结果与最终消息落盘状态一致。

#### 第 7 步：用户中止

如果用户点击中止，则前端调用：

- `chat.abort`

中止的对象可以是：

- 指定 `runId`；
- 或当前 session 正在运行的聊天任务。

### 9.2 这条链路的本质

这条聊天链路的本质是：

**UI 负责交互体验，Gateway 负责会话和运行控制，Agent 负责生成与执行，事件负责把结果流回给 UI。**

### 9.3 为什么领导需要知道这条链路

因为这能解释三个关键问题：

1. 为什么前端不是简单页面，而是控制台；
2. 为什么 Gateway 必须作为中枢存在；
3. 为什么系统能承载不只是聊天，还能承载工具流、审批流、会话管理与跨端状态同步。

---

## 10. 核心交互流程二：配置读取、修改与生效

配置链路体现的是这套系统的“控制面写操作”能力。

### 10.1 流程概述

#### 第 1 步：前端读取配置结构与当前值

前端分别请求：

- `config.schema`
- `config.get`

对应代码：

- [ui/src/ui/controllers/config.ts](ui/src/ui/controllers/config.ts)

这里前端拿到的是两类信息：

1. **schema**：说明哪些字段可以配置；
2. **snapshot**：说明当前实际配置值、原始文本、校验状态、问题列表等。

#### 第 2 步：用户在前端编辑配置

前端支持两种编辑方式：

- 表单模式；
- 原始文本模式。

编辑过程中，前端会：

- 在本地维护 `configForm`；
- 跟踪 `dirty` 状态；
- 根据 schema 对表单字符串做类型矫正，避免数字/布尔被错误提交为字符串。

#### 第 3 步：前端调用 `config.set`

保存时，前端会提交：

- `raw`
- `baseHash`

其中 `baseHash` 的作用是保证此次修改基于当前已知版本，避免覆盖并发变更。

#### 第 4 步：前端调用 `config.apply`

在“应用配置”阶段，前端会调用：

- `config.apply`

必要时还带上 `sessionKey`，使 Gateway 知道当前控制操作关联的会话上下文。

#### 第 5 步：Gateway 校验并应用

Gateway 在这一阶段承担：

- 配置校验；
- 配置持久化；
- 触发相关组件重载；
- 必要时重建通道、服务或连接；
- 返回给前端新的状态。

### 10.2 为什么配置操作需要单独强调

因为它和普通表单提交不同：

- 修改的是整套系统的运行状态；
- 可能影响渠道连接、Agent 行为、设备接入、HTTP/WS 暴露面；
- 属于高价值控制平面写操作。

从 [src/gateway/server-methods.ts](src/gateway/server-methods.ts) 可以看到：

- `config.apply`
- `config.patch`
- `update.run`

都被视为控制平面写操作，且带有速率限制。

这说明系统设计者非常明确地把“配置变更”和“普通读取请求”区别对待。

### 10.3 更新操作

除了配置应用，前端还可以调用：

- `update.run`

它不是普通 UI 按钮，而是系统层面的升级/更新控制动作，因此在管理层汇报里应归类为：

**系统控制面运维动作。**

---

## 11. 核心交互流程三：渠道接入、登录与状态管理

OpenClaw 的一个重要特征是多渠道接入，因此“渠道如何登录、如何展示状态、如何回写控制台”是必须讲清楚的。

### 11.1 渠道状态读取

前端通过：

- `channels.status`

读取当前渠道的总体快照。

对应前端代码：

- [ui/src/ui/controllers/channels.ts](ui/src/ui/controllers/channels.ts)

这一步会得到的不是简单的“在线/离线”，而是一个更完整的快照，通常包括：

- 渠道列表；
- 账号状态；
- 最近成功时间；
- 连接/配置情况；
- 默认账号关系；
- 探测 / 审计信息。

### 11.2 ~~WhatsApp 登录流程（代表性例子）~~

在前端已经明确实现的网页登录流程里，WhatsApp 是最典型的一个例子。

#### 第 1 步：发起登录

前端调用：

- `web.login.start`

后台可能返回：

- 登录提示信息；
- QR 码 data URL。

#### 第 2 步：等待登录完成

前端调用：

- `web.login.wait`

这一步会等待一定时间窗口，直到：

- 登录成功；
- 超时；
- 出现错误。

#### 第 3 步：状态回写到控制台

前端把 `message`、`connected`、`qrDataUrl` 等信息展示在 channels 页面里，形成可视化的登录状态反馈。

#### 第 4 步：登出

用户可通过：

- `channels.logout`

要求后台中断并清理指定渠道（例如 `whatsapp`）的登录态。

### 11.3 后端在渠道流程中的角色

Gateway 在渠道流程中不是“透传”，而是：

- 管理渠道账号运行时；
- 维护渠道启停状态；
- 维护登录态与错误态；
- 管理登录 / 登出动作；
- 把最终渠道状态统一暴露给前端。

这部分后端调度核心在：

- [src/gateway/server-channels.ts](src/gateway/server-channels.ts)

### 11.4 这条链路的管理意义

渠道不是附属功能，而是这套系统的“外部消息入口”。

因此需要从管理视角强调：

- 渠道接入受统一控制；
- 各渠道状态被统一收敛到 Gateway；
- 前端看到的是统一控制面，不必分别操作各个平台后台。

### 11.5 各 Channel 的逐项配置细节

下面这一节补充的是“每一个 channel 怎么配”的管理视角说明。

为了避免 README 退化成纯参数手册，这里不展开所有底层字段，而是聚焦每个渠道最关键的四类信息：

1. **接入方式**：它通过什么协议或运行模式接入 Gateway；
2. **必需配置**：最少需要哪些凭据、地址、Token、路径；
3. **访问控制字段**：DM、群组、allowlist、mention gating 等主要控制项；
4. **重要注意事项**：适合汇报时提醒领导或实施人员的关键边界。

### 11.5.1 通用配置规律

大多数消息渠道都遵循一套共同模式：

- 私聊入口通常由 `dmPolicy` 控制；
- 私聊白名单通常由 `allowFrom` 控制；
- 群组入口通常由 `groupPolicy` 控制；
- 群组内触发者白名单通常由 `groupAllowFrom` 或每群/每频道内的 `allowFrom`、`users` 等控制；
- 群组默认往往还要求 `requireMention: true`，避免机器人在群里被动刷屏；
- 多账号模式通常通过 `accounts.<id>` 覆盖通用配置；
- 默认的安全基线通常是：**DM 采用 pairing，群组采用 allowlist 或 mention gating。**

---

### 11.5.2 ~~BlueBubbles（推荐的 iMessage 集成）~~

**接入方式**

- 通过 BlueBubbles macOS Server 的 REST API + webhook 接入；
- 这是当前推荐的 iMessage 集成方式。

**必需配置**

- `serverUrl`
- `password`
- `webhookPath`（示例默认值常见为 `/bluebubbles-webhook`）

**关键访问控制字段**

- `dmPolicy`
- `allowFrom`
- `groupPolicy`
- `groupAllowFrom`
- `groups.<chatGuid>.requireMention`

**重要注意事项**

- 文档明确要求 webhook 必须有密码保护；
- webhook 认证是强制的，不会因为部署在内网或本机而放开；
- 支持较丰富的 iMessage 高级动作，如编辑、撤回、回复线程、消息特效、群管理、附件发送；
- 对管理层来说，它适合被理解为：**当前 iMessage 的主集成方案。**

---

### 11.5.3 ~~Discord~~

**接入方式**

- 官方 Discord Bot API + Gateway；
- 同时支持 DMs 和 guild（服务器）内频道。

**必需配置**

- `token`（Bot Token）
- 需要在 Discord Developer Portal 中创建应用并启用必要 intents

**关键访问控制字段**

- 私聊：`dmPolicy`、`allowFrom`
- 服务器/群组：`groupPolicy`
- 服务器白名单：`guilds.<guildId>`
- 每个 guild 下可进一步配置：
  - `requireMention`
  - `users`
  - `roles`
  - `channels`
  - `ignoreOtherMentions`

**重要注意事项**

- Discord DMs 默认走 pairing 模式；
- Guild 侧推荐走 allowlist；
- 如果给 guild 配了 `channels`，未列出的频道会被拒绝；
- group DM 默认是单独控制的，不建议默认打开。

---

### 11.5.4 ~~Feishu / Lark~~

**接入方式**

- 默认通过 WebSocket 长连接收事件；
- 也支持 webhook 模式。

**必需配置**

- `appId`
- `appSecret`
- 若使用国际版，需设置 `domain: "lark"`
- webhook 模式下还需要 `verificationToken`

**关键访问控制字段**

- `dmPolicy`
- `allowFrom`
- `groupPolicy`
- `groupAllowFrom`
- `groups.<chat_id>.requireMention`
- `groups.<chat_id>.allowFrom`

**重要注意事项**

- WebSocket 模式不需要对外暴露 webhook URL；
- webhook 模式下，文档建议仅在必要时改 `webhookHost`；
- 适合对接企业内办公沟通场景。

---

### 11.5.5 ~~Google Chat~~

**接入方式**

- Google Chat API 的 HTTP webhook 模式。

**必需配置**

- `serviceAccountFile` 或 `serviceAccount`
- `audienceType`
- `audience`
- `webhookPath`
- 可选 `botUser`

**关键访问控制字段**

- 私聊：`dm.policy`、`dm.allowFrom`
- 群空间：`groupPolicy`
- `groups.<spaceId>` 下可配置：
  - `allow`
  - `requireMention`
  - `users`
  - `systemPrompt`

**重要注意事项**

- 需要公开 HTTPS webhook；
- bearer token 校验依赖 `audienceType + audience`；
- 更适合作为企业 Google Workspace 内部聊天接入。

---

### 11.5.6 ~~iMessage（legacy）~~

**接入方式**

- 通过 `imsg rpc` 的 stdio JSON-RPC 接入；
- 属于旧方案，文档已经建议新部署改用 BlueBubbles。

**必需配置**

- `cliPath`
- `dbPath`
- 远程场景可配 `remoteHost`

**关键访问控制字段**

- `dmPolicy`
- `allowFrom`
- `groupPolicy`
- `groupAllowFrom`
- `groups.<chat_id>.requireMention`

**重要注意事项**

- 需要 Messages 已登录；
- 需要 Full Disk Access、Automation 等权限；
- 没有稳定的原生 mention 元数据，因此群提及识别主要依赖正则匹配；
- 适合在“历史兼容”语境下说明，不建议作为推荐方案。

---

### 11.5.7 ~~IRC~~

**接入方式**

- 直接连接 IRC 服务器。

**必需配置**

- `host`
- `port`
- `tls`
- `nick`
- `channels`

**关键访问控制字段**

- `dmPolicy`
- `allowFrom`
- `groupPolicy`
- `groupAllowFrom`
- `groups["#channel"]`
- `groups["#channel"].allowFrom`
- `groups["#channel"].requireMention`

**重要注意事项**

- 文档建议启用 `tls: true`；
- `allowFrom` 主要控制 DM，不直接控制频道消息；
- 频道发送者控制依赖 `groupAllowFrom` 或每频道 allowlist；
- NickServ 也可以接入配置。

---

### 11.5.8 ~~LINE~~

**接入方式**

- LINE Messaging API webhook。

**必需配置**

- `channelAccessToken`
- `channelSecret`
- `webhookPath`

**关键访问控制字段**

- `dmPolicy`
- `allowFrom`
- `groupPolicy`
- `groupAllowFrom`
- `groups.<groupId>.allowFrom`

**重要注意事项**

- webhook URL 必须是 HTTPS；
- 支持 `tokenFile`、`secretFile`；
- 多账号模式下，每个账号可有独立的 `webhookPath`；
- 签名校验依赖原始请求体，因此 webhook 接入安全要求较高。

---

### 11.5.9 ~~Matrix~~

**接入方式**

- 作为 Matrix 用户连接 homeserver；
- 可以用 `accessToken`，也可以用 `userId + password` 换 token。

**必需配置**

- `homeserver`
- `accessToken`，或 `userId` + `password`
- 可选 `encryption: true`

**关键访问控制字段**

- 私聊：`dm.policy`、`dm.allowFrom`
- 群房间：`groupPolicy`
- `groups`
- `groupAllowFrom`
- 每房间 `users`
- `groups."*".requireMention`

**重要注意事项**

- 支持 E2EE，但首次接入会有设备验证成本；
- 多账号允许，但环境变量通常只作用于默认账号；
- 用户标识建议用完整 Matrix user ID。

---

### 11.5.10 ~~Mattermost~~

**接入方式**

- Bot Token + WebSocket 事件；
- 可选原生 slash commands。

**必需配置**

- `botToken`
- `baseUrl`

**关键访问控制字段**

- `dmPolicy`
- `allowFrom`
- `groupPolicy`
- `groupAllowFrom`

**重要注意事项**

- 若要启用原生 slash commands，还需配置：
  - `commands.callbackPath`
  - `commands.callbackUrl`
- callback URL 必须从 Mattermost 服务器可达；
- 频道回复行为受 `chatmode` 影响。

---

### 11.5.11 ~~Microsoft Teams~~

**接入方式**

- Bot Framework webhook。

**必需配置**

- `appId`
- `appPassword`
- `tenantId`
- `webhook.port`
- `webhook.path`

**关键访问控制字段**

- `dmPolicy`
- `allowFrom`
- `groupPolicy`
- `groupAllowFrom`
- `teams.<team>.channels.<channel>.requireMention`

**重要注意事项**

- 当前文档已说明它不在核心包内，需要单独安装插件；
- 默认建议群组 fail-closed，即 `groupPolicy: "allowlist"`；
- 如果需要处理文件发送，还需要额外 Graph 相关权限与站点配置。

---

### 11.5.12 ~~Nextcloud Talk~~

**接入方式**

- Nextcloud Talk bot webhook。

**必需配置**

- `baseUrl`
- `botSecret`
- 可选 `apiUser + apiPassword`
- webhook 相关：
  - `webhookPort`
  - `webhookHost`
  - `webhookPath`
  - `webhookPublicUrl`

**关键访问控制字段**

- `dmPolicy`
- `allowFrom`
- `groupPolicy`
- `groupAllowFrom`
- `rooms.<room-token>.requireMention`

**重要注意事项**

- Bot 不能主动发起 DM，只能被用户先联系；
- 若在反向代理后面，通常需要配置 `webhookPublicUrl`；
- 若缺少 `apiUser + apiPassword`，系统可能无法正确区分 DM 和 room。

---

### 11.5.13 ~~Nostr~~

**接入方式**

- 通过 relay（WebSocket）收发 NIP-04 加密私信。

**必需配置**

- `privateKey`
- 可选 `relays`

**关键访问控制字段**

- `dmPolicy`
- `allowFrom`

**重要注意事项**

- 当前文档只覆盖 DM，没有群组配置；
- `privateKey` 支持 `nsec...` 或 hex；
- `allowFrom` 支持 `npub...` 或 hex 公钥。

---

### 11.5.14 ~~Signal~~

**接入方式**

- 通过 `signal-cli` 的 HTTP JSON-RPC + SSE；
- 也支持外部 daemon 模式。

**必需配置**

- `account`
- `cliPath`，或 `httpUrl`

**关键访问控制字段**

- `dmPolicy`
- `allowFrom`
- `groupPolicy`
- `groupAllowFrom`

**重要注意事项**

- 文档强烈建议使用独立 Signal 号码；
- 允许两种接入方式：二维码链接已有账号，或短信/验证码注册独立号码；
- `allowFrom` 既可用手机号，也可用 `uuid:<id>`；
- 支持 `sendReadReceipts`、附件、reactions。

---

### 11.5.15 ~~Synology Chat~~

**接入方式**

- 出站 webhook 收消息，入站 webhook 发回复。

**必需配置**

- `token`
- `incomingUrl`
- `webhookPath`

**关键访问控制字段**

- `dmPolicy`
- `allowedUserIds`

**重要注意事项**

- 这个渠道更偏 direct-message channel；
- 文档推荐默认使用 `dmPolicy: "allowlist"`；
- 若 `allowedUserIds` 为空而策略又要求 allowlist，会被视为配置错误；
- 自签名 NAS 证书场景下才建议启用 `allowInsecureSsl`。

---

### 11.5.16 ~~Slack~~

**接入方式**

- 默认 Socket Mode；
- 也支持 HTTP Events API。

**必需配置**

- Socket 模式：
  - `mode: "socket"`
  - `appToken`
  - `botToken`
- HTTP 模式：
  - `mode: "http"`
  - `botToken`
  - `signingSecret`
  - `webhookPath`
- 可选 `userToken`

**关键访问控制字段**

- 私聊：`dmPolicy`、`allowFrom`
- 群组/频道：`groupPolicy`
- 频道 allowlist：`channels`
- 每频道可进一步配置：
  - `requireMention`
  - `users`
  - `allowBots`
  - `skills`
  - `systemPrompt`
  - `tools`
  - `toolsBySender`
- 群 DM 另有 `dm.groupEnabled`、`dm.groupChannels`

**重要注意事项**

- 多账号 HTTP 模式下，每个账号必须使用独立 `webhookPath`；
- Slack 默认也是 mention-gated 的群聊模型；
- 原生命令自动模式默认不启用。

---

### 11.5.17 ~~Telegram~~

**接入方式**

- 默认长轮询；
- 也支持 webhook；
- 基于 Bot API 接入。

**必需配置**

- `botToken`

**关键访问控制字段**

- `dmPolicy`
- `allowFrom`
- `groupPolicy`
- `groups`
- `groupAllowFrom`
- `groups.<groupId>.requireMention`

**重要注意事项**

- 默认 DM 走 pairing；
- `allowFrom` 与 `groupAllowFrom` 建议使用数字 Telegram user ID；
- 群组控制分两层：允许哪些群、群里允许哪些人；
- 若希望 bot 在群内看到全部消息，Telegram 侧可能还需关闭 Privacy Mode 或赋予管理员权限。

---

### 11.5.18 ~~Tlon~~

**接入方式**

- 连接 Urbit ship。

**必需配置**

- `ship`
- `url`
- `code`
- 推荐 `ownerShip`

**关键访问控制字段**

- `dmAllowlist`
- `defaultAuthorizedShips`
- `authorization.channelRules.<channel>.mode`
- `authorization.channelRules.<channel>.allowedShips`

**重要注意事项**

- 如果 ship URL 位于私网/LAN/localhost，必须显式设置 `allowPrivateNetwork: true`；
- 文档明确说明这会关闭对应 URL 的 SSRF 保护；
- `ownerShip` 会被自动授权，并接收未授权访问通知。

---

### 11.5.19 ~~Twitch~~

**接入方式**

- 通过 IRC 接入 Twitch 聊天。

**必需配置**

- `username`
- `accessToken`
- `clientId`
- `channel`
- 可选：`clientSecret`、`refreshToken`

**关键访问控制字段**

- `allowFrom`
- `allowedRoles`
- `requireMention`

**重要注意事项**

- 文档强烈建议配置 `allowFrom` 或 `allowedRoles`；
- 使用 Twitch Token Generator 生成的 token 通常不能自动刷新，到期需重新生成；
- 多账号场景下每个账号都要各自维护 token。

---

### 11.5.20 WebChat

**接入方式**

- 它不是独立消息平台，而是 Gateway 自带的 WebSocket 聊天入口；
- macOS / iOS 原生聊天 UI，以及控制台聊天页，本质上都通过同一条 Gateway WebSocket 控制链路工作。

**必需配置**

- 没有单独的 `channels.webchat` 或 `webchat.*` 配置块；
- 主要依赖的是 Gateway 全局接入配置，例如：
  - `gateway.port` / `gateway.bind`
  - `gateway.auth.mode`
  - `gateway.auth.token`
  - `gateway.auth.password`
  - 远程接入时的 `gateway.remote.url` / `gateway.remote.token` / `gateway.remote.password`
  - 会话侧相关的 `session.*`

**关键访问控制字段**

- WebChat 不走“渠道专属白名单”模型，而是继承 Gateway 的认证与会话控制；
- 实际聊天调用主要复用：
  - `chat.history`
  - `chat.send`
  - `chat.inject`
- 是否可连接、是否可写入，首先取决于 Gateway 认证是否通过。

**重要注意事项**

- 即使是 loopback / 本机访问，默认也仍然要求 Gateway 认证；
- Gateway 不可达时，WebChat 会退化为只读；
- 它与其他渠道共享同一套会话与路由规则，因此适合被理解为“系统内建聊天前端”，而不是独立渠道后端。

---

### 11.5.21 ~~WhatsApp~~

**接入方式**

- 通过 WhatsApp Web（Baileys）接入；
- 必须通过二维码绑定。

**必需配置 / 接入步骤**

- 常见关键字段：
  - `dmPolicy`
  - `allowFrom`
  - `groupPolicy`
  - `groupAllowFrom`
- 实际登录通常通过：
  - `openclaw channels login --channel whatsapp`

**关键访问控制字段**

- `dmPolicy`
- `allowFrom`
- `groupPolicy`
- `groupAllowFrom`
- `groups`
- `groups.<jid>.requireMention`

**重要注意事项**

- 文档推荐尽量使用独立号码，但也支持个人号码模式；
- 个人号码模式下，onboarding 通常会写入：
  - `dmPolicy: "allowlist"`
  - `allowFrom` 包含本人号码
  - `selfChatMode: true`
- 群消息默认要求 mention；
- quote/reply 只能满足 mention gating，不会绕过 sender allowlist。

---

### 11.5.22 ~~Zalo（Bot API）~~

**接入方式**

- 默认 long-polling；
- 也支持 webhook。

**必需配置**

- `botToken`
- webhook 模式下还需要：
  - `webhookUrl`
  - `webhookSecret`
  - `webhookPath`

**关键访问控制字段**

- `dmPolicy`
- `allowFrom`
- `groupPolicy`
- `groupAllowFrom`

**重要注意事项**

- 文档标注为 experimental；
- `allowFrom` 仅接受数字用户 ID；
- webhook URL 必须是 HTTPS；
- long-polling 与 webhook 两种模式互斥。

---

### 11.5.23 ~~Zalo Personal（`zalouser`）~~

**接入方式**

- 通过二维码登录个人 Zalo 账号；
- 基于内置 `zca-js`。

**必需配置 / 接入步骤**

- 最少通常需要：
  - `enabled: true`
  - `dmPolicy`
- 登录动作通常通过：
  - `openclaw channels login --channel zalouser`

**关键访问控制字段**

- `dmPolicy`
- `allowFrom`
- `groupPolicy`
- `groups`
- `groupAllowFrom`
- `groups.<group>.requireMention`

**重要注意事项**

- 文档明确警告这是非官方集成，存在封号或限制风险；
- `allowFrom` 可接受用户 ID 或名字，但文档更推荐在运行时尽量解析为稳定 ID；
- 群默认 `groupPolicy: "open"`；
- 若 `groupAllowFrom` 未设置，通常会回退到 `allowFrom`。

---

### 11.5.24 渠道配置的管理层总结

从实施和管理角度看，这些 channel 虽然接入方式不同，但都遵循同一套治理框架：

- **接入凭据必须显式配置**；
- **DM、群组、发送者授权三层控制要分开理解**；
- **群聊默认应尽量保持 mention gating 或 allowlist**；
- **多账号渠道要特别注意 webhookPath、token、callback path 的隔离**；
- **推荐把高风险渠道（个人号、非官方集成）与生产主渠道分开说明。**

这也是为什么 OpenClaw 可以把这么多不同平台统一纳入同一个 Gateway 控制平面：

**不是因为这些渠道完全相同，而是因为系统把它们统一抽象成了“凭据 + 路由 + 安全策略 + 运行状态”的可治理模型。**

---

## 12. 核心交互流程四：设备配对、节点能力与 Token 生命周期

这个流程体现的是“终端接入”和“安全治理”的结合。

### 12.1 设备配对的定位

在本系统中，iOS / Android / macOS 等设备不仅是“客户端”，也可能是“能力节点（Node）”。

所谓 Node，可以理解为：

- 能执行设备本地能力；
- 能通过 Gateway 对外声明命令和权限；
- 能被控制台或 Agent 远程调用的终端。

例如节点能力可能包括：

- `canvas.*`
- `camera.*`
- `screen.record`
- `location.get`
- 某些设备本地命令

### 12.2 设备配对链路

#### 第 1 步：设备发起连接/配对

设备通过 WebSocket 接入 Gateway，并带上：

- 设备身份；
- 角色；
- 能力声明；
- 认证信息。

#### 第 2 步：控制台读取配对列表

前端调用：

- `device.pair.list`

得到两个集合：

- `pending`
- `paired`

对应代码：

- [ui/src/ui/controllers/devices.ts](ui/src/ui/controllers/devices.ts)

#### 第 3 步：管理员批准或拒绝

前端可以调用：

- `device.pair.approve`
- `device.pair.reject`

批准后，设备进入可信设备列表；
拒绝后，请求被清理。

#### 第 4 步：设备 Token 生命周期管理

前端还可以进一步管理设备 Token：

- `device.token.rotate`
- `device.token.revoke`

这意味着设备认证不是一次性动作，而是有完整生命周期：

- 初次配对；
- 后续重连；
- Token 轮换；
- Token 吊销。

### 12.3 前端本地设备身份

浏览器端本身也会维护本地设备身份与设备 Token，相关逻辑位于：

- [ui/src/ui/gateway.ts](ui/src/ui/gateway.ts)
- `device-auth.ts`
- `device-identity.ts`

这说明“设备身份”并非只属于移动端，浏览器控制台自身也被纳入设备信任体系中。

### 12.4 这条链路的本质

这条链路的本质是：

**把终端接入从“临时连接”升级成“可治理、可审计、可撤销的受信节点体系”。**

对于领导汇报而言，这非常关键，因为它体现：

- 系统不是任意设备都能接进来；
- 每个设备都有身份、有权限、有 Token 生命周期；
- 接入后的设备可以成为系统能力的一部分。

---

## 13. 核心交互流程五：审批、安全与治理

任何真正落地的 AI 系统，都不能只讲“自动化”，还必须讲“可治理”。

### 13.1 审批队列的意义

当系统中某些动作需要人工确认时，Gateway 会把这些请求纳入审批队列。

前端会展示：

- 当前待审批项目；
- 已处理结果；
- 审批错误状态。

相关状态在 [ui/src/ui/app-gateway.ts](ui/src/ui/app-gateway.ts) 中可以看到，例如：

- `execApprovalQueue`
- `execApprovalError`

### 13.2 审批链路

1. 某个执行请求进入待审批状态；
2. Gateway 广播审批相关事件；
3. Control UI 接收事件并更新审批列表；
4. 管理员在控制台批准或拒绝；
5. Gateway 根据结果继续执行或中止执行；
6. 结果回写到前端与相关运行上下文。

### 13.3 安全治理不止审批

从代码和架构文档看，安全治理还包括：

- 角色与 scope 校验；
- 本地设备与远程设备的不同信任策略；
- HTTP / WS 认证；
- 控制面写操作限流；
- Hook / Webhook 认证失败限流；
- readiness 细节只对本地或已认证请求暴露；
- Token / password / device identity 共同参与连接安全。

### 13.4 管理层可以如何理解

可以把这一层理解为：

**系统不是“一个能自动做事的 AI”，而是“一个可控、可审计、可授权的 AI 控制平台”。**

---

## 14. 运行观察面：health、ready、logs、debug、nodes、usage、sessions、agents、skills、cron

这部分体现的是系统已经具备“可运营”特征，而不是只有功能。

### 14.1 健康检查

在 [src/gateway/server-http.ts](src/gateway/server-http.ts) 中，Gateway 提供：

- `/health`
- `/healthz`
- `/ready`
- `/readyz`

它们的作用分别偏向：

- 存活检查；
- 就绪检查。

而且就绪检查的详细信息并不是对所有请求都开放，只有：

- 本地直连请求；或
- 已认证请求

才可能看到更完整的 readiness 细节。

这体现了系统对“运维可见性”和“安全暴露边界”的兼顾。

### 14.2 控制台观察面

控制台中的以下页面，本质上都是 Gateway 运行态的管理视图：

| 页面 | 作用 |
|---|---|
| overview | 总览信息 |
| sessions | 会话管理与历史状态 |
| usage | 使用量与运行统计 |
| cron | 定时任务与运行记录 |
| nodes | 节点在线状态与能力 |
| agents | Agent 清单与相关能力 |
| skills | 技能能力视图 |
| config | 配置读取/编辑/应用 |
| debug | 调试观察面 |
| logs | 日志流观察 |
| channels | 各渠道运行状态 |

### 14.3 事件与轮询结合

系统并没有要求所有观察面都完全走事件。

根据 [ui/src/ui/app-lifecycle.ts](ui/src/ui/app-lifecycle.ts)，前端会对部分页面启动轮询，例如：

- nodes
- logs
- debug

这表明设计上做了分层：

- 对适合流式推送的状态，走 event；
- 对适合按页观察的状态，走 polling；
- 对一次性读取的状态，走 RPC 查询。

这是比较成熟的控制台设计思路。

---

## 15. 对外接口分类：HTTP 入口与 WS 方法族

### 15.1 HTTP 入口分类

从 [src/gateway/server-http.ts](src/gateway/server-http.ts) 可以归纳出，Gateway 的 HTTP 入口大致分为六类：

#### A. 系统探针

- `/health`
- `/healthz`
- `/ready`
- `/readyz`

#### B. Control UI 相关

- 静态资源
- avatar 资源
- `/__openclaw/control-ui-config.json`

#### C. 第三方集成 / 插件路由

- plugin routes
- ~~Slack HTTP 入口~~
- ~~Mattermost slash command callback~~
- tools invoke HTTP 入口

#### D. 自动化入口

- hooks
- webhooks

#### E. 兼容 AI API

- `/v1/chat/completions`
- `/v1/responses`

#### F. 其他扩展面

- canvas / A2UI 相关 HTTP 入口

### 15.2 WebSocket 方法族分类

从管理视角看，WS 方法可以按业务归类，而不是按代码文件归类。

| 分类 | 代表方法 |
|---|---|
| 连接与基础健康 | `connect`、`health`、`logs` |
| 聊天与会话 | `chat.*`、`sessions.*`、`usage.*` |
| 渠道与消息发送 | `channels.*`、`web.*`、`send.*`、`push.*` |
| 配置与系统控制 | `config.*`、`update.*`、`system.*` |
| 自动化与计划任务 | `cron.*`、`wizard.*` |
| 设备与节点 | `devices.*`、`nodes.*`、`browser.*`、`tts.*`、`talk.*` |
| Agent 能力 | `agent.*`、`agents.*`、`skills.*`、`tools-catalog.*` |
| 安全治理 | `exec-approvals.*` |

### 15.3 为什么这种划分重要

因为它说明这套系统不是“围绕一个功能做 API”，而是“围绕一个控制平面做协议域划分”。

这意味着后续扩展新入口、新节点、新渠道时，不必推翻架构，只需在现有控制面下扩展新的能力域。

---

## 16. 典型业务闭环示例（管理层视角）

为了便于向领导讲解，可以把系统理解为三条最典型的闭环。

### 16.1 闭环一：从控制台发起聊天到结果回流

```text
用户在 Control UI 输入消息
  → 前端发 chat.send
  → Gateway 接管会话与路由
  → Agent Runtime 执行
  → 工具/流式/最终结果通过 event 回流
  → 前端实时展示
```

这条闭环说明：

- 前端是控制入口；
- Gateway 是运行调度中心；
- Agent 是执行者；
- 结果通过统一事件链路返回。

### 16.2 闭环二：从配置修改到系统生效

```text
管理员进入 config 页面
  → 前端读取 schema + 当前配置
  → 用户修改并提交 config.set / config.apply
  → Gateway 校验并应用配置
  → 相关子系统重载/刷新
  → 前端重新读取状态
```

这条闭环说明：

- Control UI 不直接改系统，只是发起控制动作；
- 真正的配置变更、校验、生效都在 Gateway 中完成。

### 16.3 闭环三：从设备接入到节点能力执行

```text
设备通过 WS 接入 Gateway
  → 进入 device pairing 流程
  → 管理员批准
  → 设备获得受信 Token / 身份
  → 节点上报能力
  → 后续命令由 Gateway 路由到该节点执行
```

这条闭环说明：

- 终端不是散落在外的客户端，而是系统能力的一部分；
- 设备接入是可治理、可控制、可撤销的。

### 16.4 闭环四：从外部系统调用到内部 Agent 执行

```text
外部系统通过 webhook 或 OpenAI-compatible API 调用 Gateway
  → Gateway 做认证、解析、规范化
  → 转入内部 agent runtime
  → 结果以 HTTP 返回或继续回流到系统内其他入口
```

这条闭环说明：

- OpenClaw 不只是给人用，也可以作为外部系统接入的 AI 控制中台。

---

## 17. 为什么说前端和后端是强耦合协同，而不是普通前后端分离

从现代 Web 架构术语看，这个项目当然也存在“前端”和“后端”。

但如果简单地把它理解为“React/Vue 前端 + REST 后端”，会产生误判。

更准确的描述是：

### 17.1 前端和后端围绕统一协议协同

前端与后端共享的是一套控制面协议：

- 先经由 HTTP bootstrap 建立上下文；
- 再通过 WebSocket 长连接进入主控制链路；
- 再通过事件与轮询共同维持页面状态。

### 17.2 前端不是业务自治体

前端没有独立业务数据库，也不持有最终业务事实；
它主要负责：

- 让人可视化地观察系统；
- 发起控制动作；
- 接收 Gateway 回来的状态与事件。

### 17.3 后端也不是传统 CRUD 后台

后端不是只提供增删改查 API，而是一个：

- 有状态的；
- 长连接驱动的；
- 兼具控制、调度、路由、治理、观察能力的系统控制平面。

所以在汇报里，建议不要说“前后端分离项目”，而应说：

**这是一个以 Gateway 为中枢、前端控制台为操作入口的实时控制平台。**

---

## 18. 关键文件索引（汇报或继续深挖时建议优先阅读）

### 18.1 后端核心

- [src/gateway/server.impl.ts](src/gateway/server.impl.ts)：Gateway 装配入口
- [src/gateway/server-http.ts](src/gateway/server-http.ts)：HTTP 暴露面总入口
- [src/gateway/server-methods.ts](src/gateway/server-methods.ts)：WS 方法域聚合
- [src/gateway/server-channels.ts](src/gateway/server-channels.ts)：渠道运行时管理
- [src/gateway/server-cron.ts](src/gateway/server-cron.ts)：定时任务/自动化服务
- [src/gateway/control-ui-contract.ts](src/gateway/control-ui-contract.ts)：控制台 bootstrap 配置契约

### 18.2 前端核心

- [ui/src/ui/app-lifecycle.ts](ui/src/ui/app-lifecycle.ts)：页面启动/销毁/轮询生命周期
- [ui/src/ui/app-gateway.ts](ui/src/ui/app-gateway.ts)：Gateway 连接与事件处理
- [ui/src/ui/gateway.ts](ui/src/ui/gateway.ts)：浏览器 WS 客户端与鉴权
- [ui/src/ui/navigation.ts](ui/src/ui/navigation.ts)：控制台页面结构
- [ui/src/ui/controllers/chat.ts](ui/src/ui/controllers/chat.ts)：聊天主链路
- [ui/src/ui/controllers/config.ts](ui/src/ui/controllers/config.ts)：配置主链路
- [ui/src/ui/controllers/channels.ts](ui/src/ui/controllers/channels.ts)：渠道主链路
- [ui/src/ui/controllers/devices.ts](ui/src/ui/controllers/devices.ts)：设备/配对主链路

### 18.3 架构说明文档

- [docs/concepts/architecture.md](docs/concepts/architecture.md)：Gateway 架构总览

---

## 19. 给领导汇报时可以直接使用的结论

如果要用最简洁的方式对外说明这个项目，可以直接使用下面这段话：

> 这不是一个普通聊天机器人项目，而是一套个人 AI 助手控制平台。
> 它以 Gateway 作为唯一控制平面，把网页控制台、CLI、消息渠道、移动设备、桌面设备、Webhook 和兼容 API 全部统一接入。
> 前端负责展示与控制，后端负责鉴权、路由、执行、状态管理和事件广播。
> 聊天、配置、渠道接入、设备配对、审批治理、运维观察都通过同一套控制体系完成，因此它具备持续运行、统一治理和多端协同的能力。

---

## 20. 总结

这份项目说明最重要的结论有五点：

1. **Gateway 是整套系统的控制平面。**
2. **Control UI 是操作入口，不是业务事实来源。**
3. **系统核心交互依赖 HTTP bootstrap + WebSocket 控制链路 + event 回流 + polling 补充。**
4. **聊天、配置、渠道、设备、审批、运维都不是孤立功能，而是统一控制面下的业务域。**
5. **这个项目真正的价值，不是“接了很多功能”，而是“把多入口、多能力、多终端统一成一个可控的个人 AI 平台”。**

如果后续需要继续补充，还可以在这份 README 基础上再扩展两类材料：

- 面向研发的“代码导读版”；
- 面向汇报的“架构图 / 流程图精简版”。
