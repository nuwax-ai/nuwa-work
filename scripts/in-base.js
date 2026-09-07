#!/usr/bin/env node
/**
 * 在基座（nuwaclaw/ submodule，base 分支）内执行命令，并预注入商业构建环境变量。
 *
 * 用法：
 *   node scripts/in-base.js -- <command> [args...]
 *   npm run base:install / base:dev / base:test / base:bundle
 *
 * 注入的 env（可被外层同名变量覆盖）与 CI 构建步骤保持一致：
 *   NUWAX_APP_IDENTIFIER=nuwawork      → 数据目录 ~/.nuwawork（首启自动迁移 ~/.nuwaclaw）
 *   NUWAX_APP_DISPLAY_NAME=女娲 Nuwax  → 窗口标题等展示名
 *   NUWAX_UPDATE_FEED_BASE             → 独立更新通道 nuwa-work-electron
 *   NUWAX_PORT_OFFSET=1000             → 默认端口整体 +1000（19099/61002~61009/61173），
 *                                         与社区版 nuwaclaw、nuwa-cli 同机双开不冲突
 * 机制详见基座 crates/agent-electron-client/src/shared/constants.ts 头注（构建期 define 注入）。
 */
const { spawnSync } = require('child_process');
const path = require('path');

const baseDir = path.join(__dirname, '..', 'nuwaclaw');

// 解析参数：[--no-inject] -- <command> [args...]
// --no-inject：不注入商业 env（测试基线须用社区默认值跑，商业行为由专项
// env 测试覆盖，如 migrate.commercial.test.ts / constants.port-offset.test.ts）
const argv = process.argv.slice(2);
const noInject = argv[0] === '--no-inject';
if (noInject) argv.shift();
if (argv[0] !== '--' || argv.length < 2) {
  console.error('用法: node scripts/in-base.js [--no-inject] -- <command> [args...]');
  process.exit(1);
}
const cmd = argv.slice(1);

const env = noInject
  ? { ...process.env }
  : {
      ...process.env,
      NUWAX_APP_IDENTIFIER: process.env.NUWAX_APP_IDENTIFIER || 'nuwawork',
      NUWAX_APP_DISPLAY_NAME: process.env.NUWAX_APP_DISPLAY_NAME || '女娲 Nuwax',
      NUWAX_UPDATE_FEED_BASE:
        process.env.NUWAX_UPDATE_FEED_BASE ||
        'https://nuwa-packages.oss-rg-china-mainland.aliyuncs.com/nuwa-work-electron',
      NUWAX_PORT_OFFSET: process.env.NUWAX_PORT_OFFSET || '1000',
    };

const result = spawnSync(cmd[0], cmd.slice(1), {
  stdio: 'inherit',
  cwd: baseDir,
  env,
});
process.exit(result.status ?? 1);
