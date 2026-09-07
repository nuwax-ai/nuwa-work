# NUWA-WORK — base 分支说明（商业开发线）

> 本文件随 base 分支演进。完整的产品/发布/隔离说明在**壳仓 main 分支的
> [README.md](https://github.com/nuwax-ai/nuwa-work/blob/main/README.md)**，
> 以彼处为唯一事实源；此处只说明 base 分支自身的角色。

## base 分支是什么

- **nuwa-work 商业版的基座与开发线**：nuwaclaw 社区 main（811009627）历史
  + 108 个 1.0 提交（v2 会话渲染器/本地目录/侧栏折叠/nuwax 集成等）
  + 基座改造（构建期注入机制：`NUWAX_APP_IDENTIFIER / NUWAX_APP_DISPLAY_NAME /
    NUWAX_UPDATE_FEED_BASE / NUWAX_PORT_OFFSET`，默认值=社区版行为，
    见 `crates/agent-electron-client/src/shared/constants.ts` 头注）。
- 由壳仓（本仓 main 分支）以 submodule 引用并注入商业 env 构建；
  根 README / AGENTS.md / Makefile 等工程文档沿自 nuwaclaw，开发命令照常适用。

## 日常操作

```bash
# 在 base 分支上开发（或经壳仓 scripts/in-base.js 进入）
pnpm install --filter @nuwax-ai/nuwaclaw...   # 首次/依赖变更
cd crates/agent-electron-client && npm run test:run

# 社区 → 商业单向同步（定期）
git fetch nuwaclaw && git merge nuwaclaw/main
# 同步后记得在壳仓 bump submodule pin

# 1.0 历史回溯：git log / git cherry-pick <SHA>（或查 archive/electron-client-1.0）
```

## 注意

- 本分支属私有商业仓；**任何内容不得推送到公开仓 nuwax-ai/nuwaclaw**。
- vcpkg 为孤儿 gitlink（无 .gitmodules 条目），submodule 初始化**勿用 --recursive**。
