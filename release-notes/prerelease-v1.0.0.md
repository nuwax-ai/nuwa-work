# 女娲Nuwax 1.0.0（Prerelease）

首个 Nuwax 品牌版本——商业版由 NuwaWork 更名为 **Nuwax（女娲Nuwax）**，版本号自 1.0.0 重新起算。

## 品牌与标识

- 应用更名为 **Nuwax**：新应用名与安装包（`Nuwax-Setup-*.exe`、`Nuwax-*.dmg` 等）、bundle id `com.nuwax-ai.nuwax`、UA 标识 `Nuwax/1.0.0`、设置「关于」显示 Nuwax。
- 应用数据目录切换为 `~/.nuwax`，**全新开始**：不迁移老 nuwaclaw / nuwawork 数据与登录状态，首次启动需重新登录；依赖缓存将重新下载。
- 更新通道切换为 `nuwax-electron`：**旧 NuwaWork beta 客户端不再收到自动更新**，请手动下载安装本版本（旧应用可并行保留或手动卸载）。

## 升级须知

- 本版为 beta：Windows 包未签名，SmartScreen 可能告警；mac 包由 CI 自动签名+公证。
- 客户端宿主标识已切换为 `nuwax`：若平台后端对新标识的登录支持尚未就绪，登录可能异常（验证中）。

---

*内部测试版本。问题反馈请附「关于 → 更新调试信息」。*
