# 实施计划：start-all-login-gate（Start All「请先登录」误报修复）

- 对应 spec：无（bug 修复，诊断证据见本文件「根因」节）
- 状态：已接受（2026-09-11 plan mode 访谈产出，用户选定「门禁对齐 webview + 放行启动 + 登录闭环同修」口径）

## 根因

两套登录口径分叉：

| 口径 | 判据 | 用途 |
|---|---|---|
| A（Account Status 绿勾） | `nuwax.accessToken.<origin>` 存在（主进程 `nuwax:authChanged` 推送） | UI 显示 |
| B（Start All 门禁） | `auth.config_key` 存在（仅 reg 成功写入，auth.ts:351） | ClientPage.tsx:368 拦截 |

本机日志实锤（~/.nuwax/logs/main.2026-09-11.log）：17:13:49 `auth:clear` 登出 → 17:14:32 webview 重登（token 回来 → 绿勾）→ 之后 reg 全部被后端拒绝 `Dynamic authentication code or password cannot be empty`（首登注册后端未放开 Bearer，已知缺口）→ `config_key` 落不回去 → B 口径拦截误报「请先登录」。

## 改动文件清单

| # | 文件 | 动作 | 说明 |
|---|---|---|---|
| 1 | nuwa-electron-shell/crates/agent-electron-client/src/renderer/components/pages/ClientPage.tsx | 改 | ① handleStartAll 门禁 `!authState.isLoggedIn && !isWebviewLoggedIn`；② syncConfigToServer 返回 null 时 warning(regSyncFailed)；③ lanproxy 分支 isWebviewLoggedIn 时用 proxyConfigMissing |
| 2 | nuwa-electron-shell/crates/agent-electron-client/src/renderer/App.tsx | 改 | restartAllServices 捕获 syncConfigToServer 返回值，null 且 isAuthLoggedIn（ref）→ 同款 warning |
| 3 | nuwa-electron-shell/crates/agent-electron-client/src/shared/locales/zh-CN.json | 改 | 新增 Claw.Client.regSyncFailed / proxyConfigMissing |
| 4 | nuwa-electron-shell/crates/agent-electron-client/src/shared/locales/en-US.json | 改 | 同上（英文） |

## 实施顺序

1. locales → ClientPage → App（无相互依赖冲突，单 worktree 顺序改）。
2. 验证：壳 renderer typecheck/build + `npm run base:test`；运行态冒烟 `NUWAX_APP_IDENTIFIER=nuwax npm run dev`（本机当前即复现态：token 在、config_key 空）。点 Start All → 不误报 + 注册失败 warning + mcp/agent/file/terminal 启动 + lanproxy 配置缺失提示；webview 登出→重登 → 登录闭环同款 warning。

## 边界（明确不动）

- `getCurrentAuth().isLoggedIn`（config_key 口径）保持——AutoReconnect savedKey 分支靠它判「未登出」。
- AutoReconnect「reg 失败不起服务」保守行为保持（自动场景避免半启动，本次只修用户显式点击路径）。
- 后端首登注册放开（Bearer 鉴权）为后端侧依赖，另行跟进。

## 证明成立的测试

- 新增测试：无（UI 提示行为，以运行态冒烟为验收）。
- 回归范围：`npm run base:test`。

## 风险与回退

| 风险 | 缓解 | 回退方式 |
|---|---|---|
| 放行后「半启动」（reg 失败时 lanproxy 起不来） | lanproxy 已有优雅失败分支；新 warning 明示「代理服务暂无法启动」 | revert 单提交 |
| restartAllServices 空依赖闭包读到过期 isAuthLoggedIn | 沿用文件内既有 ref 模式（restartAllServicesRef 同款）新增 isAuthLoggedInRef | revert 单提交 |

## 偏离记录

- 2026-09-11 晚追加（同 commit 落基座）：冒烟中发现代理服务仍无法由应用自身拉起，对拍定位到**第二根因**——`getSavedKey`（auth.ts:78）在 domain+username 齐备时只查域名级键 `auth.saved_keys.<host>_<username>`（登出已被清）且**不回落全局 `auth.saved_key`**，导致 reg body 带不上 savedKey、后端报「动态认证码或密码不能为空」（curl 对拍实证：带/不带 Bearer 均非问题，savedKey 在 body 即成功）。修复=域名级键未命中时回落全局键（与 setSavedKey 的双写对称）。该修复使 quickInit 种子机（只写全局键）在 username 已存续时同样恢复注册能力。
