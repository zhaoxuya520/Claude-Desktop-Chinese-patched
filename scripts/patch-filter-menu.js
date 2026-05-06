/**
 * 筛选菜单和侧边栏硬编码英文补丁
 *
 * 部分 UI 字符串（筛选菜单标签、排序选项等）在 JS 中硬编码为
 * label:"Status" / label:"Last activity" 等形式，无法通过
 * zh-CN.json 翻译。此脚本直接修补 JS 源码。
 *
 * 用法: node patch-filter-menu.js
 */
const fs = require('fs');
const path = require('path');
const claude = require('./find-claude');

const cliAssets = process.argv[2] || process.env.CLAUDE_ZH_ASSETS;
let ASSETS;
if (cliAssets) {
  ASSETS = path.resolve(cliAssets);
} else {
  const claudeDir = claude.findClaudePackage();
  if (!claudeDir) { console.error('✗ 未找到 Claude Desktop 安装'); process.exit(1); }
  ASSETS = claude.getAssetsDir(claude.getResourcesDir(claude.getAppDir(claudeDir)));
}

// ── 补丁列表 ──
// 格式：[搜索词, 替换词, 备注]
// 3P 设置页面补丁（来自 Patch-JsBundles.ps1 $PATCHES_3P）
// 注意：这些补丁不只限于 3P 文件，会应用到所有 JS 文件
const PATCHES_3P = [
  ['title:"Egress Requirements"',            'title:"出口要求"'],
  ['title:"Gateway base URL"',                'title:"自定义端点 URL"'],
  ['title:"Gateway API key"',                 'title:"自定义 API Key"'],
  ['title:"Gateway auth scheme"',             'title:"自定义认证方式"'],
  ['title:"Gateway extra headers"',           'title:"自定义请求头"'],
  ['title:"Allow desktop extensions"',        'title:"允许桌面扩展"'],
  ['title:"Show extension directory"',        'title:"显示扩展目录"'],
  ['title:"Require signed extensions"',       'title:"要求扩展签名"'],
  ['title:"Allow user-added MCP servers"',    'title:"允许用户添加 MCP 服务器"'],
  ['title:"Allow Claude Code tab"',           'title:"允许 Claude Code 标签页"'],
  ['title:"Secure VM features"',              'title:"安全虚拟机功能"'],
  ['title:"Require full VM sandbox"',         'title:"要求完整虚拟机沙盒"'],
  ['title:"Allowed egress hosts"',            'title:"允许的出口主机"'],
  ['title:"OpenTelemetry collector endpoint"','title:"遥测收集器端点"'],
  ['title:"OpenTelemetry exporter protocol"', 'title:"遥测导出协议"'],
  ['title:"OpenTelemetry exporter headers"',  'title:"遥测请求头"'],
  ['title:"OpenTelemetry resource attributes"','title:"遥测资源属性"'],
  ['title:"Auto-update enforcement window"',  'title:"自动更新强制窗口"'],
  ['title:"Block auto-updates"',              'title:"禁用自动更新"'],
  ['title:"Skip login-mode chooser"',         'title:"跳过登录模式选择"'],
  ['title:"Required organization"',           'title:"必需的组织"'],
  ['title:"Inference provider"',              'title:"推理供应商"'],
  ['title:"Max tokens per window"',           'title:"每窗口最大令牌数"'],
  ['title:"Token cap window"',                'title:"令牌上限窗口"'],
  ['title:"Connection"',                      'title:"连接方式"'],
  ['title:"Sandbox & workspace"',             'title:"沙盒与工作区"'],
  ['title:"Connectors & extensions"',         'title:"连接器与扩展"'],
  ['title:"Telemetry & updates"',             'title:"遥测与更新"'],
  ['title:"Usage limits"',                    'title:"用量限制"'],
  ['title:"Plugins & skills"',                'title:"插件与技能"'],
  ['title:"Egress Requirements"',             'title:"出口要求"'],
  ['title:"Block essential telemetry"',       'title:"阻止必需遥测"'],
  ['title:"Block nonessential telemetry"',    'title:"阻止非必需遥测"'],
  ['title:"Block nonessential services"',     'title:"阻止非必需服务"'],
  ['title:"Managed MCP servers"',             'title:"托管 MCP 服务器"'],
  ['title:"Disabled built-in tools"',         'title:"禁用的内置工具"'],
  ['title:"Allowed workspace folders"',       'title:"允许的工作区文件夹"'],
  ['title:"Credential helper script"',        'title:"凭据辅助脚本"'],
  ['title:"Credential helper TTL"',           'title:"凭据辅助 TTL"'],
  ['title:"Organization UUID"',               'title:"组织 UUID"'],
  ['title:"Model list"',                      'title:"模型列表"'],
  ['title:"Source"',                          'title:"来源"'],
  ['group:"Extensions"',                      'group:"扩展"'],
  // 注意："Extension" 单独作为 settings 分类标签，不涉及文件扩展名上下文

  // 供应商特定设置
  ['title:"GCP project ID"',                  'title:"GCP 项目 ID"'],
  ['title:"GCP region"',                      'title:"GCP 区域"'],
  ['title:"GCP credentials file path"',       'title:"GCP 凭据文件路径"'],
  ['title:"Vertex OAuth client ID"',          'title:"Vertex OAuth 客户端 ID"'],
  ['title:"Vertex OAuth client secret"',      'title:"Vertex OAuth 客户端密钥"'],
  ['title:"Vertex OAuth scopes"',             'title:"Vertex OAuth 范围"'],
  ['title:"Vertex AI base URL"',              'title:"Vertex AI 基础 URL"'],
  ['title:"AWS region"',                      'title:"AWS 区域"'],
  ['title:"AWS bearer token"',                'title:"AWS 承载令牌"'],
  ['title:"AWS profile name"',                'title:"AWS 配置名称"'],
  ['title:"AWS config directory"',            'title:"AWS 配置目录"'],
  ['title:"Bedrock base URL"',                'title:"Bedrock 基础 URL"'],
  ['title:"Bedrock service tier"',            'title:"Bedrock 服务层级"'],
  ['title:"Azure AI Foundry resource name"',  'title:"Azure AI Foundry 资源名称"'],
  ['title:"Azure AI Foundry API key"',        'title:"Azure AI Foundry API 密钥"'],
  ['title:"Use bootstrap config"',            'title:"使用启动配置"'],
  ['title:"Bootstrap config URL"',            'title:"启动配置 URL"'],
  ['title:"Bootstrap OIDC parameters"',       'title:"启动 OIDC 参数"'],
];

const PATCHES = [
  // ======== ca0135bc5-xareMCeM.js - 筛选菜单 ========
  ['label:"Status"',           'label:"状态"',           '筛选菜单: Status'],
  ['label:"Environment"',      'label:"环境"',           '筛选菜单: Environment'],
  ['label:"Last activity"',    'label:"最近活动"',        '筛选菜单: Last activity'],
  ['label:"Group by"',         'label:"分组依据"',        '筛选菜单: Group by'],
  ['label:"Sort by"',          'label:"排序方式"',        '筛选菜单: Sort by'],
  ['["active","Active"]',      '["active","进行中"]',     '筛选选项: Active'],
  ['["archived","Archived"]',  '["archived","已归档"]',   '筛选选项: Archived'],
  ['["all","All"]',            '["all","全部"]',          '筛选选项: All'],
  ['const jl="Local"',         'const jl="本地"',         '来源: Local'],
  ['const Cl="Cloud"',         'const Cl="云端"',         '来源: Cloud'],
  ['const Ml="Remote Control"','const Ml="远程控制"',     '来源: Remote Control'],
  ['["alpha","Alphabetically"]','["alpha","按字母顺序"]', '排序: Alphabetically'],
  ['["created","Created time"]','["created","创建时间"]', '排序: Created time'],
  ['["recency","Recency"]',    '["recency","最近活动"]',  '排序: Recency'],
  ['["1","1d"]',               '["1","1天"]',             '时段: 1d'],
  ['["3","3d"]',               '["3","3天"]',             '时段: 3d'],
  ['["7","7d"]',               '["7","7天"]',             '时段: 7d'],
  ['["30","30d"]',             '["30","30天"]',           '时段: 30d'],
  ['["0","All"]',              '["0","全部"]',            '时段: All'],
  ['jl="Local"',               'jl="本地"',               '来源: Local'],
  ['Cl="Cloud"',               'Cl="云端"',               '来源: Cloud'],
  ['Ml="Remote Control"',     'Ml="远程控制"',           '来源: Remote Control'],
  ['Fl="Recents"',             'Fl="最近"',               '侧边栏: Recents标签'],

  // ======== cef89a333-07BjY8B0.js - 侧边栏作用域按钮 ========
  ['children:"Project"',       'children:"项目"',          '侧边栏按钮: Project'],
  ['children:"Session"',       'children:"会话"',          '侧边栏按钮: Session'],
  ['label:"Active",sessions:', 'label:"进行中",sessions:', '侧边栏: Active群组'],

  // ======== 侧边栏导航项 ========
  ['label:"Customize"',        'label:"自定义"',          '侧边栏导航: Customize'],
  ['label:"Scheduled"',        'label:"已安排"',          '侧边栏导航: Scheduled'],

  // ======== 分组依据子选项 ========
  ['["date","Date"]',           '["date","日期"]',         '分组: Date'],
  ['["project","Project"]',     '["project","项目"]',      '分组: Project'],
  ['["state","State"]',         '["state","状态"]',        '分组: State'],
  ['["environment","Environment"]','["environment","环境"]','分组: Environment'],
  ['["none","None"]',           '["none","无"]',           '分组: None'],

  // ======== cbd92287a--4Rb5wSp.js - 侧边栏 Active 计数标签 ========
  ['label:"Active"',            'label:"进行中"',          '侧边栏: Active计数'],

  // ======== 通用 "全部" 按钮 ========
  ['children:"All"',           'children:"全部"',         '通用: All按钮'],
  ['{label:"All",count:',      '{label:"全部",count:',   '通用: All标签+计数'],

  // ======== cf52a4cc1-CG_4J2bE.js - 另一处筛选视图 ========
  ['label:"Repository"',       'label:"仓库"',            '筛选: Repository'],
  ['label:"Origin"',           'label:"来源"',            '筛选: Origin'],

  // ======== cef89a333-07BjY8B0.js - 侧边栏会话列表 ========
  // 侧边栏中 "Active" 会话分组标签
  ['{key:"active", label:"Active", sessions:', '{key:"active", label:"进行中", sessions:', '侧边栏: Active群组'],

  // ======== index-BNbM_KX7.js - 主入口 ========
  ['Recents:"Recents"',        'Recents:"最近"',          '侧边栏: Recents标签'],
  ['Shared:"Shared"',          'Shared:"已共享"',         '侧边栏: Shared标签'],
  ['active:"Active"',          'active:"进行中"',         '侧边栏Tab: Active'],
  ['archived:"Archived"',      'archived:"已归档"',       '侧边栏Tab: Archived'],
  ['all:"All"',                'all:"全部"',              '侧边栏Tab: All'],
  ['active:"No active tasks.', 'active:"无进行中的任务。', '侧边栏提示: Active'],
  ['archived:"No archived',    'archived:"无已归档的',    '侧边栏提示: Archived'],

  // ======== ca0135bc5-xareMCeM.js - 模式标签 ========
  ['chat:"New chat",cowork:"New task",code:"New session",operon:"New session"', 'chat:"新聊天",cowork:"新任务",code:"新建会话",operon:"新建会话"', '模式标签: Ll对象'],
  ['"Drag to pin tasks"', '"拖拽任务以固定"', '空状态: Drag to pin tasks'],
  ['"Let go"', '"松开"', '拖拽状态: Let go'],
  ['"Drop here"', '"放到这里"', '拖拽状态: Drop here'],
  ['"Drag to pin"', '"拖到这里固定"', '拖拽状态: Drag to pin'],
  ['"aria-label":`New session', '"aria-label":`新建会话', 'aria-label: New session'],

  // ======== cef89a333-07BjY8B0.js - 新建会话标签 ========
  ['title:"New session",focusedFrameId', 'title:"新建会话",focusedFrameId', '草稿标签: New session'],
  ['s.jsx(pe,{size:12}),"New session"', 's.jsx(pe,{size:12}),"新建会话"', 'JSX: New session(12)'],
  ['s.jsx(pe,{size:16}),"New session"', 's.jsx(pe,{size:16}),"新建会话"', 'JSX: New session(16)'],

  // ======== index-BNbM_KX7.js - 新建会话标签 ========
  ['epitaxy:{href:g4,label:"New session"}', 'epitaxy:{href:g4,label:"新建会话"}', '导航: New session'],
  ['description:"New session",icon:xA', 'description:"新建会话",icon:xA', '命令: New session'],

  // ======== index-BNbM_KX7.js - 新建任务/聊天 ========
  ['children:"cowork"===e?"New task":"New chat"', 'children:"cowork"===e?"新任务":"新聊天"', '按钮: New task/New chat'],
  ['children:"New task"', 'children:"新任务"', '按钮: New task'],
  ['baseDescription:"New chat"', 'baseDescription:"新聊天"', '基础描述: New chat'],

  // ======== c11959232-DOs6p9wB.js/c1b9abf13-C9VBbaXS.js - 未命名 ========
  ['"Untitled Session"', '"未命名会话"', '标题: Untitled Session'],
  ['"Untitled",isTitleLoading', '"未命名",isTitleLoading', '标题: Untitled'],
  ['return e.name||"Untitled"', 'return e.name||"未命名"', '函数: Untitled'],

  // ======== 折叠侧边栏 ========
  ['tooltip:"Collapse sidebar"', 'tooltip:"折叠侧边栏"', '工具提示: Collapse sidebar'],
  ['"Collapse sidebar"', '"折叠侧边栏"', 'collapse sidebar通用'],
  ['"Expand sidebar"', '"展开侧边栏"', 'Expand sidebar'],
  ['"aria-label":"Collapse sessions sidebar"', '"aria-label":"折叠会话侧边栏"', 'aria-label: Collapse sessions'],
  ['title:"Collapse sidebar (["', 'title:"折叠侧边栏 (["', '侧边栏按钮: Collapse sidebar标题'],
  ['title:"Collapse sidebar ([)"', 'title:"折叠侧边栏 ([)"', '侧边栏按钮: Collapse sidebar含括号'],

  // ======== 搜索框 ========
  ['placeholder:"Search projects"', 'placeholder:"搜索项目"', '占位符: Search projects'],
  ['placeholder:"Search skills…"', 'placeholder:"搜索技能…"', '占位符: Search skills'],
  ['placeholder:"Search connectors…"', 'placeholder:"搜索连接器…"', '占位符: Search connectors'],
  ['placeholder:"Search agents…"', 'placeholder:"搜索代理…"', '占位符: Search agents'],
  ['placeholder:s="Search…"', 'placeholder:s="搜索…"', '默认占位符: Search…'],
  ['children:"Search"', 'children:"搜索"', '标签: Search'],
  ['tooltip:"Search",tooltipKeyboardShortcut', 'tooltip:"搜索",tooltipKeyboardShortcut', '工具提示: Search'],
  ['"aria-label":"Search"', '"aria-label":"搜索"', 'aria-label: Search'],

  // ======== 新增扫残留补丁 ========
  ['title:"Delete older sessions?"',        'title:"删除旧会话？"',       '弹窗标题: Delete older sessions'],
  ['title:"Import as Operon artifact"',     'title:"导入为 Operon 产物"','标题: Import as Operon artifact'],
  ['title:"Preview"',                       'title:"预览"',              '标题: Preview（非 formatMessage）'],
  ['title:"Projects"',                      'title:"项目"',              '标题: Projects'],
  ['title:"Edit session"',                  'title:"编辑会话"',          '标题: Edit session'],
  ['{title:"Title"',                        '{title:"标题"',             '列标题: Title'],
  ['repository:"Repository"',               'repository:"仓库"',         '列标题: Repository'],
  ['modified:"Last modified"',              'modified:"最后修改"',       '列标题: Last modified'],
  ['status:"Status"',                       'status:"状态"',             '列标题: Status'],
  ['auto_toggles:"Auto-fix & merge"',       'auto_toggles:"自动修复与合并"','列标题: Auto-fix & merge'],
  ['title:"Block essential telemetry"',     'title:"阻止必需遥测"',      '标题: Block essential telemetry'],
  ['title:"Block nonessential telemetry"',  'title:"阻止非必需遥测"',   '标题: Block nonessential telemetry'],
  ['title:"Block nonessential services"',   'title:"阻止非必需服务"',    '标题: Block nonessential services'],
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
    // 直接读/写代替 copyFileSync，避免 WindowsApps 复制限制
    const content = fs.readFileSync(filePath);
    fs.writeFileSync(dst, content);
    console.log('  ✓ 已备份: ' + rel);
  } catch (e) {
    console.log('  · 备份跳过（不影响补丁）: ' + rel);
  }
}

function main() {
  console.log('');
  console.log('  筛选菜单/侧边栏 硬编码补丁');
  console.log('  ' + '='.repeat(35));
  console.log('');

  if (!fs.existsSync(ASSETS)) {
    console.error('  ✗ 未找到 assets 目录: ' + ASSETS);
    process.exit(1);
  }

  const files = fs.readdirSync(ASSETS).filter(f => f.endsWith('.js'));
  let totalPatches = 0;
  let patchedFiles = 0;

  for (const file of files) {
    const filePath = path.join(ASSETS, file);
    let content;
    try {
      content = fs.readFileSync(filePath, 'utf-8');
    } catch (e) {
      continue;
    }

    let changed = 0;
    const applied = [];

    const allPatches = [...PATCHES, ...PATCHES_3P];
    for (const patch of allPatches) {
      const [search, replace, desc = search] = patch;
      if (content.includes(search)) {
        // 使用 replaceAll 替换所有出现（有些字符串如 group 标签可能出现多次）
        const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
        content = content.replace(regex, replace);
        changed++;
        applied.push(desc);
      }
    }

    if (changed > 0) {
      backupFile(filePath);
      fs.writeFileSync(filePath, content, 'utf-8');
      console.log('  → ' + file + ' (' + changed + ' 处)');
      for (const a of applied) {
        console.log('    · ' + a);
      }
      totalPatches += changed;
      patchedFiles++;
    }
  }

  console.log('');
  console.log('  总计: ' + totalPatches + ' 处补丁，' + patchedFiles + ' 个文件');
  console.log('');
}

main();
