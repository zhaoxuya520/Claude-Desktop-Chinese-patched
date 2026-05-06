/**
 * 最终验证脚本
 * 检查所有汉化是否已正确部署
 */
const fs = require('fs');
const path = require('path');
const claude = require('./find-claude');

const CLR = { R: '\x1b[31m', G: '\x1b[32m', Y: '\x1b[33m', B: '\x1b[34m', N: '\x1b[0m' };

function ok(msg)  { console.log('  ' + CLR.G + '✓' + CLR.N + ' ' + msg); }
function info(msg){ console.log('  ' + CLR.B + '·' + CLR.N + ' ' + msg); }
function fail(msg){ console.log('  ' + CLR.R + '✗' + CLR.N + ' ' + msg); }

function main() {
  console.log('');
  console.log('  Claude Desktop 汉化最终验证');
  console.log('  ' + '='.repeat(35));
  console.log();

  const claudeDir = claude.findClaudePackage();
  if (!claudeDir) { fail('未找到 Claude'); process.exit(1); }

  const appRes = claude.getResourcesDir(claude.getAppDir(claudeDir));
  const i18nDir = claude.getI18nDir(appRes);
  const assetsDir = claude.getAssetsDir(appRes);
  const indexJs = claude.findIndexJs(appRes);
  const version = claude.getVersion(claudeDir);

  console.log('  Claude: ' + version);
  console.log('  Dir:    ' + path.basename(claudeDir));
  console.log('');

  // ── 1. 翻译文件 ──
  console.log('  ' + CLR.Y + '【翻译文件】' + CLR.N + '');
  const checks = [
    ['桌面 zh-CN.json',  path.join(appRes, 'zh-CN.json')],
    ['前端 zh-CN.json',  path.join(i18nDir, 'zh-CN.json')],
    ['Statsig zh-CN.json', path.join(i18nDir, 'statsig', 'zh-CN.json')],
  ];
  for (const [label, fp] of checks) {
    if (fs.existsSync(fp)) {
      const size = fs.statSync(fp).size;
      ok(label + ' (' + (size/1024).toFixed(0) + ' KB)');
    } else {
      fail(label + ' — 缺失');
    }
  }

  // ── 2. 语言白名单 ──
  console.log('');
  console.log('  ' + CLR.Y + '【语言白名单】' + CLR.N + '');
  if (indexJs) {
    const js = fs.readFileSync(indexJs, 'utf-8');
    if (js.includes('"zh-CN"')) {
      ok('index.js 白名单已包含 zh-CN');
      const wl = js.match(/\["en-US"[^\]]+\]/);
      if (wl) info('白名单: ' + wl[0].substring(0, 60) + '...');
    } else {
      fail('index.js 白名单缺失 zh-CN');
    }
  }

  // ── 3. locale ──
  console.log('');
  console.log('  ' + CLR.Y + '【区域设置】' + CLR.N + '');
  const configFile = path.join(process.env.APPDATA, 'Claude-3p', 'config.json');
  if (fs.existsSync(configFile)) {
    try {
      const cfg = JSON.parse(fs.readFileSync(configFile, 'utf-8'));
      if (cfg.locale === 'zh-CN') ok('locale = zh-CN');
      else fail('locale = ' + cfg.locale);
    } catch (e) {
      fail('config.json 解析失败');
    }
  } else {
    fail('config.json 不存在');
  }

  // ── 4. 关键 JS 补丁 ──
  console.log('');
  console.log('  ' + CLR.Y + '【关键 JS 补丁】' + CLR.N + '');
  const patchChecks = [
    ['3P 描述中文',  assetsDir + '/c71860c77-BhZmb39A.js', '允许用户安装本地桌面扩展'],
    ['筛选菜单中文', assetsDir + '/ca0135bc5-xareMCeM.js', 'label:"状态"'],
    ['侧边栏中文',   assetsDir + '/cef89a333-07BjY8B0.js', 'children:"项目"'],
    ['折叠侧边栏',   assetsDir + '/c9500abe8-DoMpJ9IM.js', '折叠侧边栏'],
    ['展开侧边栏',   assetsDir + '/cbc59a8af-D4zw98by.js', '展开侧边栏'],
    ['新建会话',     assetsDir + '/index-BNbM_KX7.js', '新建会话'],
    ['新任务',       assetsDir + '/index-BNbM_KX7.js', '新任务'],
    ['New chat',     assetsDir + '/index-BNbM_KX7.js', '新聊天'],
    ['搜索占位符',   assetsDir + '/cfb32df74-DUAIAzpi.js', 'placeholder:s="搜索…"'],
    ['未命名',       assetsDir + '/c1b9abf13-C9VBbaXS.js', 'return e.name||"未命名"'],
    ['来源:本地',    assetsDir + '/ca0135bc5-xareMCeM.js', 'jl="本地"'],
    ['来源:云端',    assetsDir + '/ca0135bc5-xareMCeM.js', 'Cl="云端"'],
    ['来源:远程控制',assetsDir + '/ca0135bc5-xareMCeM.js', 'Ml="远程控制"'],
    ['侧边栏折叠按钮',assetsDir + '/cef89a333-07BjY8B0.js', 'title:"折叠侧边栏 ([)"'],
  ];
  for (const [label, fp, search] of patchChecks) {
    if (!fs.existsSync(fp)) { fail(label + ' — 文件缺失'); continue; }
    const c = fs.readFileSync(fp, 'utf-8');
    if (c.includes(search)) ok(label);
    else fail(label + ' — 未找到: ' + search.substring(0, 30));
  }

  // ── 5. 新增扫残留补丁 ──
  console.log('');
  console.log('  ' + CLR.Y + '【新增扫残留补丁】' + CLR.N + '');
  const newPatchChecks = [
    ['删除旧会话',     assetsDir + '/ca0135bc5-xareMCeM.js', 'title:"删除旧会话？"'],
    ['导入 Operon',    assetsDir + '/cef89a333-07BjY8B0.js', 'title:"导入为 Operon 产物"'],
    ['预览',           assetsDir + '/c11959232-DOs6p9wB.js', 'title:"预览"'],
    ['项目',           assetsDir + '/c1b9abf13-C9VBbaXS.js', 'title:"项目"'],
    ['编辑会话',       assetsDir + '/cbd92287a--4Rb5wSp.js', 'title:"编辑会话"'],
    ['标题列',         assetsDir + '/cf52a4cc1-CG_4J2bE.js', 'title:"标题"'],
    ['仓库列',         assetsDir + '/cf52a4cc1-CG_4J2bE.js', 'repository:"仓库"'],
    ['最后修改列',     assetsDir + '/cf52a4cc1-CG_4J2bE.js', 'modified:"最后修改"'],
    ['状态列',         assetsDir + '/cf52a4cc1-CG_4J2bE.js', 'status:"状态"'],
    ['自动修复列',     assetsDir + '/cf52a4cc1-CG_4J2bE.js', 'auto_toggles:"自动修复与合并"'],
  ];
  for (const [label, fp, search] of newPatchChecks) {
    if (!fs.existsSync(fp)) { fail(label + ' — 文件缺失'); continue; }
    const c = fs.readFileSync(fp, 'utf-8');
    if (c.includes(search)) ok(label);
    else fail(label + ' — 未找到: ' + search.substring(0, 30));
  }

  // ── 6. 覆盖率统计 ──
  console.log('');
  console.log('  ' + CLR.Y + '【翻译覆盖率】' + CLR.N + '');
  const enI18n = path.join(i18nDir, 'en-US.json');
  const zhI18n = path.join(i18nDir, 'zh-CN.json');
  if (fs.existsSync(enI18n) && fs.existsSync(zhI18n)) {
    const en = JSON.parse(fs.readFileSync(enI18n, 'utf-8'));
    const zh = JSON.parse(fs.readFileSync(zhI18n, 'utf-8'));
    const enKeys = Object.keys(en).length;
    const zhKeys = Object.keys(zh).length;
    const stillEn = Object.keys(zh).filter(k => en[k] && zh[k] === en[k]).length;
    const coverage = Math.round((1 - stillEn / enKeys) * 10000) / 100;
    ok('en-US: ' + enKeys + ' keys');
    ok('zh-CN: ' + zhKeys + ' keys');
    ok('覆盖率: ' + coverage + '%');
    ok('仍为英文: ' + stillEn + ' 条（品牌/格式/缩写）');
  }

  console.log('');
  console.log('  ' + '='.repeat(35));
  console.log('  验证完成！重启 Claude Desktop 生效。');
  console.log('  ' + '='.repeat(35));
  console.log('');
}

main();
