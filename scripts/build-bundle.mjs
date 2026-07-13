#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { cp, mkdir, readdir, rm, stat, writeFile } from "node:fs/promises";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(scriptDir, "..");

const backendDir = resolve(rootDir, "backend");
const frontendDir = resolve(rootDir, "frontend");
const cliDir = resolve(rootDir, "cli");
const bundleDir = resolve(rootDir, "bundle");
const bundlePublicDir = resolve(bundleDir, "public");
const frontendBuildDir = resolve(frontendDir, "dist", "snip-frontend", "browser");

const pushEnabled = process.argv.includes("--push");

function platformCommand(base) {
  return base;
}

function useShell(command) {
  return process.platform === "win32" && (command === "npm" || command === "npx");
}

function run(command, args, options = {}) {
  const result = spawnSync(platformCommand(command), args, {
    cwd: options.cwd ?? rootDir,
    encoding: "utf8",
    stdio: "pipe",
    shell: useShell(command),
  });

  if (result.status !== 0) {
    if (result.error) {
      throw new Error(`Command failed: ${command} ${args.join(" ")}\n${result.error.message}`);
    }
    const details = [result.stdout, result.stderr].filter(Boolean).join("\n").trim();
    throw new Error(`Command failed: ${command} ${args.join(" ")}\n${details}`);
  }

  return (result.stdout || "").trim();
}

function runAllowFailure(command, args, options = {}) {
  return spawnSync(platformCommand(command), args, {
    cwd: options.cwd ?? rootDir,
    encoding: "utf8",
    stdio: "pipe",
    shell: useShell(command),
  });
}

function hasStagedChanges(cwd) {
  const result = runAllowFailure("git", ["diff", "--cached", "--quiet"], { cwd });
  return result.status === 1;
}

function hasUnpushedCommits(cwd, remoteRef) {
  const output = run("git", ["rev-list", "--left-right", "--count", `${remoteRef}...HEAD`], { cwd });
  const parts = output.trim().split(/\s+/);
  const aheadCount = Number.parseInt(parts[1] ?? "0", 10);
  return Number.isFinite(aheadCount) && aheadCount > 0;
}

async function copyDirContents(srcDir, destDir) {
  await mkdir(destDir, { recursive: true });
  const entries = await readdir(srcDir);

  for (const entry of entries) {
    const srcPath = join(srcDir, entry);
    const destPath = join(destDir, entry);
    await cp(srcPath, destPath, { recursive: true, force: true });
  }
}

async function ensurePathExists(pathToCheck, description) {
  try {
    await stat(pathToCheck);
  } catch {
    throw new Error(`${description} not found at ${pathToCheck}`);
  }
}

async function assembleBundle() {
  await ensurePathExists(resolve(backendDir, "server.js"), "backend/server.js");
  await ensurePathExists(resolve(cliDir, "cli.js"), "cli/cli.js");
  await ensurePathExists(resolve(frontendBuildDir, "index.html"), "frontend build index");

  await rm(bundlePublicDir, { recursive: true, force: true });
  await mkdir(bundlePublicDir, { recursive: true });

  await cp(resolve(backendDir, "server.js"), resolve(bundleDir, "server.js"), { force: true });
  await cp(resolve(cliDir, "cli.js"), resolve(bundleDir, "cli.js"), { force: true });
  await copyDirContents(frontendBuildDir, bundlePublicDir);

  await writeFile(resolve(bundleDir, ".env"), "PUBLIC_DIR=./public\n", "utf8");

  const packageJson = {
    name: "snip-bundle",
    version: "1.0.0",
    private: true,
    scripts: {
      start: "bun server.js"
    }
  };

  await writeFile(resolve(bundleDir, "package.json"), `${JSON.stringify(packageJson, null, 2)}\n`, "utf8");

  await writeFile(
    resolve(bundleDir, "Dockerfile"),
    "FROM oven/bun:1-alpine\n" +
      "WORKDIR /app\n" +
      "COPY . .\n" +
      "ENV PORT=3000\n" +
      "EXPOSE 3000\n" +
      "CMD [\"bun\", \"server.js\"]\n",
    "utf8"
  );

  await writeFile(
    resolve(bundleDir, ".dockerignore"),
    ".git\n.gitmodules\nnode_modules\nnpm-debug.log*\n",
    "utf8"
  );

  await writeFile(
    resolve(bundleDir, "railway.json"),
    `${JSON.stringify(
      {
        $schema: "https://railway.app/railway.schema.json",
        build: { builder: "DOCKERFILE" }
      },
      null,
      2
    )}\n`,
    "utf8"
  );
}

function commitBundleIfNeeded() {
  run("git", ["add", "-A"], { cwd: bundleDir });
  let changed = false;

  if (!hasStagedChanges(bundleDir)) {
    console.log("bundle: unchanged");
  } else {
    run("git", ["commit", "-m", "chore: regenerate bundle"], { cwd: bundleDir });
    changed = true;
    console.log("bundle: committed");
  }

  if (pushEnabled && hasUnpushedCommits(bundleDir, "origin/bundle")) {
    run("git", ["push", "origin", "HEAD:bundle"], { cwd: bundleDir });
    console.log("bundle: pushed");
  }

  return changed;
}

function commitSuperprojectIfNeeded() {
  run("git", ["add", "backend", "frontend", "cli", "bundle"], { cwd: rootDir });
  let changed = false;

  if (!hasStagedChanges(rootDir)) {
    console.log("superproject: unchanged");
  } else {
    run("git", ["commit", "-m", "chore: bump submodule pointers"], { cwd: rootDir });
    changed = true;
    console.log("superproject: committed");
  }

  if (pushEnabled && hasUnpushedCommits(rootDir, "origin/main")) {
    run("git", ["push", "origin", "main"], { cwd: rootDir });
    console.log("superproject: pushed");
  }

  return changed;
}

async function main() {
  console.log("Updating backend/frontend/cli submodules...");
  run("git", ["submodule", "update", "--init", "--remote", "backend", "frontend", "cli"], { cwd: rootDir });

  console.log("Building frontend...");
  run("npm", ["install"], { cwd: frontendDir });
  run("npm", ["run", "build"], { cwd: frontendDir });

  await ensurePathExists(resolve(frontendBuildDir, "index.html"), "frontend/dist/snip-frontend/browser/index.html");

  console.log("Assembling bundle...");
  await assembleBundle();

  const bundleChanged = commitBundleIfNeeded();
  const rootChanged = commitSuperprojectIfNeeded();

  if (!bundleChanged && !rootChanged) {
    console.log("unchanged");
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
