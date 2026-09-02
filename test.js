// End-to-end check: run the bundled action against throwaway Go modules.
// Usage: pnpm build && pnpm test
import assert from "node:assert/strict";
import test from "node:test";
import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const run = promisify(execFile);
const BUNDLE = path.resolve(import.meta.dirname, "dist/index.js");

const MAIN_GO = 'package main\n\nfunc main() { println("hi") }\n';

/** Create a temp Go module with main.go at `pkgDir` (relative to the module root). */
async function fixture(pkgDir) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "gopack-"));
  await run("go", ["mod", "init", "example.com/app"], { cwd: root });
  await fs.mkdir(path.join(root, pkgDir), { recursive: true });
  await fs.writeFile(path.join(root, pkgDir, "main.go"), MAIN_GO);
  return root;
}

/** Invoke the action with the given inputs, returning { code, out }. */
async function action(inputs) {
  const env = { ...process.env, INPUT_INCLUDEVERSION: "false" };
  for (const [key, value] of Object.entries(inputs)) {
    env[`INPUT_${key.toUpperCase()}`] = value;
  }
  try {
    const { stdout, stderr } = await run(process.execPath, [BUNDLE], { env });
    return { code: 0, out: stdout + stderr };
  } catch (error) {
    return { code: error.code, out: error.stdout + error.stderr };
  }
}

test("points at the main package when path is wrong", async () => {
  const root = await fixture("cmd/app");
  const { code, out } = await action({
    name: "app",
    path: root,
    dest: path.join(root, "dist"),
    ldflags: "-s -w",
    flags: "",
  });

  assert.equal(code, 1);
  assert.match(out, /no main package/);
  assert.match(out, /cmd[/\\]app/);
});

test("packages one archive per platform", async () => {
  const root = await fixture(".");
  const dest = path.join(root, "dist");
  const { code, out } = await action({
    name: "app",
    path: root,
    dest,
    ldflags: "-s -w",
    flags: "-trimpath",
  });

  assert.equal(code, 0, out);
  const files = (await fs.readdir(dest)).sort();
  assert.equal(files.length, 8, files.join(" "));
  assert.ok(files.includes("app_linux_x86_64.tar.gz"), files.join(" "));
  assert.ok(files.includes("app_windows_arm64.zip"), files.join(" "));
});
