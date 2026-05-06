"use strict";

const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const localAppData = process.env.LOCALAPPDATA || process.env.USERPROFILE;
const appData = process.env.APPDATA || process.env.USERPROFILE;
const projectRoot = path.resolve(__dirname, "..");
const sourceProfile = path.join(appData, "Claude");
const targetProfile = path.join(localAppData, "Claude-zh-CN-proxy-data");
const exePath = path.join(localAppData, "Claude-zh-CN", "app", "Claude.exe");
const proxyPort = process.env.CLAUDE_ZH_PROXY_PORT || "8877";
const proxyLog = path.join(localAppData, "Claude-zh-CN-proxy.log");

function copyProfile(src, dst) {
  if (!fs.existsSync(src)) return;
  fs.rmSync(dst, { recursive: true, force: true });
  fs.mkdirSync(dst, { recursive: true });

  const excluded = new Set([
    "Cache",
    "Code Cache",
    "GPUCache",
    "DawnWebGPUCache",
    "DawnGraphiteCache",
    "blob_storage",
    "Service Worker",
    "Crashpad",
    "logs"
  ]);

  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (excluded.has(entry.name)) continue;
    const from = path.join(src, entry.name);
    const to = path.join(dst, entry.name);
    fs.cpSync(from, to, { recursive: true, force: true });
  }

  const configPath = path.join(dst, "config.json");
  if (fs.existsSync(configPath)) {
    try {
      const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
      delete config.locale;
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + "\n", "utf8");
    } catch (_) {}
  }
}

if (!fs.existsSync(exePath)) {
  throw new Error(`Claude standalone exe not found: ${exePath}`);
}

copyProfile(sourceProfile, targetProfile);

const proxyProc = spawn(process.execPath, [path.join(projectRoot, "scripts", "claude-zh-proxy.js")], {
  cwd: projectRoot,
  env: {
    ...process.env,
    CLAUDE_ZH_PROXY_PORT: proxyPort,
    CLAUDE_ZH_PROXY_LOG: proxyLog
  },
  detached: true,
  stdio: "ignore"
});
proxyProc.unref();

const args = [
  `--user-data-dir=${targetProfile}`,
  "--lang=zh-CN",
  `--proxy-server=http://127.0.0.1:${proxyPort}`,
  "--ignore-certificate-errors"
];

spawn(exePath, args, {
  cwd: path.dirname(exePath),
  detached: true,
  stdio: "ignore"
}).unref();
