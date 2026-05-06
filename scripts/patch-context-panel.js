/**
 * 上下文面板文本换行补丁
 *
 * 问题：Tailwind 的 truncate 类在处理中文文本时，中文可能在 flex
 * 容器中换行（因为中文没有自然断词，浏览器可能在任意位置断行）。
 * 修复：将 className 中的 truncate 替换为 whitespace-nowrap overflow-hidden text-ellipsis，
 * 明确指定不换行。
 *
 * 受影响文件：
 * - c65a6a59c-jMsHVRss.js  (CoworkContext 上下文卡片)
 * - c11959232-DOs6p9wB.js  (会话列表项)
 *
 * 用法:
 *   node patch-context-panel.js                  # 修补系统安装
 *   node patch-context-panel.js <assetsDir>      # 修补指定 assets 目录
 */
const fs = require('fs');
const path = require('path');
const claude = require('./find-claude');

// 可选：第一个参数为 assets 目录（用于独立副本模式）
const ASSETS = process.argv[2]
  ? process.argv[2]
  : (() => {
      const claudeDir = claude.findClaudePackage();
      if (!claudeDir) { console.error('✗ 未找到 Claude Desktop 安装'); process.exit(1); }
      return claude.getAssetsDir(claude.getResourcesDir(claude.getAppDir(claudeDir)));
    })();

// ── 目标文件 ──
const TARGET_FILES = [
  'c65a6a59c-jMsHVRss.js',  // CoworkContext 卡片
  'c11959232-DOs6p9wB.js',  // 会话列表项
];

// ── 替换规则 ──
const REPLACEMENTS = [
  // CoworkContext 卡片中的 truncate → whitespace-nowrap overflow-hidden
  [/flex-1 truncate/g,          'flex-1 whitespace-nowrap overflow-hidden'],
  [/text-t8 flex-1 truncate/g,  'text-t8 flex-1 whitespace-nowrap overflow-hidden'],
  [/text-t6 flex-1 truncate/g, 'text-t6 flex-1 whitespace-nowrap overflow-hidden'],
  [/text-footnote text-t6 truncate flex-1 text-right/g,
    'text-footnote text-t6 whitespace-nowrap flex-1 text-right'],

  // 会话列表项中的 truncate（在 className 属性中）
  // 使用正则替换 className="..." 中的 truncate
];

function backupFile(filePath) {
  const backupDir = path.join(
    process.env.LOCALAPPDATA || process.env.USERPROFILE,
    'Claude-zh-CN-backup', 'patches'
  );
  const rel = path.basename(filePath);
  const dst = path.join(backupDir, rel);
  if (fs.existsSync(dst)) return;
  fs.mkdirSync(backupDir, { recursive: true });
  try {
    const content = fs.readFileSync(filePath);
    fs.writeFileSync(dst, content);
    console.log('  ✓ 已备份: ' + rel);
  } catch (e) {
    console.log('  · 备份跳过（不影响补丁）: ' + rel);
  }
}

function patchFile(filePath, fileName) {
  let content = fs.readFileSync(filePath, 'utf-8');

  // 检查是否已修补
  if (content.includes('whitespace-nowrap')) {
    console.log('  → ' + fileName + ' (已修补，跳过)');
    return 0;
  }

  let changed = 0;
  let newContent = content;

  // 应用简单字符串替换
  for (const [search, replace] of REPLACEMENTS) {
    const count = (newContent.match(search) || []).length;
    if (count > 0) {
      newContent = newContent.replace(search, replace);
      changed += count;
    }
  }

  // 会话列表 JS：替换 className 属性中的 truncate
  // className:"..." 中的 truncate → whitespace-nowrap overflow-hidden text-ellipsis
  if (fileName === 'c11959232-DOs6p9wB.js') {
    const classNameTruncateRegex = /(className:"[^"]*)truncate([^"]*")/g;
    let match;
    const classNameMatches = [];
    while ((match = classNameTruncateRegex.exec(content)) !== null) {
      classNameMatches.push(match[0]);
    }
    if (classNameMatches.length > 0) {
      newContent = content.replace(classNameTruncateRegex, (full, before, after) => {
        return `${before}whitespace-nowrap overflow-hidden text-ellipsis${after}`;
      });
      changed += classNameMatches.length;
    }
  }

  if (changed > 0) {
    backupFile(filePath);
    fs.writeFileSync(filePath, newContent, 'utf-8');
    console.log('  → ' + fileName + ' (' + changed + ' 处)');
  } else {
    console.log('  → ' + fileName + ' (无需修补)');
  }

  return changed;
}

function main() {
  console.log('');
  console.log('  上下文面板文本换行补丁');
  console.log('  ' + '='.repeat(35));
  console.log('');

  if (!fs.existsSync(ASSETS)) {
    console.error('  ✗ 未找到 assets 目录: ' + ASSETS);
    process.exit(1);
  }

  let totalChanged = 0;

  for (const fileName of TARGET_FILES) {
    const filePath = path.join(ASSETS, fileName);
    if (!fs.existsSync(filePath)) {
      console.log('  · ' + fileName + ' (文件不存在，跳过)');
      continue;
    }
    totalChanged += patchFile(filePath, fileName);
  }

  console.log('');
  if (totalChanged > 0) {
    console.log('  ✓ 修补完成，共 ' + totalChanged + ' 处');
    console.log('  (重启 Claude Desktop 即可生效)');
  } else {
    console.log('  · 没有需要修补的内容');
  }
  console.log('');
}

main();
