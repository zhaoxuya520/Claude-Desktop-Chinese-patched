/**
 * Claude Desktop 汉化状态检查
 *
 * 无需管理员权限，快速查看当前汉化部署状态。
 * 用法: node check-zh-cn.js
 */
const path = require('path');
const claude = require('./find-claude');

function readJSON(p) {
  try { return JSON.parse(require('fs').readFileSync(p, 'utf-8')); }
  catch (e) { return null; }
}

console.log('========================================');
console.log('  Claude Desktop 汉化状态');
console.log('========================================\n');

const claudeDir = claude.findClaudePackage();
if (!claudeDir) {
  console.log('[-] 未找到 Claude 安装');
  process.exit(0);
}

const appDir = claude.getAppDir(claudeDir);
const appRes = claude.getResourcesDir(appDir);
const i18nDir = claude.getI18nDir(appRes);
const version = claude.getVersion(claudeDir);

console.log('Claude:', path.basename(claudeDir));
console.log('版本:', version || '?');

// 检查部署文件
const checks = [
  { label: 'desktop zh-CN.json',  path: path.join(appRes, 'zh-CN.json') },
  { label: 'frontend zh-CN.json', path: path.join(i18nDir, 'zh-CN.json') },
  { label: 'statsig zh-CN.json',  path: path.join(i18nDir, 'statsig', 'zh-CN.json') },
];
console.log('\n--- 文件部署 ---');
for (const c of checks) {
  const exists = require('fs').existsSync(c.path);
  const size = exists ? require('fs').statSync(c.path).size : 0;
  console.log(`  ${exists ? '✓' : '✗'} ${c.label} (${(size / 1024).toFixed(0)} KB)`);
}

// 白名单
console.log('\n--- 语言白名单 ---');
const indexJs = claude.findIndexJs(appRes);
if (indexJs) {
  const js = require('fs').readFileSync(indexJs, 'utf-8');
  const hasZh = js.includes('"zh-CN"');
  console.log(`  ${hasZh ? '✓' : '✗'} index JS: ${hasZh ? '已包含 zh-CN' : '未包含 zh-CN'}`);
} else {
  console.log('  - 未找到 index JS');
}

// locale 配置
console.log('\n--- 用户配置 ---');
const configFile = path.join(process.env.APPDATA || '', 'Claude-3p', 'config.json');
if (require('fs').existsSync(configFile)) {
  const cfg = readJSON(configFile);
  console.log(`  config.json: locale = ${cfg?.locale || '未设置'}`);
} else {
  console.log('  config.json: 不存在');
}

// 翻译覆盖率
console.log('\n--- 翻译覆盖率 ---');
const en = readJSON(path.join(i18nDir, 'en-US.json'));
const zh = readJSON(path.join(i18nDir, 'zh-CN.json'));
if (en && zh) {
  const stillEn = Object.keys(zh).filter(k => en[k] && zh[k] === en[k]).length;
  const coverage = Math.round((1 - stillEn / Object.keys(en).length) * 10000) / 100;
  console.log(`  key 数: ${Object.keys(zh).length} / ${Object.keys(en).length}`);
  console.log(`  覆盖率: ${coverage}%`);
  console.log(`  英文:   ${stillEn} 条`);
} else if (zh) {
  console.log('  zh-CN 已部署');
} else {
  console.log('  zh-CN 未部署');
}
