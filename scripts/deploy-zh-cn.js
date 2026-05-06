/**
 * Claude Desktop 汉化部署脚本
 *
 * 将 zh-CN 翻译文件部署到 WindowsApps 官方安装目录。
 * 流程：备份 → 取权限 → 复制 → 白名单 → locale → 快照 → 验证
 *
 * 用法：
 *   node deploy-zh-cn.js         # 需管理员
 *   deploy-zh-cn.bat             # 双击自动提权
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const claude = require('./find-claude');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const RESOURCES = path.join(PROJECT_ROOT, 'resources');
const BACKUP_ROOT = path.join(
  process.env.LOCALAPPDATA || process.env.USERPROFILE,
  'Claude-zh-CN-backup'
);
const EN_SNAPSHOT = path.join(RESOURCES, '.last-en-US-snapshot.json');

function log(...args)  { console.log(...args); }
function ok(msg)       { log('  ✓ ' + msg); }
function info(msg)     { log('  · ' + msg); }
function fail(msg)     { log('  ✗ ' + msg); }

function takeOwnership(dir) {
  try { execSync(`takeown /F "${dir}" /A /R /D Y 2>nul`, { stdio: 'pipe', timeout: 30000 }); } catch (_) {}
  try { execSync(`icacls "${dir}" /grant "Administrators:F" /T /Q 2>nul`, { stdio: 'pipe', timeout: 30000 }); } catch (_) {}
}

function backupFile(file, root) {
  if (!fs.existsSync(file)) return;
  const rel = path.relative(root, file);
  const dst = path.join(BACKUP_ROOT, rel);
  if (fs.existsSync(dst)) return;
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  try {
    const content = fs.readFileSync(file);
    fs.writeFileSync(dst, content);
    ok('已备份: ' + rel);
  } catch (e) {
    info('备份跳过: ' + rel + ' (' + e.message + ')');
  }
}

function main() {
  log('');
  log('  Claude Desktop 汉化部署');
  log('  ' + '='.repeat(30));
  log('');

  // ── 管理员 ──
  let isAdmin = false;
  try { execSync('net session', { stdio: 'ignore' }); isAdmin = true; } catch (_) {}
  if (!isAdmin) {
    fail('需要管理员权限。请使用 deploy-zh-cn.bat 或以管理员身份运行。');
    process.exit(1);
  }

  // ── 检测 Claude ──
  const claudeDir = claude.findClaudePackage();
  if (!claudeDir)                    { fail('未找到 Claude Desktop 安装'); process.exit(1); }
  if (!claude.isValidClaudeDir(claudeDir)) { fail('目录结构异常: ' + claudeDir); process.exit(1); }

  const appDir = claude.getAppDir(claudeDir);
  const appRes = claude.getResourcesDir(appDir);
  const i18nDir = claude.getI18nDir(appRes);
  const version = claude.getVersion(claudeDir);
  log('Claude: ' + path.basename(claudeDir));
  log('版本:   ' + version);

  // ── 检查源文件 ──
  const files = claude.getFileMappings(appRes, RESOURCES);
  for (const f of files) {
    if (!fs.existsSync(f.src)) { fail('源文件缺失: ' + path.relative(PROJECT_ROOT, f.src)); process.exit(1); }
    info(f.label + ': ' + path.basename(f.src));
  }

  // ── 备份 ──
  log('备份原始文件...');
  backupFile(path.join(appRes, 'en-US.json'), appRes);
  backupFile(path.join(i18nDir, 'en-US.json'), appRes);
  backupFile(path.join(i18nDir, 'statsig', 'en-US.json'), appRes);
  const indexJs = claude.findIndexJs(appRes);
  if (indexJs) backupFile(indexJs, appRes);

  // ── 取权限 ──
  log('获取 WindowsApps 权限...');
  takeOwnership(appRes);

  // ── 保存 en-US 快照 ──
  const enI18n = path.join(i18nDir, 'en-US.json');
  if (fs.existsSync(enI18n)) {
    try {
      const snapContent = fs.readFileSync(enI18n, 'utf-8');
      fs.mkdirSync(path.dirname(EN_SNAPSHOT), { recursive: true });
      fs.writeFileSync(EN_SNAPSHOT, snapContent, 'utf-8');
      ok('en-US 快照已保存');
    } catch (e) {
      info('快照保存跳过: ' + e.message);
    }
  }

  // ── 复制 ──
  log('部署翻译文件...');
  for (const f of files) {
    fs.mkdirSync(path.dirname(f.dst), { recursive: true });
    fs.copyFileSync(f.src, f.dst);
    ok(f.label);
  }

  // ── 白名单 ──
  log('语言白名单...');
  if (indexJs) {
    if (claude.patchWhitelist(indexJs)) {
      ok(indexJs ? '已包含/已添加 zh-CN' : '');
    } else {
      info('未找到白名单模式，可能需要手动检查');
    }
  }

  // ── locale ──
  log('设置 locale...');
  const configDir = path.join(process.env.APPDATA, 'Claude-3p');
  const configFile = path.join(configDir, 'config.json');
  fs.mkdirSync(configDir, { recursive: true });
  let config = {};
  try {
    if (fs.existsSync(configFile)) config = JSON.parse(fs.readFileSync(configFile, 'utf-8'));
  } catch (_) {}
  if (config.locale !== 'zh-CN') {
    config.locale = 'zh-CN';
    fs.writeFileSync(configFile, JSON.stringify(config, null, 2) + '\n', 'utf-8');
  }
  ok('locale = zh-CN');

  // ── 验证 ──
  log('验证部署...');
  try {
    const en = JSON.parse(fs.readFileSync(enI18n, 'utf-8'));
    const zh = JSON.parse(fs.readFileSync(path.join(i18nDir, 'zh-CN.json'), 'utf-8'));
    const enKeys = Object.keys(en).length;
    const zhKeys = Object.keys(zh).length;
    const stillEn = Object.keys(zh).filter(k => en[k] && zh[k] === en[k]).length;
    const coverage = Math.round((1 - stillEn / enKeys) * 10000) / 100;

    ok('key 数:     ' + zhKeys + ' / ' + enKeys);
    ok('覆盖率:     ' + coverage + '%');
    ok('仍为英文:   ' + stillEn + ' 条（品牌/格式/缩写，合理）');

    if (indexJs) {
      const js = fs.readFileSync(indexJs, 'utf-8');
      ok('白名单:     ' + (js.includes('"zh-CN"') ? '已包含 zh-CN' : '未包含'));
    }

    log('');
    log('  ' + '='.repeat(30));
    log('  部署完成！重启 Claude Desktop 生效。');
    log('  ' + '='.repeat(30));
    log('');
  } catch (e) {
    fail('验证失败: ' + e.message);
    process.exit(1);
  }
}

main();
