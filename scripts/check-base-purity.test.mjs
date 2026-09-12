#!/usr/bin/env node
/**
 * check-base-purity.js 自测（node --test）：用 mkdtemp 伪造「外层根 + overlay/ + 基座 git 仓」
 * 三件套，验证 worktree / --staged / --remote 三模式的判定。
 */
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const script = path.join(path.dirname(fileURLToPath(import.meta.url)), "check-base-purity.js");
const overlayRel = "crates/agent-electron-client/src/main/ipc/example.ts";

function run(root, ...args) {
  return spawnSync(process.execPath, [script, "--root", root, ...args], { encoding: "utf-8" });
}

function makeFixture() {
  const root = mkdtempSync(path.join(tmpdir(), "purity-"));
  const base = path.join(root, "nuwa-electron-shell");
  mkdirSync(path.join(base, "crates/agent-electron-client/src/main/ipc"), { recursive: true });
  const git = (...args) => {
    const r = spawnSync("git", args, { cwd: base, encoding: "utf-8" });
    assert.equal(r.status, 0, `git ${args.join(" ")}: ${r.stderr}`);
    return r.stdout;
  };
  git("init", "-q");
  git("config", "user.email", "t@t");
  git("config", "user.name", "t");
  git("config", "commit.gpgsign", "false");
  // 基座中立版本（内容与 overlay 版本刻意不同）
  writeFileSync(path.join(base, overlayRel), "// neutral base version\n");
  git("add", "-A");
  git("commit", "-qm", "neutral");
  // overlay 商业版本
  mkdirSync(path.join(root, "overlay", path.dirname(overlayRel)), { recursive: true });
  writeFileSync(path.join(root, "overlay", overlayRel), "// commercial overlay version\n");
  return { root, base, git };
}

const fixtures = [];
after(() => {
  for (const f of fixtures) rmSync(f, { recursive: true, force: true });
});

test("worktree: overlay 同步产物为脏 → 通过", () => {
  const { root, base } = makeFixture();
  fixtures.push(root);
  writeFileSync(path.join(base, overlayRel), "// commercial overlay version\n");
  const r = run(root);
  assert.equal(r.status, 0, r.stderr);
});

test("worktree: 非 overlay 托管的脏文件 → 拒绝", () => {
  const { root, base } = makeFixture();
  fixtures.push(root);
  writeFileSync(path.join(base, "crates/other.ts"), "x");
  const r = run(root);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /非 overlay 托管/);
  assert.match(r.stderr, /crates\/other\.ts/);
});

test("staged: 暂存 overlay 托管路径 → 拒绝；暂存中立文件 → 通过", () => {
  const { root, base, git } = makeFixture();
  fixtures.push(root);
  writeFileSync(path.join(base, overlayRel), "// commercial overlay version\n");
  git("add", overlayRel);
  const bad = run(root, "--staged");
  assert.equal(bad.status, 1, bad.stderr);
  assert.match(bad.stderr, /overlay 托管路径/);
  git("restore", "--staged", overlayRel);
  writeFileSync(path.join(base, "crates/neutral.ts"), "n");
  git("add", "crates/neutral.ts");
  const ok = run(root, "--staged");
  assert.equal(ok.status, 0, ok.stderr);
});

test("remote: 基座引用上 overlay 路径与商业版相同 → 拒绝；为中立版 → 通过", () => {
  const { root, base, git } = makeFixture();
  fixtures.push(root);
  // HEAD 是中立版 → 通过
  const ok = run(root, "--remote", "HEAD");
  assert.equal(ok.status, 0, ok.stderr);
  // 把商业版提交进基座 → 违规
  writeFileSync(path.join(base, overlayRel), "// commercial overlay version\n");
  git("add", "-A");
  git("commit", "-qm", "leak");
  const bad = run(root, "--remote", "HEAD");
  assert.equal(bad.status, 1);
  assert.match(bad.stderr, /字节相同/);
});

test("remote: 基座尚无该路径（overlay 新增文件）→ 通过", () => {
  const { root } = makeFixture();
  fixtures.push(root);
  const extraRel = "crates/agent-electron-client/src/main/ipc/new-file.ts";
  writeFileSync(path.join(root, "overlay", extraRel), "// brand new\n");
  const r = run(root, "--remote", "HEAD");
  assert.equal(r.status, 0, r.stderr);
});
