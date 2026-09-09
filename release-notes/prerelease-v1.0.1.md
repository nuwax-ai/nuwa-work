# 女娲 Nuwax 1.0.1（Prerelease）

## 架构

- 三层架构定型：功能模块基座仓 [nuwa-electron-shell](https://github.com/nuwax-ai/nuwa-electron-shell)（main @cb884b02），本产品以 submodule pin 引用并注入商业身份构建
- 基座统一线：合入社区 main 最新修复（macOS 点击 Dock 图标恢复隐藏窗口等）

## 修复

- 修复登录态同步断裂：补 `ipc/index.ts` 桥注册接线
- 修复 dev 链路端口偏移贯通 + mcpHostAdapterLoader 补件
- 升级检测调试信息按注入身份显示应用名称
- 修复 agent-kit 构建链（file: override 快照机制下 fresh 构建解析失败）
- ProcessRegistry sweep 对部分实现 engine 的防御性守卫

> 本版为三层架构迁移后的首个链路验证构建（beta 通道，Windows 为 unsigned 包）。
