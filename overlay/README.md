# overlay/ —— 商业自有代码（文件覆写机制）

商业专属实现不进基座仓（基座产品中立，服务 nuwa-cli / nuwaclaw / NuwaWork 三方），
以**整文件覆写**方式注入基座构建：

- 目录结构 = 基座仓相对路径：`overlay/crates/agent-electron-client/src/...`
  → 同步后覆写 `nuwa-electron-shell/crates/agent-electron-client/src/...` 同名文件。
- `overlay/README.md` 为机制说明，**不参与同步**。
- 同步：`node scripts/sync-overlay.js`（`--check` 干跑看差异，`--clean` 还原基座工作树）。
  `npm run base:*`（in-base.js）已自动前置同步；CI 构建同样先 sync 再 build。
- 已同步文件清单在根目录 `.overlay-sync.json`（gitignore）；overlay 删除文件时
  联动还原/清理基座工作树对应文件。
- bump 基座 pin 后请跑 `--check` 人工核对覆写文件与新版基座的差异，防止基座侧
  同文件演进导致覆写悄悄过期。

## 覆写面积纪律

只放商业专属实现的整文件；基座若为商业功能开插槽（可选注册/扩展点），优先用插槽
而不是大文件覆写，控制升级冲突面。bump 基座 pin 后必须跑 `npm run overlay:check`
核对差异。当前覆写清单（8 文件）：

| overlay 文件（基座同路径） | 内容 |
|---|---|
| `src/main/services/loopbackGateway/index.ts` | 本地化承载编排（覆写基座 no-op 桩插槽；dist 解析优先 `NUWAX_FRONTEND_DIST` env=壳根 nuwax/dist，回落基座旧布局，打包=resources/nuwax-dist） |
| `src/main/services/loopbackGateway/gateway.ts` | 回环网关本体（dist 托管 + 后端反代 + Bearer/x-client-type 代注） |
| `src/main/services/loopbackGateway/{gateway,index}.test.ts` | 配套测试（随 sync 进基座工作树随全量跑） |
| `src/main/ipc/nuwaxBridgeHandlers.ts` | 基座中立桥的**超集**：补回 auth 命名空间（token 按 origin 持久化 `nuwax.accessToken.<origin>`、跨 origin 回退链、登录起服务/登出停服务联动、顶栏登录态事件） |
| `src/main/ipc/nuwaxBridgeHandlers.tokenScopes.test.ts` | token 键空间统一测试 |
| `src/renderer/components/pages/SettingsPage.tsx` | 基座剥离版的**超集**：补回「本地化加速」区块（nuwaxLoadMode 开关 + 保存重启联动） |
| `src/main/bootstrap/migrate.ts` | **有意行为性覆写（非超集）**：`LEGACY_SOURCES` 置空，阻断基座默认的 `~/.nuwaclaw` 首启整体迁移——商业版（identifier=nuwax）数据目录全新开始，不迁移任何历史数据（2026-09-11 改名决策） |

维护规则：基座对应文件演进时，先 `overlay:check` 看 diff，把基座侧改动手工
合入 overlay 版本（overlay 版本必须始终是基座版本的严格超集；唯一例外是
`migrate.ts`——它是刻意的行为性覆写，合入基座演进时须保留「迁移链置空」语义）。
