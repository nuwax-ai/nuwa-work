# 实施计划：login-sync-audit-fixes（登录同步/启动链路审查修复）

- 对应 spec：无（缺陷修复，根因与证据见本文件「审查结论」节）
- 状态：已实施（2026-09-12 plan mode 审查产出 → 用户批准「拉一个分支来搞」）
- 分支：基座 `feat/electron-1.0.4-fixes`（起点 pin `4ad8f742`）+ 外层 `feat/electron-1.0.4-fixes`（起点 `main`）

## 审查结论（用户提出的 7 项关切）

| # | 关切 | 审查结论 |
|---|---|---|
| 1 | 壳子接口能否正常调用 | ✅ 通。`auth.*` / `native.*` / theme / layout 全部有实现，与 `nuwax/src/types/global.d.ts` 声明逐项对齐，无缺失 handler |
| 2 | 服务能否启动 + 与登录态联动起停 | ✅ 可用。登录 `persistToken` → `nuwax:login-confirmed` → renderer `reg+restartAll`；登出 `auth:clear` → `await stopAllServicesNow()`。注意 ComputerServer/ttyd/沙箱在**启动时无条件**拉起（`bootstrap/startup.ts:42/60/98`），登出虽会停掉但重启又起——起停非严格对称（有意，未改） |
| 3 | 登录态是否独立于 nuwaclaw | ⚠️ 隔离成立但有 2 处泄漏，见下 |
| 4 | 上传/下载/另存图片 | ⚠️ 主链路通（网关流式反代），4 处脆弱已修 3 处 |
| 5 | 首次安装初始化 | ✅ 可用；无网时静默降级（deps 三级来源：bundled > npm 兜底 > OSS 仅 nuwaxcode） |
| 6 | 切换域名（企业登录） | ⚠️ 能用但有 2 处竞态/残留，已修 |
| 7 | 启动动画可靠 + 最少展示时间 | ❌ **最少展示时间原本完全没实现**，另有图标破图；已修 |

## 根因（本次修复的缺陷）

| 严重度 | 缺陷 | 根因 |
|---|---|---|
| 高 | 沙箱工作区硬编码 `~/.nuwaclaw/sandboxes` | `serviceBootstrap.ts:57` 绕过 `APP_DATA_DIR_NAME`，商业版把沙箱工作区写进社区版数据目录 |
| 高 | 启动 loading 无最少展示时间 | 三个 loading 分支全部纯事件驱动，`App.tsx` 内 `setTimeout` 计数为 0；快机器上一闪而过 |
| 高 | 加载图标绝对路径打包破图 | `src="/icon.png"`（App/NuwaxHostWebview 三处）被原样烤进 JS bundle，生产走 `loadFile` 且无 protocol shim → `file:///icon.png`。`a62e2802`（启动大 loading）重新引入，`AboutPage.tsx:476` 早已修为 `./icon.png` |
| 中 | 换域不清旧凭据 | `configureServerHost` 只写 `step1_config.serverHost`，残留 `auth.config_key`（Start All 门禁判据）→ 按钮仍开放；残留 `auth.saved_key` → lanproxy 拿旧域 key 连旧域；残留 `lanproxy.server_host/port` → 隧道指向旧域 |
| 中 | 换域停服务未 await | `void stopAllServicesNow()` 与 webview 重载竞态 |
| 中 | file-server 端口回退两套值 | `App.tsx` 写死 `60000`（社区默认）vs `DEFAULT_FILE_SERVER_PORT`（商业 61005）→ 自动重连路径起错端口，前端按 61005 找不到 → 上传失败 |
| 中 | `native:saveImage` 拒绝相对 URL | 守卫要求 `^https?://`，但前端直接传 `<img src>`（markdown 常见相对地址）→ 硬失败；且整图进内存 + 同步写盘 |
| 中 | splash 卡死无重试 | `isSetupCompleted()` / `dependencies.checkAll()` 无超时，主进程 handler 卡住则永久停 loading，且无重试入口 |
| 低 | file-server npm 兜底版本 1.4.3 ≠ bundled 1.4.4 | 注释声明「须一致」但已破；npm 已发布 1.4.4（已核） |
| 低 | 桥内死导入 + 过期注释 | `restartAllServicesNow` / `isAnyCoreServiceRunning` 从未调用；头注仍称主进程起服务 |
| 低 | `localFiles:pickDirectory` 死桥 | 前端 0 调用（工作目录需求已回滚），保留但加注 |

## 改动文件清单

### 基座文件（提交进基座分支，**排除** 9 个 overlay 产物）

| # | 文件 | 动作 | 说明 |
|---|---|---|---|
| 1 | `src/main/services/sandbox/serviceBootstrap.ts` | 改 | `getWorkspaceRoot()` 改用 `getAppDataDir()`；移除随之无用的 `app` 导入 |
| 2 | `src/main/services/packages/windowsMcp.ts` | 改 | 两条用户可见报错文案改用既有 `getUvPythonInstallRoot()`，不再硬编码社区目录 |
| 3 | `src/shared/constants.ts` | 改 | 新增 `MIN_SPLASH_MS = 800`、`BOOT_PROBE_TIMEOUT = 20_000` |
| 4 | `src/renderer/bootTiming.ts` | 新增 | 导出 `BOOT_AT`（独立模块，避免 `App ← main` 循环依赖） |
| 5 | `src/renderer/App.tsx` | 改 | 新增 `useSplashFloor()`（按 `BOOT_AT` 剩余时间累计，失败态不延迟）与 `withTimeout()`；三个 loading 分支并入下限；setup/deps 两处探询加超时兜底；图标改 `./icon.png`；file-server 端口回退改 `DEFAULT_FILE_SERVER_PORT` |
| 6 | `src/renderer/main.tsx` | 改 | i18n 启动屏补同款图标，消除「先无图标后带图标」跳变 |
| 7 | `src/renderer/components/pages/NuwaxHostWebview.tsx` | 改 | 图标改 `./icon.png` |
| 8 | `src/main/ipc/processHandlers.ts` | 改 | `fileServer:start` 缺参回退改 `DEFAULT_FILE_SERVER_PORT` |
| 9 | `src/main/services/system/dependencyChecker.ts` | 改 | file-server `installVersion`/`npmFallback` 1.4.3 → 1.4.4（对齐 bundled） |
| 10 | `src/shared/types/electron.d.ts` | 改 | `ServicesAPI` 补 `readyState` / `waitForReady`（preload 早已暴露，类型声明滞后，修掉 3 个既有 tsc 错误） |
| 11 | `scripts/tools/check-app-dir-literals.js` | 新增 | 守卫：`src/main` 内禁止硬编码 `.nuwax`/`.nuwaclaw` 字面量（注释剥离、allowlist 需带 identifier 守卫） |
| 12 | `tests/scripts/check-app-dir-literals.test.ts` | 新增 | 7 条：派生路径通过、`.nuwaclaw`/`.nuwax` 报错、注释与 `.nuwaxcode` 忽略、allowlist 丢守卫报错、跳过测试文件 |
| 13 | `package.json` | 改 | 新增 `check:appdir` 脚本 |

### overlay 文件（提交进外层仓 `overlay/`）

| # | 文件 | 动作 | 说明 |
|---|---|---|---|
| 14 | `overlay/.../src/main/ipc/nuwaxBridgeHandlers.ts` | 改 | ①`configureServerHost` 改 async：`await stopAllServicesNow()` → `await refreshLoopbackGateway()`，并清旧域派生凭据（`clearShellAuthState()` + 旧域 token 键快照清空 + `lanproxy.server_host/port`）；②`native:saveImage` 相对地址按 `event.senderFrame` origin 归一、流式落盘（`pipeline` + `Readable.fromWeb`）、补 `filters`；③`resolveSenderOrigin` 容忍缺 event；④删死导入、修头注与 `pickDirectory` 注 |
| 15 | `overlay/.../src/main/ipc/nuwaxBridgeHandlers.tokenScopes.test.ts` | 改 | 9 → 14 条：新增换域凭据清理、saveImage 相对/绝对/非 http(s)/无 origin/取消 五条 |

## 关键实现选择（与计划的偏离）

1. **splash 卡死走「优雅降级」而非新增可重试错误屏。** deps/setup 探询超时后按各自既有 `catch` 分支的降级语义处理（setup→按已完成、deps→`needsRequiredDepsReinstall=false`），不阻塞进主界面。理由：既有代码已是这个语义，新增错误屏是行为扩张；且服务门禁本身有 30s 上限与重试屏，覆盖「真有故障」的场景。
2. **`deviceId` 盐共享未改（见「遗留待决」）**——服务端可见身份变更，需用户拍板。
3. **splash 下限取 800ms**（用户未作答，取推荐值；仓内既有先例是 `SettingsPage.tsx:608` 的 500ms，调整只需改 `MIN_SPLASH_MS`）。

## 验收协议（重要：两个门禁含义不同）

⚠️ **`npm run base:test` = 社区基线，不是商业侧门禁。** 它是 `in-base.js --no-inject`，会先跑 `sync-overlay.js --clean` **把 overlay 产物从基座工作树还原/删除**，再跑 vitest（设计意图见 `in-base.js:31-33,53-54`：社区基线须跑在干净基座源码上）。因此：

| 门禁 | 命令 | 覆盖 | 结果 |
|---|---|---|---|
| 社区基线 | `npm run base:test` | 干净基座 + 社区默认值 | ✅ 103 files / **1250 passed** / 17 skipped |
| 商业侧 | `node scripts/sync-overlay.js` 后 `npx vitest run` | overlay 产物 + 商业标识 | ✅ 106 files / **1282 passed** / 17 skipped |
| 类型 | `npx tsc --noEmit` | — | 基线 217 → **213**（修掉 4 个既有错误，0 新增） |
| 构建 | `npm run build:renderer` | — | ✅ bundle 内 `"/icon.png"` **0 命中**（原 3），`"./icon.png"` 5 命中 |

新增/扩展测试：`check-app-dir-literals.test.ts` 7 条；`nuwaxBridgeHandlers.tokenScopes.test.ts` 14 条（+5）。

## 遗留待决（本次明确不做）

1. **`deviceId` 盐共享**（`services/system/deviceId.ts:6` `APP_SALT = "nuwax-agent"`）：同机 Nuwax 与 NuwaClaw 算出同一 deviceId 并上报 reg，若后端按 `userId+deviceId` 归并会把两产品认成同一台电脑。修复方向二选一——盐值产品化（壳侧可独立做，代价：既有 Nuwax 记录被后端视为新设备需重注册）或后端复合键（需后端排期）。**需用户拍板。**
2. 网关未设 `requestTimeout`/`headersTimeout`（Node 默认 300s）：慢链路上大文件上传理论上可能被截断，未观测到。
3. `localhost` vs `127.0.0.1` 混用（健康检查用 localhost，网关绑 127.0.0.1）：依赖 Express 双栈 listen，未观测到失败。
4. nuwax 前端 `OptimizedImage` 未归一化 `src`：本次改为壳侧归一化覆盖该问题，前端仓不动（避免重建 dist + bump 子模块 pin）。
5. `dist/assets/index-{AYZUopRw,DfxU_SUG}.js` 为 stale 构建产物（`emptyOutDir: false`），仍含旧的绝对图标字面量；`dist/` 已 gitignore，不影响打包（`index.html` 引用新 hash）。
6. `src/main/services/utils/spawnNoWindow.ts:233,272` 的 `p.includes("nuwaclaw")` 仅用于日志计数，商业版恒为 0（无功能影响，未改）。

## 边界（明确不动）

- 沙箱旧数据 `~/.nuwaclaw/sandboxes` 内已有的 Nuwax 工作区：**不迁移不删除**（去动社区目录恰好违反隔离目标），成为孤儿并在 release notes 说明。
- `persistToken` 不做主进程起服务：现行「主进程只发事件、renderer 承接 reg+restartAll」保持不变。
- `ComputerServer`/`ttyd`/沙箱的启动期无条件拉起保持（有意设计）。
