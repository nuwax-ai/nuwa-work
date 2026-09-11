# Nuwax — 女娲Nuwax 商业版 Electron 客户端（仓库 [nuwa-work](https://github.com/nuwax-ai/nuwa-work)）

**Nuwax（女娲Nuwax）是商业产品壳**——功能模块在基座仓 [nuwa-electron-shell](https://github.com/nuwax-ai/nuwa-electron-shell)，
本仓注入商业身份并发布；本身是干净的 Electron 项目格式（无 Rust / 无 monorepo 包装）：

```
nuwa-work/（main = 商业产品壳）
├── nuwa-electron-shell/   # submodule → 基座仓 nuwax-ai/nuwa-electron-shell 的 main 分支
│               #   （产品中立功能模块：agent-electron-client + agent-kit + gui-server）
├── nuwax/                 # submodule → nuwax 前端（feat-dong.0930，dist 随仓提交；
│               #   商业前端 pin，pin/nuwawork 分支承载——基座瘦身后 dist 唯一来源；
│               #   与线上 PC web 同源同仓，术语区分见下节）
├── overlay/               # 商业自有代码（整文件覆写进基座工作树，见下「overlay/」）
├── scripts/               # in-base.js（基座内执行+商业 env 注入）+ sync-overlay.js
├── .github/workflows/     # 发布编排（release / sync，构建在基座内执行）
├── release-notes/  docs/
└── package.json

商业开发线 = 基座仓 nuwa-electron-shell 的 main 分支（产品中立，服务 nuwa-cli /
nuwaclaw / Nuwax 三方）；本仓差异 = 4 个构建期注入 env（语义见基座 README
「注入契约」）+ overlay/ 商业自有代码 + 商业前端 pin。

> 2026-09-09 三层架构定型：基座仓（nuwa-electron-shell，公开）承载功能模块；
> 社区产品壳（默认身份）与商业产品壳本仓（注入身份）各自经 submodule pin
> 引用基座、独立发布。此前的自引用 / base 分支双线模型废弃。
> 2026-09-09 起：商业专属实现（nuwax 前端本地化承载 / 登录桥等）自基座迁入
> 本仓 overlay/，基座回归产品中立；壳↔nuwax 通信桥已支持宿主身份区分
> （x-client-type 与桥 host.getProduct() 随注入标识派生）。
```

## 术语区分：Nuwax 客户端 vs nuwax 前端（同名不同物）

品牌统一后两者都叫 "nuwax"，但指代完全不同的东西，读代码/沟通时按下表区分：

| | **Nuwax 客户端**（＝**商业版**；本仓产品） | **nuwax 前端**（仓库 [nuwax-ai/nuwax](https://github.com/nuwax-ai/nuwax)，包名 `nuwax-frontend`） |
|---|---|---|
| 是什么 | Electron 桌面应用——「壳」 | React/UMI web 应用——业务 UI 本体 |
| 仓库 | **本仓 nuwa-work**（基座 submodule + overlay 注入身份） | 同一前端仓的三个落位：独立检出 `workspace/nuwax`（mac dev 用）、壳根 `nuwax/` submodule（CI 打包 pin，feat-dong.0930 线）、线上部署（PC web） |
| 职责 | 窗口/webview 容器 + 桌面能力：登录态桥（token 持久化/起停服务联动）、本地化承载 loopbackGateway、沙箱、文件服务、引擎管理、自动更新 | 工作台/会话/资料库等全部页面逻辑 |
| 运行形态 | 安装包分发：productName=`Nuwax`、identifier=`nuwax`、appId=`com.nuwax-ai.nuwax`、数据目录 `~/.nuwax` | ① 浏览器直接访问（PC web，无桥自动降级为通用逻辑）；② 客户端窗口内 webview——经壳根 submodule 的 dist 打包为 `resources/nuwax-dist` 本地伺服（本地化加速），或直连线上 |
| 对外身份 | 注入的 identifier `nuwax` = **宿主产品 id**：`x-client-type` 请求头、桥 `getProduct()` 返回值都表示「请求/页面来自 Nuwax 客户端壳」（后端凭此发登录 token） | 用 `getProduct()`/`isNuwaClaw()` 识别自己跑在哪个宿主（nuwax 客户端 / nuwaclaw 社区壳 / 浏览器），据此开关桌面专属能力或降级 |

速记：**「Nuwax 客户端」在文档与对话中也称「商业版」**（相对社区版 NuwaClaw；下文「与社区版的隔离」等处的「商业版」均指它）。代码与请求里作为宿主标识出现的 `nuwax`（x-client-type / HostProductId / getProduct）指的是「Nuwax 客户端这个宿主」；作为仓库名/包名/路径/分支出现的 `nuwax` 指的是前端项目。社区语境的 `nuwaclaw` 同理指社区版宿主。

## 与社区版 / nuwa-cli 的隔离（同机双开互不干扰）

| 维度 | 社区版 nuwaclaw | 商业版 Nuwax（本仓） |
|---|---|---|
| appId / bundle id | com.nuwax-ai.nuwaclaw | **com.nuwax-ai.nuwax**（CI 构建时 npm pkg set，尾段与注入 identifier 一致） |
| 产物名前缀 | NuwaClaw | **Nuwax**（客户端展示名同为 ASCII Nuwax：UA token=Nuwax/\<ver\>、设置「关于」、CFBundleDisplayName；营销名 女娲Nuwax 只在 README 与发布文案） |
| 数据目录 | ~/.nuwaclaw | **~/.nuwax**（历史目录迁移链已被 overlay 覆写 migrate.ts 阻断，全新开始、不动 ~/.nuwaclaw） |
| 默认端口 | 18099 / 60002~60009 / 60173 | **整体 +1000**：19099 / 61002~61009 / 61173（`NUWAX_PORT_OFFSET=1000` 构建期注入；nuwa-cli 占 60015/60016/10076，三方错开） |
| 更新通道（OSS/MinIO） | nuwaclaw-electron/ | **nuwax-electron/** |
| 证书 | Certum SimplySign（Windows 手签）+ Apple Developer ID（CI 签+公证） | 同一张证书（共用，SmartScreen/公证信誉共享） |

品牌与端口全部为**构建期注入**（`NUWAX_APP_IDENTIFIER/DISPLAY_NAME/UPDATE_FEED_BASE/
PORT_OFFSET` 经 esbuild/vite define 固化，机制在基座 `constants.ts`，不注入=社区版行为），
因此基座可同时服务两版，公共改动双向同步。

## 本地开发（fresh clone）

```bash
git clone https://github.com/nuwax-ai/nuwa-work.git && cd nuwa-work
git submodule update --init nuwa-electron-shell          # 基座仓 nuwa-electron-shell main 分支（公开）
git submodule update --init nuwax                        # 壳根 nuwax 前端（dist 随仓提交，无需构建）
git -C nuwa-electron-shell submodule update --init nuwax # 过渡期：基座内嵌 nuwax（基座瘦身后移除）
npm run base:install   # 基座内 pnpm install --filter（自动构建 agent-kit + 前置 overlay 同步）
npm run base:dev       # 基座 make electron-dev（前置 overlay 同步 + 注入商业 env）
npm run base:test      # 全量 vitest（--no-inject：社区基线=干净基座源码，exit=0）

# 测试/运行前还需准备型资源（gitignore，fresh clone 必做）：
cd nuwa-electron-shell/crates/agent-electron-client && npm run prepare:mcp-proxy
# 完整资源（node/git/uv/nuwaxcode/ripgrep 等）用基座根 Makefile：make electron-prepare
```

Windows 沙箱 helper（基座内唯一 Rust 工程 windows-sandbox-helper）由基座
`prepare:all` 在 Windows 宿主 cargo 构建；本壳不携带任何 Rust。

## 与基座 / 社区版的同步

- **基座升级**：功能改动在 nuwa-electron-shell 提交；本壳发版前 bump submodule
  pin（`git -C nuwa-electron-shell fetch origin && git -C nuwa-electron-shell checkout <sha>` →
  外层提交 pin bump），并跑 `npm run overlay:check` 核对覆写文件与新版基座的差异。
- **社区版**：社区产品壳（默认身份、通道 nuwaclaw-electron）与商业版同源基座、
  各自独立发布，互不影响。
- **壳根 nuwax pin 维护**：bump 本仓 `nuwax/` gitlink 后，须同步快进 nuwax 仓的
  `pin/nuwawork` 分支到同一提交（CI 匿名拉取依赖它；基座瘦身后仅剩壳根一处）。

## 发版流程

1. **准备**：`release-notes/electron-v{x.y.z}.md`（缺省用默认文案）。
2. **构建**：`git tag electron-v{x.y.z} && git push origin electron-v{x.y.z}`
   → `release-electron.yml`：checkout 壳 + 两层 submodule init（nuwa-electron-shell→nuwax），
   基座内 install/prepare/dist，注入商业品牌与端口；macOS 自动签名+公证，
   Windows 出 unsigned 包（CI 显式校验沙箱 helper 产物存在）。
3. **Windows 人工签名**：见 [docs/sign-windows.md](./docs/sign-windows.md)
   （Certum SimplySign Desktop + 基座内 `npm run sign:win`）。
4. **同步 OSS**：`npm run sync:oss`（基座内脚本，stable 强校验已签名 EXE）。

beta 通道：`prerelease-v{x.y.z}` tag（Draft Release，unsigned Windows 包可直接同步 beta 指针）。

## 首次启用清单（人工操作）

- [ ] GitHub Settings → Secrets（与社区版同值，共用证书）：`GH_PAT`（可选：
      Release 创建/资产上传兜底；submodule 已指向公开仓，github.token 即可拉取）；
      `APPLE_TEAM_ID` / `APPLE_SIGNING_IDENTITY` / `APPLE_CERTIFICATE` /
      `APPLE_CERTIFICATE_PASSWORD` / `APPLE_API_KEY` / `APPLE_API_KEY_ID` /
      `APPLE_ISSUER_ID`；`MINIO_ACCESS_KEY_ID` / `MINIO_SECRET_ACCESS_KEY`；
      `OSS_ACCESS_KEY_ID` / `OSS_ACCESS_KEY_SECRET`
- [ ] 打首个 `prerelease-v*` tag 验证构建链路（两层 submodule、品牌/端口注入、产物名）；
      平时可用 `ci-smoke.yml`（workflow_dispatch）快速回归 submodule 链路
- [ ] Windows 签名机按 docs/sign-windows.md 完成一次 sign:win 演练
- [ ] 验证 OSS `nuwax-electron/` 指针与社区版 `nuwaclaw-electron/` 互不影响

## overlay/ —— 商业自有代码（文件覆写机制）

商业专属实现不进基座（基座产品中立，服务 nuwa-cli / nuwaclaw / Nuwax 三方），
放在 `overlay/` 下按基座相对路径组织，构建/开发前由 `scripts/sync-overlay.js`
整文件覆写进基座工作树（`base:*` 与 CI 已自动前置同步；`--check` 干跑核对、
`--clean` 还原）。机制与纪律详见 [overlay/README.md](./overlay/README.md)。
