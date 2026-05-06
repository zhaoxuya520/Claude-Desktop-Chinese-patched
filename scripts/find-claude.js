/**
 * 共享模块：Claude Desktop 安装目录检测 + 路径映射
 *
 * 所有脚本通过此模块统一获取 Claude 安装信息，避免路径硬编码。
 */
const fs = require('fs');
const path = require('path');

const WINDOWSAPPS = 'C:\\Program Files\\WindowsApps';

// ── Claude 检测 ─────────────────────────────

function findClaudePackage() {
  if (!fs.existsSync(WINDOWSAPPS)) return null;
  const entries = fs.readdirSync(WINDOWSAPPS)
    .filter(e => e.startsWith('Claude_'))
    .sort(compareVersion)
    .reverse();
  if (entries.length === 0) return null;
  return path.join(WINDOWSAPPS, entries[0]);
}

/** 按版本号排序（Claude_1.5354.0.0_... 格式） */
function compareVersion(a, b) {
  const va = (a.match(/Claude_([\d.]+)/) || [])[1];
  const vb = (b.match(/Claude_([\d.]+)/) || [])[1];
  if (!va || !vb) return a.localeCompare(b);
  const pa = va.split('.').map(Number);
  const pb = vb.split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const diff = (pa[i] || 0) - (pb[i] || 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

// ── 路径解析 ────────────────────────────────

function getAppDir(packageDir)    { return path.join(packageDir, 'app'); }
function getResourcesDir(appDir) { return path.join(appDir, 'resources'); }
function getI18nDir(res)         { return path.join(res, 'ion-dist', 'i18n'); }
function getAssetsDir(res)       { return path.join(res, 'ion-dist', 'assets', 'v1'); }

function findIndexJs(res) {
  const dir = getAssetsDir(res);
  if (!fs.existsSync(dir)) return null;
  const files = fs.readdirSync(dir).filter(f => f.startsWith('index-') && f.endsWith('.js'));
  if (files.length === 0) return null;
  return path.join(dir, files.sort().reverse()[0]);
}

function isValidClaudeDir(pkg) {
  const res = getResourcesDir(getAppDir(pkg));
  return fs.existsSync(path.join(res, 'en-US.json')) ||
         fs.existsSync(path.join(getI18nDir(res), 'en-US.json'));
}

function getVersion(pkg) {
  return (path.basename(pkg).match(/Claude_([\d.]+)/) || [])[1] || 'unknown';
}

// ── 文件映射（部署/维护共用）────────────────

/**
 * 返回需要部署的翻译文件映射列表
 * @param {string} resourcesDir  - app/resources 目录
 * @param {string} projectRes    - 项目 resources 目录
 * @returns {{src:string, dst:string, label:string}[]}
 */
function getFileMappings(resourcesDir, projectRes) {
  const i18nDir = getI18nDir(resourcesDir);
  return [
    { src: path.join(projectRes, 'desktop-zh-CN.json'),  dst: path.join(resourcesDir, 'zh-CN.json'),                label: '桌面翻译' },
    { src: path.join(projectRes, 'frontend-zh-CN.json'), dst: path.join(i18nDir, 'zh-CN.json'),                     label: '前端翻译' },
    { src: path.join(projectRes, 'statsig-zh-CN.json'),  dst: path.join(i18nDir, 'statsig', 'zh-CN.json'),          label: 'Statsig 翻译' },
  ];
}

/**
 * 修补 index JS 的语言白名单，添加 zh-CN
 * @param {string} indexJsPath  - index-*.js 的完整路径
 * @returns {boolean}  是否成功修补
 */
function patchWhitelist(indexJsPath) {
  if (!fs.existsSync(indexJsPath)) return false;
  let js = fs.readFileSync(indexJsPath, 'utf-8');

  if (js.includes('"zh-CN"')) return true; // 已存在

  // 主匹配：标准 locale 数组
  const patterns = [
    /\["en-US"(?:,"[a-zA-Z]{2,3}(?:-[a-zA-Z0-9]{2,4})*")+\]/,
    // 回退：任何包含 en-US 且看起来像 locale 列表的数组
    /\["[a-z]{2,3}(?:-[a-zA-Z0-9]{2,4})?"(?:,"[a-z]{2,3}(?:-[a-zA-Z0-9]{2,4})?")+\]/,
  ];

  for (const re of patterns) {
    const m = js.match(re);
    if (m) {
      // 验证这确实是一个 locale 列表（包含常见 locale）
      const matched = m[0];
      if (!matched.includes('"en-US"') && patterns.indexOf(re) > 0) continue;
      const patched = matched.slice(0, -1) + ',"zh-CN"]';
      js = js.replace(matched, patched);
      fs.writeFileSync(indexJsPath, js, 'utf-8');
      return true;
    }
  }
  return false;
}

module.exports = {
  WINDOWSAPPS,
  findClaudePackage,
  getAppDir,
  getResourcesDir,
  getI18nDir,
  getAssetsDir,
  findIndexJs,
  isValidClaudeDir,
  getVersion,
  getFileMappings,
  patchWhitelist,
  compareVersion,
};
