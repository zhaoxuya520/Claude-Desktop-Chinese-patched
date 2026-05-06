/**
 * 翻译质量深度扫描
 * 检查常见机器翻译问题
 */
const fs = require('fs');
const path = require('path');

// Load find-claude module inline to avoid require path issues
const findClaudeCode = fs.readFileSync(
  'E:/Claude code/Chinese/claude-desktop-zh-cn/scripts/find-claude.js', 'utf-8');
const mod = { exports: {} };
Function('require', 'module', 'exports', findClaudeCode)(require, mod, mod.exports);
const claude = mod.exports;

const dir = claude.findClaudePackage();
const i18nDir = claude.getI18nDir(claude.getResourcesDir(claude.getAppDir(dir)));
const appRes = claude.getResourcesDir(claude.getAppDir(dir));

const en = JSON.parse(fs.readFileSync(path.join(i18nDir, 'en-US.json'), 'utf-8'));
const zh = JSON.parse(fs.readFileSync(
  'E:/Claude code/Chinese/claude-desktop-zh-cn/resources/frontend-zh-CN.json', 'utf-8'));

const issues = [];

// 1. 'single' mistranslated as 单身 (should be 单个/单一)
for (const [k, v] of Object.entries(zh)) {
  if (!en[k] || v === en[k]) continue;
  if (/单身/.test(v) && !/单身汉/.test(en[k])) {
    issues.push({ key: k, type: '单身误译', en: en[k].slice(0, 60), zh: v.slice(0, 60) });
  }
}

// 2. Obvious MT errors - English idioms translated literally
const idiomChecks = [
  { pattern: /水平的|的水平/, desc: 'level of 可能啰嗦' },
];
for (const [k, v] of Object.entries(zh)) {
  if (!en[k] || v === en[k]) continue;
  for (const ic of idiomChecks) {
    if (ic.pattern.test(v)) {
      issues.push({ key: k, type: ic.desc, en: en[k].slice(0, 60), zh: v.slice(0, 60) });
    }
  }
}

// 3. HTML tag count mismatch
for (const [k, v] of Object.entries(zh)) {
  if (!en[k] || v === en[k]) continue;
  const enTags = (en[k].match(/<\/?[a-z][a-z0-9]*\b/gi) || []).length;
  const zhTags = (v.match(/<\/?[a-z][a-z0-9]*\b/gi) || []).length;
  if (enTags !== zhTags && enTags > 0) {
    issues.push({
      key: k,
      type: 'HTML标签不匹配',
      en: en[k].slice(0, 80),
      zh: v.slice(0, 80),
      detail: `EN:${enTags}个标签, ZH:${zhTags}个标签`
    });
  }
}

// 4. Brand name consistency
const brands = [
  { name: 'GitHub', zh: ['GitHub', 'github'], shouldContain: 'GitHub' },
  { name: 'VS Code', zh: ['VS Code', 'vs code', 'VS code'], shouldContain: 'VS Code' },
];
for (const [k, v] of Object.entries(zh)) {
  if (!en[k] || v === en[k]) continue;
  for (const b of brands) {
    // Only check if English contains this brand
    if (en[k].includes(b.name) && !v.includes(b.shouldContain)) {
      issues.push({
        key: k,
        type: `品牌名"${b.name}"可能被翻译`,
        en: en[k].slice(0, 60),
        zh: v.slice(0, 60)
      });
    }
  }
}

// 5. Desktop translations check
const desktopEn = JSON.parse(fs.readFileSync(path.join(appRes, 'en-US.json'), 'utf-8'));
const desktopZh = JSON.parse(fs.readFileSync(path.join(appRes, 'zh-CN.json'), 'utf-8'));

for (const [k, v] of Object.entries(desktopZh)) {
  if (!desktopEn[k] || v === desktopEn[k]) continue;
  // Check for still-English desktop keys
  if (v === desktopEn[k]) {
    // Already known (format strings)
    continue;
  }
}

// ── 输出 ──
console.log('========================================');
console.log('  翻译质量深度扫描');
console.log('========================================\n');

const groups = {};
for (const issue of issues) {
  if (!groups[issue.type]) groups[issue.type] = [];
  groups[issue.type].push(issue);
}

for (const [type, items] of Object.entries(groups)) {
  console.log(`[${type}] (${items.length})`);
  for (const item of items.slice(0, 15)) {
    console.log(`  ${item.key}`);
    console.log(`    EN: ${item.en}`);
    console.log(`    ZH: ${item.zh}`);
    if (item.detail) console.log(`    !  ${item.detail}`);
  }
  if (items.length > 15) console.log(`    ... 还有 ${items.length - 15} 条`);
  console.log('');
}

console.log(`总计: ${issues.length} 个潜在问题`);
