# overlay/ —— 商业自有代码（文件覆写机制）

商业专属实现不进基座仓（基座产品中立，服务 nuwa-cli / nuwaclaw / nuwa-work 三方），
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
而不是大文件覆写，控制升级冲突面。当前覆写清单：

（暂无——Phase 3 迁入 loopbackGateway / auth 桥商业部分 / 设置商业区块）
