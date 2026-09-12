# Nuwax 1.0.4-qa.20260912.2 接手续验

## 当前结论

**尚未满足完整交付门禁。** 已修复正常退出残留业务进程的客户端阻断；macOS QA.2 真包已通过登录恢复、四服务启动及退出 PID 消失验证。全新设备注册、真实文件上传下载/图片另存、登录中企业域名切换仍缺完整验收。此前 QA 包存在退出残留，不作为最终包。

## 修复与源码

- 基座 `aac77035`，分支 `codex/await-service-exit`，[PR #10](https://github.com/nuwax-ai/nuwa-electron-shell/pull/10)（**已于 2026-09-12 17:0x 合并进 main `3423ccff`**，含第二个提交 `00a116f3 fix(download): reject error documents for binary saves`）。
- **接手续（zcode，2026-09-12 17:00 后）**：外层双 pin 已更新——基座 `3423ccff`（PR #10）、前端 `581e63806`（feat-dong.0930 上的 `fix(download): 导出/另存按真实落盘结果反馈`，rebase 到远端最新 61 提交之上并重建 dist）；overlay 适配 1 行（saveImage 传 `"binary"` 模式接新 saveResponse 签名）；商业门禁复跑 **112 files / 1312 passed / 17 skipped**，check:pin 通过。**默认 pin 构建自此包含 QA.2 全部修复与前端导出反馈修复。**
- 旧包真机退出时，日志先写入“sent SIGTERM”，随后立即 `app.exit()`；三个由本轮启动的子进程变为孤儿仍存活。原因是 `ManagedProcess.kill()` 内部进程树终止为 fire-and-forget，主进程退出丢弃后续等待与强杀。
- 修复：清理开始取消在途注册/启动；对五个受管进程调用并等待 `stopAsync()` 全部结束；任何停止失败均报错，不再写“全部停止”。保留后续用户确认的 3000ms 居中呼吸动画、品牌身份修复及商业版自身 savedKey 升级策略。
- 前端伪成功缺口（原「尚需完成」#4 的代码部分）：`downloadCompletion.ts` 经 `native.saveImage` 等真实落盘（成功/取消/失败三分）；三个导出调用点与图片另存改为按结果反馈；浏览器路径不宣称成功。vitest 43/43，tsc 基线 514 条全存量、改动文件 0 新增。

## 验证

| 项 | 结果 |
|---|---|
| 新增回归 | 2 条：等待迟迟未退出的进程；尝试全部停止并传播失败；red/green 日志留档 |
| 商业完整测试 | 112 files / 1311 passed / 17 skipped |
| 隔离社区 `npm run base:test` | 108 files / 1265 passed / 17 skipped |
| 类型检查 | 全仓 202 条历史错误；本次 main.ts、stopManagedProcesses.ts/test.ts 无错误 |
| 基座 CI | PR #10 title、vitest 均通过 |
| macOS 实际 QA.2 App | 存量真实登录恢复，四服务 running；退出后文件/代理/终端三个记录 PID 全部消失 |
| macOS QA.2 隔离 profile | preload/IPC 调用 A→B→A，三次均 success；网关登录页 redirect 跟随域，企业登录可见，四业务服务全部停止 |
| overlay | 11 个托管文件一致；商业代码未提交到基座 |

换域用例验证的是未登录壳接口及真实页面/网关切换，不能冒充已登录 UI 点击、旧请求迟到、存储残留的完整真机用例。隔离 profile harness 加载真实打包资源，但不是另一台全新 macOS 的安装验收。Windows 状态见后续记录。

## 测试包

仅预发布、不更新正式渠道。新版本增加 `.2` 避免与有退出缺陷的旧包混淆。

- macOS arm64：`/Users/apple/Documents/Nuwax-delivery/20260912/qa2/Nuwax-1.0.4-qa.20260912.2-arm64-unsigned.app.zip`
- SHA256：`26f218866fd093efb5f0460d5544fe98e28e57712a9879b8363d53e88bd6939f`
- 签名：adhoc，无开发者签名/公证；本机 Gatekeeper 被关闭，`spctl accepted` 不构成公证通过证据。
- Windows x64：主进程/renderer/native addon 原生构建已通过，正在 NSIS 压缩；完成后追加哈希。前轮最终包已交互升级完成（exit=0），安装载荷 `5b7bdaf4682dd83a5acff683bfda4599d8a34c7632aaaaa2372abb013c1d7021`，该安装不含 QA.2 修复。

复现 QA.2：外层产品源码 `9b23e7af`，基座检出 `aac77035` 后运行 `node scripts/sync-overlay.js`；在客户端包目录用 `NUWAX_APP_IDENTIFIER=nuwax NUWAX_APP_DISPLAY_NAME=Nuwax NUWAX_PORT_OFFSET=1000` 构建主进程与 renderer，electron-builder 使用 extraMetadata.version `1.0.4-qa.20260912.2`，禁止 publish。实际 mac 配置及验证脚本留在交付目录 `qa2/evidence/`。

## 尚需完成

1. ~~PR #10 评审进入 main 后更新外层 pin~~ **已完成**（基座 `3423ccff` + 前端 `581e63806` 双 pin 更新，见「修复与源码」接手续段）。
2. 下一版候选包（`.3`：QA.2 修复 + 前端导出反馈）双平台构建与载荷级验收（安装哈希对拍、启动、退出 PID、真实登录服务闭环）。QA.2 的 Windows exe（SHA256 `75d4e3b02977c41eab8b909005ab99d01c52e3bbae55a15c6`）已产出但被 `.3` 取代，未安装，留档不验。
3. 首次设备注册：先前真实 Bearer 请求返回 4000“动态认证码或密码不能为空”；需要支持首登的后端/测试身份。存量 savedKey 升级成功不能替代首次设备注册成功。
4. 文件链路代码缺口已修（见「修复与源码」），但**真实上传下载、图片另存内容校验及取消/断网失败清理仍未在真机验证，不能标为通过**。
5. 已登录 A→B→A、离线恢复、NuwaClaw 同机完整业务共存。

## 留档

本机交付目录 `qa2/evidence/` 含测试、类型、red/green、真实启动退出、隔离换域日志及脚本。临时脚本使用当前机器绝对路径，跨机需替换路径；不携带登录凭据。早轮证据保留于原验收记录，不覆盖本轮结论。
