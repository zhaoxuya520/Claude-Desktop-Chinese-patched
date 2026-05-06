/**
 * 自动维护脚本——检测 Claude 更新，自动重新部署汉化
 *
 * 由计划任务触发，每次用户登录时运行。
 * - 版本没变 → 立即退出（< 100ms，无感）
 * - 版本变了 → 自动：权限 → 复制 → 白名单 → locale → 快照
 *
 * 日志: %LOCALAPPDATA%/Claude-zh-CN/ensure.log
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const claude = require('./find-claude');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const RESOURCES = path.join(PROJECT_ROOT, 'resources');

// 数据目录（用户 AppData，不依赖项目位置）
const DATA_DIR = path.join(
  process.env.LOCALAPPDATA || process.env.USERPROFILE,
  'Claude-zh-CN'
);
const VERSION_MARKER = path.join(DATA_DIR, '.deployed-version');
const LOG_FILE = path.join(DATA_DIR, 'ensure.log');

function log(msg) {
  const time = new Date().toISOString().replace('T', ' ').slice(0, 19);
  try {
    fs.appendFileSync(LOG_FILE, `[${time}] ${msg}\n`, 'utf-8');
  } catch (_) {}
}

function main() {
  // 项目资源存在吗？
  if (!fs.existsSync(RESOURCES)) {
    log('项目目录缺失，跳过: ' + RESOURCES);
    return;
  }

  const currentDir = claude.findClaudePackage();
  if (!currentDir) {
    log('Claude 未安装，跳过');
    return;
  }

  const currentName = path.basename(currentDir);

  // 读取上次部署的版本
  let lastDeployed = '';
  try {
    if (fs.existsSync(VERSION_MARKER)) {
      lastDeployed = fs.readFileSync(VERSION_MARKER, 'utf-8').trim();
    }
  } catch (_) {}

  if (lastDeployed === currentName) return; // 无变更

  log(`检测到更新: ${lastDeployed || '(首次)'} → ${currentName}`);

  const appRes = claude.getResourcesDir(claude.getAppDir(currentDir));
  const i18nDir = claude.getI18nDir(appRes);

  // 检查源文件
  const files = claude.getFileMappings(appRes, RESOURCES);
  for (const f of files) {
    if (!fs.existsSync(f.src)) {
      log(`源文件缺失: ${path.relative(PROJECT_ROOT, f.src)}`);
      return;
    }
  }

  // 取权限
  try {
    execSync(`takeown /F "${appRes}" /A /R /D Y 2>nul`, { stdio: 'pipe', timeout: 30000 });
  } catch (_) {}
  try {
    execSync(`icacls "${appRes}" /grant "Administrators:F" /T /Q 2>nul`, { stdio: 'pipe', timeout: 30000 });
  } catch (_) {}

  // 复制
  for (const f of files) {
    const dir = path.dirname(f.dst);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    try {
      fs.copyFileSync(f.src, f.dst);
    } catch (e) {
      log(`复制失败: ${f.label} - ${e.code}`);
      return;
    }
  }
  log('翻译文件已复制');

  // 白名单
  const indexJs = claude.findIndexJs(appRes);
  if (indexJs) {
    try {
      if (claude.patchWhitelist(indexJs)) {
        const js = fs.readFileSync(indexJs, 'utf-8');
        if (js.includes('"zh-CN"')) log('白名单已确认');
      } else {
        log('白名单修补未匹配');
      }
    } catch (e) {
      log('白名单修补异常: ' + e.message);
    }
  }

  // locale
  const configDir = path.join(process.env.APPDATA, 'Claude-3p');
  const configFile = path.join(configDir, 'config.json');
  if (!fs.existsSync(configDir)) fs.mkdirSync(configDir, { recursive: true });
  try {
    let config = {};
    if (fs.existsSync(configFile)) {
      config = JSON.parse(fs.readFileSync(configFile, 'utf-8'));
    }
    if (config.locale !== 'zh-CN') {
      config.locale = 'zh-CN';
      fs.writeFileSync(configFile, JSON.stringify(config, null, 2) + '\n', 'utf-8');
      log('locale 已设置');
    }
  } catch (e) {
    log('locale 设置失败: ' + e.message);
  }

  // 版本标记
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(VERSION_MARKER, currentName, 'utf-8');
  } catch (e) {
    log('版本标记写入失败: ' + e.message);
  }

  // en-US 快照
  const snapshot = path.join(RESOURCES, '.last-en-US-snapshot.json');
  const enPath = path.join(i18nDir, 'en-US.json');
  if (fs.existsSync(enPath)) {
    try { fs.copyFileSync(enPath, snapshot); } catch (_) {}
  }

  log('自动部署完成');
}

main();
