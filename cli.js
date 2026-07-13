#!/usr/bin/env node

const { spawn } = require("node:child_process");

const DEFAULT_BASE_URL = "http://localhost:3000";
const BASE_URL = (process.env.SNIP_API || DEFAULT_BASE_URL).replace(/\/+$/, "");

function usage() {
  console.log(`Usage:
  snip add <url>
  snip ls
  snip open <code>
  snip help

Environment:
  SNIP_API   Base URL of the Snip backend (default: http://localhost:3000)
`);
}

function fail(message) {
  if (message) {
    console.error(message);
  }
  process.exit(1);
}

function isHttpUrl(value) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

async function request(path, options = {}) {
  try {
    return await fetch(`${BASE_URL}${path}`, options);
  } catch {
    fail(`Could not reach backend at ${BASE_URL}`);
  }
}

async function readJsonBody(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

async function runAdd(args) {
  if (args.length !== 1) {
    fail("Usage: snip add <url>");
  }

  const [url] = args;
  if (!isHttpUrl(url)) {
    fail("Invalid URL. Use an http:// or https:// URL.");
  }

  const response = await request("/api/links", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });

  const payload = await readJsonBody(response);

  if (response.status !== 201 || !payload || typeof payload.shortUrl !== "string") {
    const message = payload && typeof payload.error === "string"
      ? payload.error
      : `Request failed with status ${response.status}.`;
    fail(message);
  }

  console.log(payload.shortUrl);
}

function pad(value, width) {
  return String(value).padEnd(width, " ");
}

async function runList(args) {
  if (args.length !== 0) {
    fail("Usage: snip ls");
  }

  const response = await request("/api/links");
  const payload = await readJsonBody(response);

  if (response.status !== 200 || !Array.isArray(payload)) {
    const message = payload && typeof payload.error === "string"
      ? payload.error
      : `Request failed with status ${response.status}.`;
    fail(message);
  }

  if (payload.length === 0) {
    console.log("No links yet.");
    return;
  }

  const codeWidth = Math.max(4, ...payload.map((item) => String(item.code || "").length));
  const hitsWidth = Math.max(4, ...payload.map((item) => String(item.hits ?? "").length));

  console.log(`${pad("CODE", codeWidth)}  ${pad("HITS", hitsWidth)}  URL`);
  for (const item of payload) {
    console.log(`${pad(item.code, codeWidth)}  ${pad(item.hits, hitsWidth)}  ${item.url}`);
  }
}

function openInBrowser(targetUrl) {
  return new Promise((resolve, reject) => {
    const platform = process.platform;
    let command;
    let args;

    if (platform === "win32") {
      command = "cmd";
      args = ["/c", "start", "", targetUrl];
    } else if (platform === "darwin") {
      command = "open";
      args = [targetUrl];
    } else {
      command = "xdg-open";
      args = [targetUrl];
    }

    const child = spawn(command, args, {
      detached: true,
      stdio: "ignore",
    });

    child.on("error", () => reject(new Error("Could not open browser.")));
    child.unref();
    resolve();
  });
}

async function runOpen(args) {
  if (args.length !== 1) {
    fail("Usage: snip open <code>");
  }

  const [code] = args;
  if (!code) {
    fail("Code is required.");
  }

  const response = await request(`/${encodeURIComponent(code)}`, { redirect: "manual" });

  if (response.status === 404) {
    fail(`Unknown code: ${code}`);
  }

  const location = response.headers.get("location");
  const isRedirect = [301, 302, 303, 307, 308].includes(response.status);

  if (!isRedirect || !location) {
    fail(`Expected redirect for code ${code}, got status ${response.status}.`);
  }

  try {
    await openInBrowser(location);
  } catch (error) {
    fail(error instanceof Error ? error.message : "Could not open browser.");
  }

  console.log(`Opened ${location}`);
}

async function main() {
  const [command, ...args] = process.argv.slice(2);

  if (!command || command === "help" || command === "--help" || command === "-h") {
    usage();
    return;
  }

  if (command === "add") {
    await runAdd(args);
    return;
  }

  if (command === "ls") {
    await runList(args);
    return;
  }

  if (command === "open") {
    await runOpen(args);
    return;
  }

  fail(`Unknown command: ${command}\nRun \"snip help\" for usage.`);
}

main().catch((error) => {
  fail(error instanceof Error ? error.message : "Unexpected error.");
});
