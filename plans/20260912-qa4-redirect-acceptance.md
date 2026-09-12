# QA.4 下载重定向修复验收

关联计划：[提测收尾计划](20260912-delivery-closeout-plan.md)。QA.3 虽通过既有 Mock 测试，但真实 Electron 包的 `native:saveImage` 请求 302 时返回 `Redirect was cancelled`：Electron `net.fetch` 在 `redirect: manual` 下取消响应，业务代码拿不到 Location。QA.3 因此不能作为文件链路合格包。

修复保持 `native:saveImage` 桥接口不变，改用 Node `fetch` 获取可见的 302，逐跳解析 Location、限制最多 5 次跳转，每跳按业务 origin 重新决定 Bearer；异域不转发凭据。已有的会话代次、AbortSignal、原子临时文件落盘和 JSON 错误体拒绝逻辑继续生效。并把 bridge 顶部已过时的“renderer 启服务”注释改为实际主进程编排。

首次红灯：QA.3 真包 fixture 的 `/image` 逐字节成功，`/redirect` 返回 `Redirect was cancelled`。绿色运行态：当前编译主进程 + QA.3 打包资源在隔离 profile 经真实 Electron/preload/IPC 验证直接图片、302 图片、HTTP 200 JSON 错误、断流、重定向环、保存对话框取消、域名切换中断、跨 origin Bearer 隔离。成功文件 SHA256 `4b10f25b022a4d92a04ced289a519f8ff16be1c8ae2dd23441e157c30993b88e`，失败保持旧文件且无 `.part`。命令脚本在 `scripts/acceptance/file-bridge.cjs`，需提供 `NUWAX_QA_PLAYWRIGHT`、`NUWAX_QA_ELECTRON`、`NUWAX_QA_RESOURCES`；可选 `NUWAX_QA_MAIN` 检验未打包的新主进程。

代码门禁：商业 `npm run test:commercial` 112 files / 1316 passed / 17 skipped；`node scripts/sync-overlay.js --check` 11 个一致；`npm run check:pin` 通过。真实注册、真实工作区上传/下载和已登录 A→B→A 仍须单独验收，不因本地 fixture 通过而标记完成。

QA.4 包与安装结果、SHA256、源码提交映射在构建后追加。本轮只发布预发布测试包，不更新正式渠道。
