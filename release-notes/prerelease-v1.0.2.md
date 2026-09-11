# 女娲Nuwax 1.0.2（Prerelease）

继 1.0.0（Nuwax 改名首版 beta）后的重发：本版不含功能性变更，主要为改名收尾与工程配置对齐。

## 变更

- 包名对齐为 `@nuwax-ai/nuwax-client`（随仓库改名 nuwax-ai/nuwax-client 的收尾）。
- 开发链路 `.codex` hooks 路径随本地目录改名对齐（不影响应用行为）。

## 版本号说明

`prerelease-v1.0.1` 已被改名前（NuwaWork 时期）的构建占用，版本号直接顺延为 1.0.2。

## 升级须知

- 同 1.0.0：本版为 beta，Windows 包未签名，SmartScreen 可能告警；mac 包由 CI 自动签名+公证。
- 数据目录为 `~/.nuwax`，与旧 NuwaWork / nuwaclaw 应用互不迁移；旧品牌 beta 客户端不接收本版自动更新，请手动下载安装。

---

*内部测试版本。问题反馈请附「关于 → 更新调试信息」。*
