# 实施计划：commercial-ui-topbar（商业版壳层窗口交互对齐 · 第一轮）

- 对应 spec：无（本轮以 WorkBuddy 平台截图为界面参考，未走 grill-with-docs；范围在 Plan mode 与用户确认：壳层优先/自绘菜单栏/图标精简）
- 状态：已接受（2026-09-10 Plan mode 批复）

## 背景

以 WorkBuddy 5.5.4 截图为参考：Windows/Linux 为一体化顶行（侧栏开关 + 窗口菜单栏
关于(A)/编辑(E)/窗口(W)/帮助(H) + 右侧窗口三键，整行拖拽、背景随主题与内容融合）；
macOS 为红绿灯({16,16}) + 顶行图标精简、无窗口内菜单（系统菜单栏补中文「帮助」）。
现状：Win/Linux 悬浮 overlay 工具栏（二级菜单收起/设置/后退/前进/刷新 + 贴角三键
+ 10px 拖拽带），无菜单栏；mac 图标组同款。现成 bug：preload 调 `window:isMaximized`
但主进程未注册，最大化/还原图标状态不同步。

## 决策（Plan mode 已确认方向）

1. 只动壳层；nuwax 前端与 overlay 7 文件本轮不动（`shellAvoid.TOP=36` 保持，壳层行高维持 48px 免跨仓联动）。
2. Win/Linux 菜单栏 renderer 自绘（antd Dropdown），不用原生菜单栏；mac 走系统菜单栏。
3. 顶行图标精简为 侧栏开关 + 设置（设置必须可达的最小偏离）；后退/前进/刷新收进「窗口(W)」菜单；搜索/筛选需 nuwax 桥能力，本轮不做。

## 改动文件清单

| # | 文件 | 动作 | 说明 |
|---|---|---|---|
| 1 | `nuwa-electron-shell/crates/agent-electron-client/src/main/ipc/windowHandlers.ts` | 改 | 补 `window:isMaximized`（bug 修复）；新增 `menu:editAction`（undo/redo/cut/copy/paste/selectAll → `webContents.getFocusedWebContents()`，兼容 webview guest 焦点） |
| 2 | `src/preload/index.ts` + electronAPI 类型声明 | 改 | 暴露 `window.isMaximized`（已调未注册）、`menu.editAction`；确认 `app.checkUpdate` 通路 |
| 3 | `src/main/main.ts` | 改 | `createMenu()` mac 菜单中文化 + 新增「帮助」菜单（检查更新）；Win/Linux 维持 menu=null |
| 4 | `src/renderer/components/TrafficLightToolbar.tsx` | 改 | Win/Linux 一体化顶行（48px、bg=--color-bg-container、左=侧栏开关+四菜单、右=设置+statusEntry+updateEntry+三键）；mac 图标精简为 侧栏开关+设置；拖拽/双击最大化机制沿用 |
| 5 | `src/renderer/App.tsx` | 改 | 传 `onOpenAbout`（setActiveTab("about")+setSettingsModalOpen(true)） |
| 6 | `src/renderer/index.css` | 改 | 顶行背景、菜单触发项 hover、暗色适配 |

## 实施顺序

1. 计划工件（本文件）→ 基座开 feat 分支（自 4d88ac8b，避开 overlay 脏文件提交）
2. main 进程：windowHandlers → preload/类型 → main.ts 菜单
3. renderer：TrafficLightToolbar → App.tsx → index.css
4. 验证：`npm run base:test`；`npm run base:dev` 验 mac 形态（Win/Linux 形态本机无法直接验，走 CI 包/Windows 机）

## 证明成立的测试

- 新增测试：windowHandlers 的 isMaximized/editAction 注册（若现有测试基建覆盖 ipc 注册模式则随补）
- 回归范围：npm run base:test 全绿

## 风险与回退

| 风险 | 缓解 | 回退方式 |
|---|---|---|
| 顶行改一体化背景后遮/漏内容（nuwax 避让 36+8=44 < 行高 48） | 维持 48px 行高与现状一致，不新增遮挡 | 单 commit revert |
| 编辑菜单作用于错误 webContents | 统一走 `getFocusedWebContents()`，guest 聚焦时即 guest；无焦点时 no-op | 关闭菜单项 |
| mac role 菜单中文化后丢快捷键 | role 项仅改 label，快捷键由 role 保留 | 还原英文 role 模板 |
| Win/Linux 形态本机不可验 | DevTools 验 DOM + CI/Windows 机验收 | — |

## 偏离记录

（实现中偏离原计划的逐条补记：原因 + 同步的 commit）

1. mac 系统菜单「窗口」补 role `back`/`forward`/`reload`（中文 label）：顶行图标移除后 mac 侧出现页面导航能力缺口，计划仅写明 Win/Linux 收进菜单，实现时同步补齐 mac（main.ts，同一 commit）。
2. Win/Linux 顶行移除原 nuwax 应用图标（对齐参考图 1 顶行左缘为侧栏开关的布局），未在计划文件清单中单列。
3. 设置齿轮落位：Win/Linux 放顶行右侧（三键之前）、mac 放左侧 icon 组（红绿灯避让后）——计划只写"保留设置"，落位为实现细化。
4. 验证补充：mac「帮助→检查更新」实测触发主进程真实更新检查（dev 通道 OSS 404 属预期，链路打通）；Win/Linux 形态已于 2026-09-10 在 win-pc（SSH 远程 Windows 机）实测通过：完整商业链路（overlay 网关+nuwax dist）+ 顶栏/菜单栏/三键/状态点/「还原」标签全部符合。
5. 样式修正一轮（c18bd59b→5e78b939，用户评审"样式不过关"后对照参考图重做）：顶行 48→36px（对齐 nuwax shellAvoid.TOP=36）；三键换 captionGlyphs 1px 细线 SVG（替代 antd 描边图标）；设置齿轮撤出顶行（Win/Linux 收进「关于(A)」下拉首项，mac 应用菜单新增「设置...」走 menu:settings 事件）；菜单文字 13→12px。同轮发现 mac 窗口菜单 back/forward 无对应 Electron role，改显式 click。
