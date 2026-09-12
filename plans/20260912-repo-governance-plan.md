# 实施计划：repo-governance（三仓维护统一与分支收口）

- 对应梳理：`docs/20260912-edition-matrix.md`
- 状态：已实施（2026-09-12，用户批准的 Plan mode 产物）
- 决策默认（用户未逐项作答，按推荐执行）：① 1.0.4 分支立即合并进 main；② pin/nuwawork 退役；③ 远端分支保守清理。

## 背景问题（矩阵梳理暴露）

1. 外层仓 4 个 workflow 零测试步骤——商业侧 1309 条门禁只存在于本地。
2. 「防商业代码泄回基座」仅靠 MODULES.md 一句话 + 人工排除（1.0.4 收尾时手工挑 31 文件）。
3. 双轨门禁只有社区轨进了 package.json；商业轨靠口口相传。
4. 基座三条并行线（main / pin/nuwawork / feat）+ .gitmodules 与实际检出不一致 + 86 个陈旧本地引用、重复 remote、冗余本地分支。

## 已实施

### Phase 0 · 门禁一等命令 + 纯净守卫

- `scripts/check-base-purity.js`（三模式）：worktree（基座脏文件 ⊆ overlay 托管集）/
  `--staged`（基座暂存不得含 overlay 路径）/ `--remote <ref>`（基座引用上 overlay
  托管路径与 overlay/ 商业版**字节相同 = 泄回**；不等为正常）。
- `scripts/check-base-purity.test.mjs`：node:test 5 用例（mkdtemp 造假仓）。
- `in-base.js` 新增 `--no-env`（同步 overlay 但不注 env）——**测试门禁口径**：测试套件
  断言「未注入 env 时为社区缺省身份」，env 只供构建/打包；首版 `test:commercial` 直接
  注 env 曾致 33 条「社区缺省身份」断言失败，--no-env 修复（1309 基线复现）。
- package.json：`test:commercial` / `test:scripts` / `check:pin`。
- 有意不做 git 钩子：基座 husky 走 core.hooksPath（.git/hooks 不生效），改基座 tracked
  的 .husky 会制造商业脏文件——守卫靠命令 + CI。

### Phase 1 · 外层 CI（ci.yml）

- community job（--no-inject）+ commercial job（--no-env + test:scripts + check:pin 双
  模式）；vitest 排除项与基座 ci.yml 对齐（linux-bwrap 需真实 bwrap）。
- 触发：push main/feat/*、PR main。首跑发现 `gateway.test.ts > x-client-type` 用例在
  ubuntu 偶发 `UND_ERR_SOCKET`（socket 层 flaky，非断言）——重跑通过，未再复现；
  记为已知 flaky，复现两次以上再修。

### Phase 2 · 分支收口

- 基座 PR #6（12 提交）rebase 合并进 main，删除远端 feat 线；外层 PR #6（6 提交）
  rebase 合并，删除远端 feat 线。
- **rebase 改写基座 SHA 的连带处理**：ae7e21aa→f0ddd9fe（两树 diff 为空，等价），
  外层 gitlink 已 bump（`chore(submodule): 基座 pin 对齐 main rebase 后 SHA`）；
  旧 SHA 仍可经基座仓 refs/pull/6/head 获取，仅影响逐提交 bisect。**教训：基座 PR
  应优先 merge/ff 而非 rebase**（已写进 README 流程「勿 rebase 改写已 pin 的 SHA」）。
- `.gitmodules`：nuwa-electron-shell `branch = pin/nuwawork` → `main`；子模块 detached
  于 f0ddd9fe（pin 态）。

### Phase 3 · 保洁（保守）

- 基座：删重复 remote `shell`、本地 feat/electron-1.0.4-fixes + pin/nuwawork +
  feat/ui-window-topbar；远端删 pin/nuwawork、feat/ui-window-topbar（--merged main）。
  远端现存：main + archive/electron-client-1.0 + 5 个 dependabot（挂开放 PR，保留）。
- 外层：删历史 remote `nuwaclaw`（README 中 nuwaclaw 均为产品名行文，非配置引用）。

### Phase 4 · 文档

- README：新增「分支模型与双轨门禁」节（单主干 + 门禁表 + base:test 清 overlay 警示）、
  「与基座/社区版的同步」改写为提交基座标准流程（check:pin 前置）、fresh clone 删除
  过期的「基座内嵌 nuwawork 过渡期」行（f68964eb 后基座已不内嵌前端，实测核实）。
- AGENTS.md：商业边界节补双轨门禁命令 + check:pin + 单主干约定。
- matrix 附录（本文件 §SHA 说明）：提交映射表中的 ae7e21aa/b7173320/ec9ee545 为合并
  前 SHA，合并后等价物为 f0ddd9fe/209bdacf 链。

## 明确不在本轮（跟进项）

- **社区仓 bump pin**：跨基座 f68964eb 断层（基座删内嵌前端 → nuwaclaw CI 两层子模块
  断言失效；社区仓无自身前端 pin 与 overlay；登录重构删 SetupWizard 属社区产品决策）。
- 基座 5 个 dependabot PR（actions v4→v6/v7 升级）：与本轮治理无耦合，单独评估合并。
- `gateway.test.ts` x-client-type 用例的 ubuntu flaky（UND_ERR_SOCKET）。
- 1.0.4 正式发布收口（后端首登 4000 阻塞等，见 delivery-closeout-acceptance）。

## 验证

- 本地：test:scripts 5/5；check:pin 三模式通过；community 口径 1251 / commercial 口径
  1309，0 失败。
- CI：外层 ci.yml 在 PR 与 push 双事件全绿（flaky 重跑一次后）。
- 收口后：外层仅剩 main + 2 archive 分支；基座仅剩 main + archive + dependabot；
  .gitmodules 与检出一致；基座工作树 11 个 overlay 脏文件为常态（-dirty 属预期）。
