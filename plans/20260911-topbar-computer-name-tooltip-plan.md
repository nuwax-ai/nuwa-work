# 实施计划：topbar-computer-name-tooltip（顶栏电脑名以状态点 tooltip 补回）

- 对应 spec：无（对齐缺口修复；拉齐来源=nuwaclaw `feature/electron-client-1.0` 分支 commit 95dfcd78「顶栏显示电脑名」）
- 状态：已接受（2026-09-11 plan mode 访谈产出，用户选定「只补电脑名 + tooltip 形态、不加可见元素」口径）

## 背景

旧分支（商业版拆仓前直系血统）在 95dfcd78 实现过「顶栏显示电脑名」：登录统一到 nuwax webview 后 username 常拿不到，用本机主机名作为这台设备的标识。拆仓前的顶栏重构中渲染消费点丢失，当前 `App.tsx:523` 的 `computerName` state 与 `:610-619` 的 `getHostname` 读取俱在，但全 renderer 无任何渲染点（死状态）——新旧两树（nuwaclaw@9fb6f4f2 与当前基座）均如此。

2026-09-11 拉齐盘点结论：旧分支其余优化均已继承或被超越，本项为唯一功能级缺口。

## 改动文件清单

| # | 文件（nuwa-electron-shell/crates/agent-electron-client/src/renderer/） | 动作 | 说明 |
|---|---|---|---|
| 1 | App.tsx | 改 | statusEntry 的 Tooltip title 拼入电脑名：`isAuthLoggedIn && computerName` 时 `${computerName} · 服务状态异常，点击查看`，否则维持原文案 |

## 实施顺序

1. App.tsx 单文件改动（登录态 `isAuthLoggedIn` 与 `computerName` 均已在同组件作用域）。
2. 验证：壳 renderer typecheck + `npm run base:test`；运行态冒烟 `NUWAX_APP_IDENTIFIER=nuwax npm run dev`（登录态 + 制造非绿服务让状态点显现，hover 确认 tooltip 前缀为电脑名）。

## 边界（明确不动）

- 不加可见 UI 元素、不占工具栏布局（用户选定 tooltip 形态）；状态点显隐逻辑（非绿才渲染）不动。
- `TrafficLightToolbar.tsx` 不改（见偏离记录）；locales 不动（沿用该处既有中文面量 + 壳侧拼接）。
- `computerName` 其余死状态消费点不做额外清理；收尾三件（start-all plan 文档提交、loopback 设计文档存档、拉齐报告落 docs/）不在本轮。

## 证明成立的测试

- 新增测试：无（tooltip 提示行为，以运行态冒烟为验收）。
- 回归范围：`npm run base:test`。

## 风险与回退

| 风险 | 缓解 | 回退方式 |
|---|---|---|
| 主机名过长导致 tooltip 撑宽 | hostname 通常短；tooltip 无布局占位（浮层） | revert 单提交 |

## 偏离记录

- 计划批准稿原含「TrafficLightToolbar 增 computerName prop」；实施时核实 statusEntry 是 App.tsx 构造后注入的 ReactNode（`App.tsx:1606-1636`，Tooltip 就在其构造处），无需穿透 toolbar props，故只改 App.tsx 单文件。口径（tooltip 形态、最小侵入）不变。
