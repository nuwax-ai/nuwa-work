# QA.4 下载重定向修复验收

关联计划：[提测收尾计划](20260912-delivery-closeout-plan.md)。QA.3 虽通过既有 Mock 测试，但真实 Electron 包的 `native:saveImage` 请求 302 时返回 `Redirect was cancelled`：Electron `net.fetch` 在 `redirect: manual` 下取消响应，业务代码拿不到 Location。QA.3 因此不能作为文件链路合格包。

修复保持 `native:saveImage` 桥接口不变，改用 Node `fetch` 获取可见的 302，逐跳解析 Location、限制最多 5 次跳转，每跳按业务 origin 重新决定 Bearer；异域不转发凭据。已有的会话代次、AbortSignal、原子临时文件落盘和 JSON 错误体拒绝逻辑继续生效。并把 bridge 顶部已过时的“renderer 启服务”注释改为实际主进程编排。

首次红灯：QA.3 真包 fixture 的 `/image` 逐字节成功，`/redirect` 返回 `Redirect was cancelled`。绿色运行态：当前编译主进程 + QA.3 打包资源在隔离 profile 经真实 Electron/preload/IPC 验证直接图片、302 图片、HTTP 200 JSON 错误、断流、重定向环、保存对话框取消、域名切换中断、跨 origin Bearer 隔离。成功文件 SHA256 `4b10f25b022a4d92a04ced289a519f8ff16be1c8ae2dd23441e157c30993b88e`，失败保持旧文件且无 `.part`。命令脚本在 `scripts/acceptance/file-bridge.cjs`，需提供 `NUWAX_QA_PLAYWRIGHT`、`NUWAX_QA_ELECTRON`、`NUWAX_QA_RESOURCES`；可选 `NUWAX_QA_MAIN` 检验未打包的新主进程。

代码门禁：商业 `npm run test:commercial` 112 files / 1316 passed / 17 skipped；`node scripts/sync-overlay.js --check` 11 个一致；`npm run check:pin` 通过。真实注册、真实工作区上传/下载和已登录 A→B→A 仍须单独验收，不因本地 fixture 通过而标记完成。

本轮只发布预发布测试包，不更新正式渠道。源码与包的映射见下文；完整业务闭环仍受测试身份与真实后端验收限制。

## QA.4 包装载荷复验

- 代码：外层 `2718afe1`（商用 overlay + 真 Electron 文件桥脚本），基座 `26570532`，前端 `581e63806`。脚本的临时目录后来改为跨平台 `os.tmpdir()`，产品代码未变；最终提交映射以本分支最新提交为准。
- macOS arm64 测试 ZIP：`/Users/apple/Documents/Nuwax-delivery/20260912/qa4/Nuwax-1.0.4-qa.20260912.4-arm64-unsigned.app.zip`，SHA256 `332d2e63cf725601d8357c60c9abfe8bdaed775f37c1741f0a10c545c2394687`。app.asar `5841dd96b4b7e3056a901688257c2432414d5376ea1c31435460674bebf69ee9`。`CFBundleShortVersionString` 为 `1.0.4-qa.20260912.4`，随包前端 index.html 哈希 `51a884bc…` 与 pin `581e63806` 的 dist 对齐。adhoc 未签名/未公证。
- macOS QA.4 **真实打包资源**在隔离 profile 完整跑通 `file-bridge.cjs`：直接图片、302、HTTP 200 JSON 错误、断流、重定向环、取消、换域中断、跨 origin Bearer 隔离全部 PASS。
- Windows QA.4 原生 `win-unpacked` 载荷在交互桌面会话完整跑通相同脚本，八项均 PASS、图片 SHA256 同 mac `4b10f25b…`。初次在 SSH 非交互会话运行导致 Electron 主进程 context destroyed，该轮没有文件断言；改用交互会话后通过。安装态复验见下文。
- 双端均为 fixture HTTP 服务器与受控保存对话框结果；验证真实 Electron/preload/IPC 与文件写入，不代表实际业务后端的上传下载通过。原始日志在 `~/Documents/Nuwax-delivery/20260912/qa4/evidence/`，Windows 日志在 `C:\Users\soddygo\qa4-file-bridge-interactive.log`。

## QA.4 文件服务数据面与 Windows 安装包

- `scripts/acceptance/file-server-contract.cjs` 以另一随机端口和独立临时工作区启动 **随包** `nuwax-file-server`，按真实 multipart 接口上传 68 B PNG、读取文件列表、下载 ZIP；解析 ZIP 目录与压缩条目后确认 `probe.png` 的字节和原始 SHA256 完全一致。macOS、Windows 原生打包资源均 PASS。进程与临时目录在脚本结束清理；不复用或重启用户现有服务。该用例未走平台后端/前端授权会话。
- Windows x64 NSIS 文件：`C:\Users\soddygo\Nuwax-delivery\20260912\qa4\windows\Nuwax-Setup-1.0.4-qa.20260912.4-unsigned.exe`，大小 **799,988,839 B**，SHA256 `5be110c7efc1b548b6e89c443137154f5fb03141ececc45cf0160ca3047badf7`，未签名。交互桌面安装退出码 0；安装后 `resources/app.asar` SHA256 `5c67cc19ef4bc8279491537dac04b81f4b06cfc5ece1c42aa4907b19b2037b3a`，随包前端 index.html SHA256 `51a884bcff906b4d14e59fe07826a82d2cb3e586d419365a7deb9802ff9daa1f`，与前端 pin 对齐。
- Windows **安装态**隔离 profile 启动并退出 PASS：版本 `1.0.4-qa.20260912.4`，独立用户目录 `AppData\Roaming\Nuwax`；未登录时文件、代理、终端、computer 四项服务均未运行，WebView 加载企业登录页。该机器已有商业版数据，属于升级验证，不是干净安装。安装态文件桥八项 PASS；安装态文件服务上传/列表/下载 ZIP 字节校验 PASS。文件服务安装态第一次等待就绪超时，带启动输出诊断后重跑及连续三次复验均通过；未复现首轮超时，保留为稳定性观察项。
- QA.4 原生包仅供提测；`20260912-qa2-acceptance.md` 的 QA.3 哈希与结论是历史记录，QA.3 存在 302 下载缺陷。


证据可随仓库复核：[QA.3 红灯](evidence/qa3-redirect-red.log)、[macOS 文件桥](evidence/qa4-macos-file-bridge.log)、[Windows 文件桥](evidence/qa4-windows-file-bridge.log)、[macOS 文件服务](evidence/qa4-macos-file-server.log)、[Windows 文件服务](evidence/qa4-windows-file-server.log)、[Windows 安装态启动](evidence/qa4-windows-installed-startup.log)、[Windows 安装态文件桥](evidence/qa4-windows-installed-file-bridge.log)、[Windows 安装态文件服务](evidence/qa4-windows-installed-file-server.log)。

## QA.4 提测人员执行清单

使用本页 QA.4 文件名和 SHA256，勿使用早轮验收记录里的 QA.2/QA.3 包。Windows 在交互桌面双击安装；macOS 解压 ZIP 后启动。以下涉及真实账号/平台后端的项目尚未计入本轮通过，执行时保留页面截图、应用日志、进程/端口快照及文件 SHA256。

1. 在没有商业版数据的 profile 冷启动，确认约 3 秒呼吸启动屏后到企业登录页；依赖初始化失败应显示重试入口。未登录时四项业务服务均不运行，原有 NuwaClaw 数据目录无读写。
2. 用可完成首次设备注册的测试身份登录：确认先注册再启动 fileServer、lanproxy、ttyd、ComputerServer，四项健康检查通过；登出和再次登录后确认进程/端口分别退出、恢复。注册失败应有明确提示且业务服务保持停止。
3. 登录后通过「企业登录」执行域 A→B→A；切换中确认旧域请求/凭据不再生效，旧服务停止，新域页面与登录态一致；模拟停服或网关切换失败时界面不得报成功。
4. 在真实工作区上传一个含已知 SHA256 的图片，下载回本机并另存该图片；三份文件哈希应一致。再覆盖测试 302 图片、保存取消、断网中断和不可写目录，失败时目标旧文件不损坏且无 `.part` 残留。
5. 在同机启动 NuwaClaw 与 Nuwax，分别登录并运行服务；确认两者各自数据目录、Cookie 和端口独立，退出 Nuwax 不影响 NuwaClaw。随后断网重启 Nuwax，再恢复网络并确认重连及最终退出没有业务子进程残留。
6. 在已有商业版数据的机器升级至 QA.4，确认商业版自身登录可恢复且使用新的商业 deviceId 重新注册；旧设备记录不会自动删除。Windows 本轮只完成了未登录升级安装与启动，仍需此项已登录验收。
