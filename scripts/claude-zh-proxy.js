"use strict";

const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const fzstd = require("fzstd");
const { Proxy } = require("http-mitm-proxy");

const projectRoot = path.resolve(__dirname, "..");
const resourcesDir = path.join(projectRoot, "resources");
const frontendZhPath = path.join(resourcesDir, "frontend-zh-CN.json");
const statsigZhPath = path.join(resourcesDir, "statsig-zh-CN.json");
const dynamicZhPath = path.join(resourcesDir, "frontend-dynamic-zh-CN.json");
const frontendEnPath = path.join(process.env.LOCALAPPDATA || process.env.USERPROFILE, "Claude-zh-CN", "app", "resources", "ion-dist", "i18n", "en-US.json");
const overridesJson = "{}\n";

const frontendEn = fs.existsSync(frontendEnPath) ? JSON.parse(fs.readFileSync(frontendEnPath, "utf8")) : {};
const frontendZh = fs.readFileSync(frontendZhPath, "utf8");
const statsigZh = fs.readFileSync(statsigZhPath, "utf8");
const dynamicZh = fs.existsSync(dynamicZhPath) ? fs.readFileSync(dynamicZhPath, "utf8") : "{}\n";

// Prefer the OFFICIAL zh strings shipped inside the installed Claude (path passed
// by the launcher via CLAUDE_ZH_OFFICIAL_I18N), merged over the bundled fallback.
// This auto-tracks whatever Claude version is installed and avoids bundling /
// redistributing Anthropic's translation in this repo.
const officialI18nPath = process.env.CLAUDE_ZH_OFFICIAL_I18N || "";
let frontendZhObject = JSON.parse(frontendZh);
if (officialI18nPath && fs.existsSync(officialI18nPath)) {
  try {
    const official = JSON.parse(fs.readFileSync(officialI18nPath, "utf8"));
    frontendZhObject = Object.assign({}, frontendZhObject, official);
    process.stderr.write(`[zh] merged official i18n (${Object.keys(official).length} keys) from ${officialI18nPath}\n`);
  } catch (err) {
    process.stderr.write(`[zh] failed to read official i18n: ${err.message}\n`);
  }
} else {
  process.stderr.write(`[zh] official i18n not provided; using bundled fallback only\n`);
}
const frontendZhServed = JSON.stringify(frontendZhObject);
const exactMap = (() => {
  const pending = new Map();
  const blocked = new Set();

  for (const [key, english] of Object.entries(frontendEn)) {
    const chinese = frontendZhObject[key];
    if (typeof english !== "string" || typeof chinese !== "string") continue;
    if (english === chinese) continue;
    if (english.length === 0 || english.length > 120) continue;
    if (/[{}<>]/.test(english) || /[\r\n]/.test(english)) continue;
    if (/[{}<>]/.test(chinese) || /[\r\n]/.test(chinese)) continue;

    if (pending.has(english) && pending.get(english) !== chinese) {
      blocked.add(english);
      pending.delete(english);
      continue;
    }

    if (!blocked.has(english)) {
      pending.set(english, chinese);
    }
  }

  const manual = {
    "New chat": "新对话",
    "Projects": "项目",
    "Artifacts": "制品",
    "Customize": "自定义",
    "Code": "代码",
    "Cowork": "协作",
    "Pinned": "已固定",
    "Drag to pin": "拖拽固定",
    "Recents": "最近",
    "Search": "搜索",
    "New session": "新建会话",
    "New task": "新任务",
    "Project": "项目",
    "Session": "会话",
    "Active": "进行中",
    "Archived": "已归档",
    "All": "全部",
    "Status": "状态",
    "Environment": "环境",
    "Last activity": "最近活动",
    "Group by": "分组依据",
    "Sort by": "排序方式",
    "Drop here": "放到这里",
    "Let go": "松开",
    "Collapse sidebar": "折叠侧边栏",
    "Expand sidebar": "展开侧边栏",
    "Search projects": "搜索项目"
  };

  for (const [english, chinese] of Object.entries(manual)) {
    pending.set(english, chinese);
  }

  return Object.fromEntries(pending);
})();
const hookScript = `/* [claude-zh-hook] */(() => {
  const exactMap = ${JSON.stringify(exactMap)};

  function translateTextValue(value) {
    if (typeof value !== "string") return value;
    const trimmed = value.trim();
    if (!trimmed) return value;
    const translated = exactMap[trimmed];
    if (!translated) return value;
    const start = value.indexOf(trimmed);
    if (start < 0) return translated;
    return value.slice(0, start) + translated + value.slice(start + trimmed.length);
  }

  function translateElement(el) {
    if (!(el instanceof Element)) return;
    for (const attr of ["title", "placeholder", "aria-label", "alt"]) {
      if (el.hasAttribute(attr)) {
        const next = translateTextValue(el.getAttribute(attr));
        if (next !== el.getAttribute(attr)) el.setAttribute(attr, next);
      }
    }
  }

  function translateNode(node) {
    if (!node) return;
    if (node.nodeType === Node.TEXT_NODE) {
      const next = translateTextValue(node.nodeValue || "");
      if (next !== node.nodeValue) node.nodeValue = next;
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    translateElement(node);
    const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
    let current;
    while ((current = walker.nextNode())) {
      const next = translateTextValue(current.nodeValue || "");
      if (next !== current.nodeValue) current.nodeValue = next;
    }
  }

  function installTranslator() {
    translateNode(document.body || document.documentElement);
    const obs = new MutationObserver(mutations => {
      for (const mutation of mutations) {
        if (mutation.type === "characterData") {
          translateNode(mutation.target);
          continue;
        }
        if (mutation.type === "attributes") {
          translateElement(mutation.target);
          continue;
        }
        for (const node of mutation.addedNodes) {
          translateNode(node);
        }
      }
    });
    obs.observe(document.documentElement, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["title", "placeholder", "aria-label", "alt"]
    });
    setInterval(() => translateNode(document.body || document.documentElement), 1500);
  }

  try {
    localStorage.setItem("spa:locale", "zh-CN");
    document.documentElement.lang = "zh-CN";
    window.initialLocale = "zh-CN";
    window.initialMessages = ${JSON.stringify(frontendZhObject)};
  } catch (_) {}
  const originalFetch = window.fetch.bind(window);
  window.fetch = function(input, init) {
    try {
      const raw = typeof input === "string" ? input : (input && input.url) || "";
      const url = new URL(raw, location.origin);
      if (url.pathname === "/i18n/en-US.json" || url.pathname === "/i18n/zh-CN.json") {
        return originalFetch("/i18n/zh-CN.json", init);
      }
      if (url.pathname === "/i18n/statsig/en-US.json" || url.pathname === "/i18n/statsig/zh-CN.json") {
        return originalFetch("/i18n/statsig/zh-CN.json", init);
      }
      if (url.pathname === "/i18n/zh-CN.overrides.json" || url.pathname === "/i18n/en-US.overrides.json") {
        return originalFetch("/i18n/zh-CN.overrides.json", init);
      }
    } catch (_) {}
    return originalFetch(input, init);
  };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", installTranslator, { once: true });
  } else {
    installTranslator();
  }
})();\n`;

const proxy = new Proxy();
const port = Number(process.env.CLAUDE_ZH_PROXY_PORT || 8877);
const logPath = process.env.CLAUDE_ZH_PROXY_LOG || path.join(process.env.LOCALAPPDATA || process.env.USERPROFILE, "Claude-zh-CN-proxy.log");
const seenRequests = new Set();

function log(message) {
  const line = `[${new Date().toISOString()}] ${message}\n`;
  try {
    fs.appendFileSync(logPath, line, "utf8");
  } catch (_) {}
  process.stdout.write(line);
}

function shouldPatchHtml(host, urlPath, contentType) {
  if (host !== "claude.ai") return false;
  if (!/text\/html/i.test(contentType || "")) return false;
  return urlPath === "/" || urlPath.startsWith("/chat") || urlPath.startsWith("/settings") || urlPath.startsWith("/login") || urlPath.startsWith("/projects") || urlPath.startsWith("/task") || urlPath.startsWith("/new") || urlPath.startsWith("/recents");
}

function sendTextResponse(ctx, statusCode, contentType, body) {
  ctx.proxyToClientResponse.writeHead(statusCode, {
    "content-type": `${contentType}; charset=utf-8`,
    "content-length": Buffer.byteLength(body, "utf8"),
    "cache-control": "no-store"
  });
  ctx.proxyToClientResponse.end(body, "utf8");
}

function decodeBody(buffer, encoding) {
  const value = String(encoding || "").toLowerCase().trim();
  if (buffer.length >= 4 &&
      buffer[0] === 0x28 &&
      buffer[1] === 0xb5 &&
      buffer[2] === 0x2f &&
      buffer[3] === 0xfd) {
    return Buffer.from(fzstd.decompress(new Uint8Array(buffer)));
  }
  if (!value || value === "identity") return buffer;
  if (value === "gzip") return zlib.gunzipSync(buffer);
  if (value === "deflate") return zlib.inflateSync(buffer);
  if (value === "br") return zlib.brotliDecompressSync(buffer);
  return buffer;
}

proxy.onError((ctx, err, kind) => {
  log(`proxy error [${kind}]: ${err && err.stack ? err.stack : err}`);
});

proxy.onRequest((ctx, callback) => {
  const host = (ctx.clientToProxyRequest.headers.host || "").split(":")[0];
  const urlPath = ctx.clientToProxyRequest.url || "/";
  ctx.clientToProxyRequest.headers["accept-encoding"] = "identity";
  ctx.__zhMeta = { host, urlPath };

  if ((host === "claude.ai" || host === "assets-proxy.anthropic.com") && !seenRequests.has(`${host}${urlPath}`)) {
    seenRequests.add(`${host}${urlPath}`);
    log(`request: ${host}${urlPath}`);
  }

  if (host === "claude.ai" && (urlPath === "/i18n/zh-CN.json" || urlPath === "/i18n/en-US.json")) {
    log(`serve local frontend zh: ${host}${urlPath}`);
    sendTextResponse(ctx, 200, "application/json", frontendZhServed);
    return;
  }

  if (host === "claude.ai" && (urlPath === "/i18n/statsig/zh-CN.json" || urlPath === "/i18n/statsig/en-US.json")) {
    log(`serve local statsig zh: ${host}${urlPath}`);
    sendTextResponse(ctx, 200, "application/json", statsigZh);
    return;
  }

  if (host === "claude.ai" && (urlPath === "/i18n/dynamic/zh-CN.json" || urlPath === "/i18n/dynamic/en-US.json")) {
    log(`serve local dynamic zh: ${host}${urlPath}`);
    sendTextResponse(ctx, 200, "application/json", dynamicZh);
    return;
  }

  if (host === "claude.ai" && (urlPath === "/i18n/zh-CN.overrides.json" || urlPath === "/i18n/en-US.overrides.json")) {
    log(`serve local overrides zh: ${host}${urlPath}`);
    sendTextResponse(ctx, 200, "application/json", overridesJson);
    return;
  }

  callback();
});

proxy.onResponse((ctx, callback) => {
  const meta = ctx.__zhMeta || {};
  const contentType = ctx.serverToProxyResponse.headers["content-type"] || "";
  const shouldPatch = shouldPatchHtml(meta.host, meta.urlPath, contentType);

  if (meta.host === "claude.ai" && (meta.urlPath === "/" || meta.urlPath.startsWith("/chat") || meta.urlPath.startsWith("/settings"))) {
    log(`response: ${meta.host}${meta.urlPath} status=${ctx.serverToProxyResponse.statusCode} content-type=${contentType}`);
  }

  if (!shouldPatch) {
    callback();
    return;
  }

  delete ctx.serverToProxyResponse.headers["content-encoding"];
  delete ctx.serverToProxyResponse.headers["content-length"];
  delete ctx.serverToProxyResponse.headers["etag"];

  const chunks = [];
  let originalLength = 0;

  ctx.onResponseData((_, chunk, done) => {
    originalLength += chunk.length;
    chunks.push(Buffer.from(chunk));
    done(null, null);
  });

  ctx.onResponseEnd((_, done) => {
    const encoding = ctx.serverToProxyResponse.headers["content-encoding"] || "";
    const original = decodeBody(Buffer.concat(chunks), encoding).toString("utf8");
    if (meta.host === "claude.ai" && meta.urlPath === "/") {
      log(`html encoding: ${encoding || "identity"}`);
      log(`html head sample: ${original.slice(0, 220).replace(/\s+/g, " ")}`);
      log(`html has </head>: ${original.includes("</head>")}`);
    }
    const nonceMatch = original.match(/<script[^>]*nonce="([^"]+)"/i);
    const inlineTag = nonceMatch
      ? `<script nonce="${nonceMatch[1]}">${hookScript}</script>`
      : `<script>${hookScript}</script>`;
    if (meta.host === "claude.ai" && meta.urlPath === "/") {
      log(`html nonce found: ${nonceMatch ? "yes" : "no"}`);
    }
    const patched = original.includes("[claude-zh-hook]") ? original : original.replace("</head>", `${inlineTag}</head>`);
    const changed = patched !== original;
    ctx.proxyToClientResponse.write(patched, "utf8");

    if (changed) {
      log(`patched html: ${meta.host}${meta.urlPath} (${originalLength} bytes)`);
    }

    done();
  });

  callback();
});

proxy.listen({ port, host: "0.0.0.0" });
log(`Claude zh proxy listening on http://127.0.0.1:${port}`);
