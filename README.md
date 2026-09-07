# nuwa-work — 女娲 Nuwax 商业版 Electron 客户端

**nuwa-work 是 nuwaclaw（社区开源版）的基座薄壳 + 商业发布仓**，本身是干净的
Electron 项目格式（无 Rust / 无 monorepo 包装）：

```
nuwa-work/（main = 壳，私有仓）
├── nuwaclaw/   # submodule → 本仓 base 分支（nuwaclaw 全部业务与构建系统，
│               #   = nuwaclaw 社区 main 历史 + 1.0 全量功能 + 基座改造）
├── scripts/in-base.js   # 在基座内执行命令并注入商业 env（dev/test/bundle 快捷入口）
├── .github/workflows/   # 发布编排（release / sync，构建在基座内执行）
├── release-notes/  docs/  overlay/
└── package.json

本仓 base 分支 = 商业开发线：nuwaclaw 社区 main(811009627) 历史 + 108 个 1.0 提交
（v2 会话渲染器/本地目录/侧栏折叠/nuwax 集成等）+ 基座改造。1.0 全量历史另存
archive/electron-client-1.0 分支。社区开源版在公开仓
[nuwax-ai/nuwaclaw](https://github.com/nuwax-ai/nuwaclaw) 的 main 独立演进。
```

## 与社区版 / nuwa-cli 的隔离（同机双开互不干扰）

| 维度 | 社区版 nuwaclaw | 商业版 nuwa-work（本仓） |
|---|---|---|
| appId / bundle id | com.nuwax-ai.nuwaclaw | **com.nuwax-ai.nuwa-work**（CI 构建时 npm pkg set） |
| 产物名前缀 | NuwaClaw | **女娲 Nuwax** |
| 数据目录 | ~/.nuwaclaw | **~/.nuwawork**（首启自动从 ~/.nuwaclaw 一次性迁移） |
| 默认端口 | 18099 / 60002~60009 / 60173 | **整体 +1000**：19099 / 61002~61009 / 61173（`NUWAX_PORT_OFFSET=1000` 构建期注入；nuwa-cli 占 60015/60016/10076，三方错开） |
| 更新通道（OSS/MinIO） | nuwaclaw-electron/ | **nuwa-work-electron/** |
| 证书 | Certum SimplySign（Windows 手签）+ Apple Developer ID（CI 签+公证） | 同一张证书（共用，SmartScreen/公证信誉共享） |

品牌与端口全部为**构建期注入**（`NUWAX_APP_IDENTIFIER/DISPLAY_NAME/UPDATE_FEED_BASE/
PORT_OFFSET` 经 esbuild/vite define 固化，机制在基座 `constants.ts`，不注入=社区版行为），
因此基座可同时服务两版，公共改动双向同步。

## 本地开发（fresh clone）

```bash
git clone https://github.com/nuwax-ai/nuwa-work.git && cd nuwa-work
git submodule update --init nuwaclaw          # 自引用私仓（需权限）；勿用 --recursive（base 树有 vcpkg 孤儿 gitlink）
git -C nuwaclaw submodule update --init nuwax # nuwax 前端（dist 随仓提交，无需构建）
npm run base:install   # 基座内 pnpm install --filter（自动构建 agent-kit）
npm run base:dev       # 基座 make electron-dev（已注入商业 env）
npm run base:test      # 全量 vitest（--no-inject：测试基线=社区默认值，基线 exit=0 / 1282 用例）

# 测试/运行前还需准备型资源（gitignore，fresh clone 必做）：
cd nuwaclaw/crates/agent-electron-client && npm run prepare:mcp-proxy
# 完整资源（node/git/uv/nuwaxcode/ripgrep 等）用基座根 Makefile：make electron-prepare
```

Windows 沙箱 helper（基座内唯一 Rust 工程 windows-sandbox-helper）由基座
`prepare:all` 在 Windows 宿主 cargo 构建；本壳不携带任何 Rust。

## 与社区版 / 历史线的同步

- **社区 → 商业（单向）**：`git checkout base && git remote add nuwaclaw
  https://github.com/nuwax-ai/nuwaclaw.git`（一次性），之后定期
  `git fetch nuwaclaw && git merge nuwaclaw/main`，再 bump 壳的 submodule pin。
- **1.0 历史回溯**：`archive/electron-client-1.0` 分支与 base 历史都在本仓，
  `git log` / `git cherry-pick <SHA>` 直接用。
- 商业功能不回流社区仓。

## 发版流程

1. **准备**：`release-notes/electron-v{x.y.z}.md`（缺省用默认文案）。
2. **构建**：`git tag electron-v{x.y.z} && git push origin electron-v{x.y.z}`
   → `release-electron.yml`：checkout 壳 + 两层 submodule init（nuwaclaw→nuwax），
   基座内 install/prepare/dist，注入商业品牌与端口；macOS 自动签名+公证，
   Windows 出 unsigned 包（CI 显式校验沙箱 helper 产物存在）。
3. **Windows 人工签名**：见 [docs/sign-windows.md](./docs/sign-windows.md)
   （Certum SimplySign Desktop + 基座内 `npm run sign:win`）。
4. **同步 OSS**：`npm run sync:oss`（基座内脚本，stable 强校验已签名 EXE）。

beta 通道：`prerelease-v{x.y.z}` tag（Draft Release，unsigned Windows 包可直接同步 beta 指针）。

## 首次启用清单（人工操作）

- [ ] GitHub Settings → Secrets（与社区版同值，共用证书）：`GH_PAT`；
      `APPLE_TEAM_ID` / `APPLE_SIGNING_IDENTITY` / `APPLE_CERTIFICATE` /
      `APPLE_CERTIFICATE_PASSWORD` / `APPLE_API_KEY` / `APPLE_API_KEY_ID` /
      `APPLE_ISSUER_ID`；`MINIO_ACCESS_KEY_ID` / `MINIO_SECRET_ACCESS_KEY`；
      `OSS_ACCESS_KEY_ID` / `OSS_ACCESS_KEY_SECRET`
- [ ] 打首个 `prerelease-v*` tag 验证构建链路（两层 submodule、品牌/端口注入、产物名）
- [ ] Windows 签名机按 docs/sign-windows.md 完成一次 sign:win 演练
- [ ] 验证 OSS `nuwa-work-electron/` 指针与社区版 `nuwaclaw-electron/` 互不影响

## overlay/

商业自有代码的预留落位（当前为空）。可放：壳层启动参数、商业专属 preload/webview
注入、发布期资产替换等；涉及基座深层改动的功能仍以 base 分支提交实现。
