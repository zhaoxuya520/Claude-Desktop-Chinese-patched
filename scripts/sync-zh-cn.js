/**
 * Claude Desktop 汉化同步工具
 *
 * 当 Claude 更新后，对比新 en-US 与我们的 zh-CN，报告差异：
 *   - 新增 key（需要翻译）
 *   - 英文值变更（已有翻译可能过时）
 *   - 已删除 key（可以清理）
 *   - 仍需翻译
 *
 * 用法:
 *   node sync-zh-cn.js                      # 仅报告
 *   node sync-zh-cn.js --sync               # 同步结构（新增/删除 key）
 *   node sync-zh-cn.js --sync --write       # 同步并保存到文件
 *   node sync-zh-cn.js --snapshot           # 更新快照（翻译完成后）
 */
const fs = require('fs');
const path = require('path');
const claude = require('./find-claude');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const RESOURCES = path.join(PROJECT_ROOT, 'resources');

// 翻译文件
const ZH_FRONTEND = path.join(RESOURCES, 'frontend-zh-CN.json');
const ZH_DESKTOP = path.join(RESOURCES, 'desktop-zh-CN.json');

// en-US 快照（部署时保存）
const EN_SNAPSHOT = path.join(RESOURCES, '.last-en-US-snapshot.json');

const args = process.argv.slice(2);
const doSync = args.includes('--sync');
const doWrite = args.includes('--write');
const doSnapshot = args.includes('--snapshot');

function readJSON(p) {
  if (!fs.existsSync(p)) return null;
  try { return JSON.parse(fs.readFileSync(p, 'utf-8')); }
  catch (e) { return null; }
}

function analyze(label, enPath, zhPath) {
  const en = readJSON(enPath);
  const zh = readJSON(zhPath);
  const snapshot = readJSON(EN_SNAPSHOT);

  if (!en || !zh) {
    console.log(`  [${label}] 跳过: 无法读取文件`);
    return;
  }

  const enKeys = Object.keys(en);
  const zhKeys = Object.keys(zh);

  // 新增 key（en 有，zh 无）
  const newKeys = enKeys.filter(k => zh[k] === undefined);

  // 已删除 key（zh 有，en 无）
  const removedKeys = zhKeys.filter(k => en[k] === undefined);

  // 英文值变更（key 相同，但英文原文变了）
  // 需要快照才能检测
  let changedEnglish = [];
  if (snapshot) {
    changedEnglish = enKeys.filter(k =>
      zh[k] !== undefined &&
      snapshot[k] !== undefined &&
      snapshot[k] !== en[k] &&
      zh[k] !== en[k] // 我们的翻译和旧英文不同（说明已经翻译过）
    );
  }

  // 仍需翻译（zh 值 === 英文原文）
  const stillEnglish = enKeys.filter(k =>
    zh[k] !== undefined && en[k] && zh[k] === en[k]
  );

  console.log(`\n  [${label}]`);
  console.log(`  key 数:       ${enKeys.length} (en) / ${zhKeys.length} (zh)`);
  if (newKeys.length > 0) console.log(`  新增 key:     ${newKeys.length}`);
  if (removedKeys.length > 0) console.log(`  已删除 key:   ${removedKeys.length}`);
  if (changedEnglish.length > 0) console.log(`  英文已变更:   ${changedEnglish.length}`);
  console.log(`  仍需翻译:     ${stillEnglish.length}`);
  console.log(`  覆盖率:       ${Math.round((1 - stillEnglish.length / enKeys.length) * 10000) / 100}%`);

  if (newKeys.length > 0) {
    console.log(`\n  --- 需翻译: 新增 key (前20) ---`);
    newKeys.slice(0, 20).forEach(k => console.log(`    ${k}: ${en[k].substring(0, 80)}`));
    if (newKeys.length > 20) console.log(`    ... 还有 ${newKeys.length - 20} 条`);
  }

  if (changedEnglish.length > 0) {
    console.log(`\n  --- ⚠ 需审查: 英文原文已变更 (前10) ---`);
    changedEnglish.slice(0, 10).forEach(k => {
      console.log(`    ${k}:`);
      console.log(`      旧: ${snapshot[k].substring(0, 60)}`);
      console.log(`      新: ${en[k].substring(0, 60)}`);
      console.log(`      译: ${zh[k].substring(0, 60)}`);
    });
    if (changedEnglish.length > 10) console.log(`    ... 还有 ${changedEnglish.length - 10} 条`);
  }

  if (stillEnglish.length > 0 && newKeys.length === 0) {
    console.log(`\n  仍为英文 (前10):`);
    stillEnglish.slice(0, 10).forEach(k => console.log(`    ${k}: ${en[k].substring(0, 80)}`));
    if (stillEnglish.length > 10) console.log(`    ... 还有 ${stillEnglish.length - 10} 条`);
  }

  // ── 同步 ──
  if (doSync && (newKeys.length > 0 || removedKeys.length > 0)) {
    for (const k of newKeys) zh[k] = en[k];
    for (const k of removedKeys) delete zh[k];
    console.log(`\n  [同步] 新增 ${newKeys.length} / 删除 ${removedKeys.length}`);

    if (doWrite) {
      fs.writeFileSync(zhPath, JSON.stringify(zh, null, 2) + '\n', 'utf-8');
      console.log(`  [同步] 已保存`);
    } else {
      console.log(`  [同步] 使用 --write 保存`);
    }
  }
}

// ── 主 ───────────────────────────────────────────
console.log('========================================');
console.log('  Claude Desktop 汉化同步工具');
console.log('========================================\n');

// 检测 Claude 安装
const claudeDir = claude.findClaudePackage();
if (!claudeDir) {
  console.error('[-] 未找到 Claude 安装');
  process.exit(1);
}
console.log('[*] 检测到:', path.basename(claudeDir));

const appDir = claude.getAppDir(claudeDir);
const appRes = claude.getResourcesDir(appDir);
const i18nDir = claude.getI18nDir(appRes);

const enFrontend = path.join(i18nDir, 'en-US.json');
const enDesktop = path.join(appRes, 'en-US.json');

console.log('[*] 快照:', fs.existsSync(EN_SNAPSHOT) ? '有 ✓' : '无（首次部署后自动生成）');

// 只更新快照
if (doSnapshot) {
  if (fs.existsSync(enFrontend)) {
    fs.copyFileSync(enFrontend, EN_SNAPSHOT);
    console.log('\n[*] 快照已更新');
  }
  process.exit(0);
}

// 分析
console.log('\n--- 前端翻译 ---');
analyze('frontend', enFrontend, ZH_FRONTEND);

console.log('\n--- 桌面翻译 ---');
analyze('desktop', enDesktop, ZH_DESKTOP);

console.log('\n---');
if (!doSync) {
  console.log('命令:');
  console.log('  --sync          同步结构（新增 key + 删除陈旧 key）');
  console.log('  --sync --write  同步并保存');
  console.log('  --snapshot      更新 en-US 快照（翻译完成后）');
  console.log('\n工作流:');
  console.log('  1. Claude 更新后 → 先部署新版本 → 再 node sync-zh-cn.js');
  console.log('  2. 翻译新增的 key');
  console.log('  3. 审查"英文已变更"的条目');
  console.log('  4. node sync-zh-cn.js --snapshot（更新快照）');
  console.log('  5. 重新部署 → 重启 Claude');
}
