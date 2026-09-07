女娲 Nuwax 1.0.0 首个商业版 beta。

- 全新商业产品线：基于 nuwa-work 基座（nuwaclaw 社区历史 + 1.0 全量功能：
  v2 会话渲染、本地目录文件管理、侧栏折叠、nuwax 前端集成等）
- 与社区版 NuwaClaw 完全隔离：独立 appId / 数据目录 `~/.nuwawork`
  （首启自动迁移既有 `~/.nuwaclaw` 数据）/ 独立更新通道 / 默认端口整体 +1000，
  支持与社区版、nuwa-cli 同机双开
- 本版为 CI 链路验证版：macOS 未配置签名证书时产出 unsigned 包；
  Windows 安装包为 unsigned（正式签名流程见 docs/sign-windows.md）

请在 Assets 中下载对应平台安装包。
