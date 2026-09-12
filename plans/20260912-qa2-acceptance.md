# Nuwax 1.0.4-qa.20260912.2 接手续验

## 当前结论

**尚未满足完整交付门禁。** 已修复正常退出残留业务进程的客户端阻断；macOS QA.2 真包已通过登录恢复、四服务启动及退出 PID 消失验证。全新设备注册、真实文件上传下载/图片另存、登录中企业域名切换仍缺完整验收。此前 QA 包存在退出残留，不作为最终包。

## 修复与源码

- 基座 `aac77035`，分支 `codex/await-service-exit`，[PR #10](https://github.com/nuwax-ai/nuwa-electron-shell/pull/10)（待评审，未合并）。外层产品语义沿用 `9b23e7af`；外层当前正式 pin 仍是 `801c1aa6`，按项目单主干规则等待 PR 进入 main 后更新，**当前默认 pin 构建不会包含 QA.2 修复**。
- 旧包真机退出时，日志先写入“sent SIGTERM”，随后立即 `app.exit()`；三个由本轮启动的子进程变为孤儿仍存活。原因是 `ManagedProcess.kill()` 内部进程树终止为 fire-and-forget，主进程退出丢弃后续等待与强杀。
- 修复：清理开始取消在途注册/启动；对五个受管进程调用并等待 `stopAsync()` 全部结束；任何停止失败均报错，不再写“全部停止”。保留后续用户确认的 3000ms 居中呼吸动画、品牌身份修复及商业版自身 savedKey 升级策略。

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
- Windows x64：原生构建中，完成后追加安装包、哈希与安装证据；未完成前不计入通过。

复现 QA.2：外层产品源码 `9b23e7af`，基座检出 `aac77035` 后运行 `node scripts/sync-overlay.js`；在客户端包目录用 `NUWAX_APP_IDENTIFIER=nuwax NUWAX_APP_DISPLAY_NAME=Nuwax NUWAX_PORT_OFFSET=1000` 构建主进程与 renderer，electron-builder 使用 extraMetadata.version `1.0.4-qa.20260912.2`，禁止 publish。实际 mac 配置及验证脚本留在交付目录 `qa2/evidence/`。

## 尚需完成

1. PR #10 评审进入 main 后更新外层 pin，保证默认构建包含修复。
2. Windows QA.2 安装、启动、退出与真实登录服务闭环。
3. 首次设备注册：先前真实 Bearer 请求返回 4000“动态认证码或密码不能为空”；需要支持首登的后端/测试身份。存量 savedKey 升级成功不能替代首次设备注册成功。
4. 真实上传、下载、图片另存内容校验及取消/断网失败清理；需要可用登录和工作区。
5. 已登录 A→B→A、离线恢复、NuwaClaw 同机完整业务共存。

## 留档

本机交付目录 `qa2/evidence/` 含测试、类型、red/green、真实启动退出、隔离换域日志及脚本。临时脚本使用当前机器绝对路径，跨机需替换路径；不携带登录凭据。早轮证据保留于原验收记录，不覆盖本轮结论。
