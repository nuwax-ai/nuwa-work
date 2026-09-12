# 实施计划：remove-experimental-features（商业版移除实验功能 Sandbox / GUI MCP）

- 对应 spec：无（单点需求：商业版 v1.0.4 起去除两个实验功能）
- 状态：已实施（2026-09-12）
- 分支：跟随 `feat/electron-1.0.4-fixes`（外层 + 基座两仓同名分支）

## 口径

- 「两个实验功能」= 设置页「实验功能」区块：Sandbox（开关 + strict/compat/permissive 模式）与 GUI MCP（开关），二者互斥。
- 商业版（Nuwax）移除；社区基座保留 → **改动只落 overlay**，基座零新提交。

## 现状事实（实施前核实）

- 两功能默认关：`guiMcpEnabled ?? false`（guiMcpLocalConfig.ts）、`DEFAULT_SANDBOX_POLICY.enabled = false`（policy.ts）。
- 设置页开关是 GUI MCP 唯一控制源；GUI MCP 另在「服务配置」表单占 `guiMcpPort` 字段（同受 `FEATURES.ENABLE_GUI_AGENT_SERVER` 门控，默认 true）。
- 渲染层其它 guiServer 引用（App.tsx / ClientPage.tsx 服务列表）均以 `isEnabled() === true` 为入列前提——flag 关则整条分支不可达。
- v1.0.0–v1.0.3 已带该设置页发布：老用户可能开着 → 只删 UI 会留「幽灵功能」且无从关闭。

## 改动（overlay 3 文件）

| 文件 | 改动 |
|---|---|
| `SettingsPage.tsx` | 删实验功能整区块（141 行 JSX）+ sandbox/guiMcp 全部 state/loaders/handlers + `guiMcpPort` 表单字段（ttydPort 补 `span=24`）+ 无用 import（ExperimentOutlined、sandbox 三类型；`FEATURES` 保留——`DARK_THEME` 仍用） |
| `migrate.ts` | `migrateSettingsPaths()` 头部新增 `disableLegacyExperimentalFeatures()`：`step1_config.guiMcpEnabled === true → false`、`sandbox_policy.enabled === true → false`（幂等，仅发现开启才写；先于 workspaceDir 早退执行，sandbox_policy 不被 step1Config 空判挡住）。`mcp_local_config` 的 gui-agent 残留无需自理：flag 归 false 后 guiServerHandlers 注册时的 `syncGuiAgentLocalMcpConfig(getGuiMcpEnabled())` 自动移除 |
| `migrate.commercial.test.ts` | +3 用例：guiMcpEnabled 清理 / sandbox_policy 清理且保留其余字段 / 已关时零写入 |

## 不改的部分（有意）

- 基座 SettingsPage / App / ClientPage / sandbox·guiServer 主进程服务：商业版靠「无入口 + 迁移强制关」使其不可达；残留分支为死代码但无害。
- i18n 键（`Claw.Settings.experimental.*` / `sandbox.*` / `guiMcp.*`）保留：基座社区版仍在用，删键破坏社区测试。

## 验证

- `node scripts/sync-overlay.js` 同步工作树（4 文件写入，含上会话遗留未跟踪的 commercialAuth.ts）。
- `npx vitest run`（agent-electron-client）：**1294 passed / 17 skipped / 0 failed**；migrate.commercial.test.ts 单文件 12/12。
- esbuild 解析 SettingsPage.tsx 通过；工作树 SettingsPage diff 仅含本主题删除。

## 提交口径

- 仅外层仓：overlay 3 文件 + 本计划文档；基座无新提交（工作树内 overlay 产物随 pin 流程排除）。
- 未做：dev 运行态冒烟（按需 `NUWAX_APP_IDENTIFIER=nuwax npm run dev` 目检设置页无实验区块）。

## 收尾轮补充（2026-09-12 13:20）

本轮已随提测收尾提交（外层 `b7173320`，基座 pin `ae7e21aa`），并完成双平台安装/启动态验收；完整证据、校验值与未验证项见 `plans/20260912-delivery-closeout-acceptance.md`。原「未做 dev 运行态冒烟」已由打包版首次启动验收覆盖（随包前端露出设置页所在的应用界面，实验区块不再出现）。
