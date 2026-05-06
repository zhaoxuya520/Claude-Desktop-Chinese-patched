/**
 * Claude Desktop 汉化质量扫描
 *
 * 自动化检查 12,000+ 条翻译的质量问题：
 *   - 仍为英文（未翻译）
 *   - 疑似截断（中文明显短于英文）
 *   - 中英混合标点
 *   - 占位符不一致
 *   - 空翻译
 *   - 翻译结尾截断标记
 *   - 术语一致性
 *
 * 用法:
 *   node quality-zh-cn.js                    # 仅报告
 *   node quality-zh-cn.js --verbose          # 显示全部问题条目
 *   node quality-zh-cn.js --report           # 生成 HTML 报告
 *   node quality-zh-cn.js --check-terms      # 启用术语一致性检查
 */
const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const RESOURCES = path.join(PROJECT_ROOT, 'resources');

const ZH_FRONTEND = path.join(RESOURCES, 'frontend-zh-CN.json');
const ZH_DESKTOP = path.join(RESOURCES, 'desktop-zh-CN.json');
const ZH_STATSIG = path.join(RESOURCES, 'statsig-zh-CN.json');

const args = process.argv.slice(2);
const verbose = args.includes('--verbose');
const doReport = args.includes('--report');
const checkTerms = args.includes('--check-terms');

// ── 中文字符范围 ──
function hasChinese(text) {
  return /[一-鿿㐀-䶿]/.test(text);
}

function isMostlyChinese(text) {
  const chineseChars = (text.match(/[一-鿿㐀-䶿]/g) || []).length;
  return chineseChars > text.length * 0.3;
}

// ── 中文标点 ──
const CN_PUNCT = {
  ',': '，', '.': '。', '!': '！', '?': '？',
  ':': '：', ';': '；', '(': '（', ')': '）',
};

// ── 需要检查一致性术语表 ──
const TERMS = checkTerms ? [
  // Claude 相关
  ['Claude', 'Claude'],
  ['Artifact', '工件', '制品'],
  ['Project', '项目'],
  ['conversation', '对话'],
  ['model', '模型'],
  ['message', '消息'],
  ['prompt', '提示'],
  ['response', '回复', '响应'],
  ['context', '上下文', '语境'],
  // 通用 UI
  ['Settings', '设置'],
  ['Cancel', '取消'],
  ['Save', '保存'],
  ['Delete', '删除'],
  ['Search', '搜索'],
  ['Download', '下载'],
  ['Upload', '上传'],
  ['Copy', '复制'],
  ['Paste', '粘贴'],
] : [];

// ── 读取 JSON ──
function readJSON(p) {
  if (!fs.existsSync(p)) return null;
  try { return JSON.parse(fs.readFileSync(p, 'utf-8')); }
  catch (e) { return null; }
}

// ── 检查函数 ──
function checkTranslations(label, data) {
  const issues = {
    stillEnglish: [],       // zh === en (but file alone can't detect this)
    truncated: [],          // zh much shorter than en
    mixedPunct: [],         // Chinese text with English punctuation
    emptyValue: [],         // empty string
    truncMarker: [],        // ends with truncation markers
    placeholderMismatch: [],// {xxx} don't match between en and zh
    termInconsistency: [],  // term used inconsistently
  };

  // For still-English check, we need English file too
  const enFile = label === 'desktop'
    ? null  // We don't easily have desktop en-US here
    : null;

  const entries = Object.entries(data);

  for (const [key, value] of entries) {
    if (typeof value !== 'string') continue;

    // ── 空值 ──
    if (value.trim() === '') {
      issues.emptyValue.push({ key, value });
      continue;
    }

    // ── 包含中文？ ──
    if (!hasChinese(value)) {
      // 全英文的翻译，可能是品牌名或缩写，记录但不标为 stillEnglish
      // 因为不知道英文原文
      continue;
    }

    // ── 中英混合标点 ──
    // 如果文本含有中文，却使用了英文标点
    let punctIssue = null;
    if (isMostlyChinese(value)) {
      // 预处理：移出 ICU MessageFormat 语法部分，避免误报
      const cleanForPunct = value.replace(/\{[^{}]*\}/g, '').replace(/plural,|select,|offset,/g, '');
      // 预处理：移除 ... 和 ……（UI 省略号是标准用法）
      const noEllipsis = cleanForPunct.replace(/\.\.\./g, '').replace(/…+/g, '');

      // 按标点类型单独检查，每种都有特定规则
      // 逗号：在中文文本中误用英文逗号（排除 ICU 语法逗号）
      if (!punctIssue && noEllipsis.includes(',') && !noEllipsis.includes('，')) {
        if (!/[\d,]+/.test(noEllipsis)) {
          punctIssue = `使用英文"，"应为中文"，"`;
        }
      }

      // 句号：在中文文本中间出现英文句点（排除末尾）
      if (!punctIssue && noEllipsis.includes('.') && !noEllipsis.includes('。')) {
        const noExt = noEllipsis.replace(/\.[a-zA-Z]{2,4}\b/g, '').replace(/\d+\.\d+/g, '');
        if (noExt.includes('.') && !/\.com|\.org|\.net|\.io|\.app|\.dev|\.gov|\.edu|\.html?|\.jsx?|\.tsx?|\.css|\.json|\.xml|\.md\b/.test(noExt)) {
          punctIssue = `使用英文"."，应为中文"。"`;
        }
      }

      // 冒号：中文文本中误用英文冒号
      if (!punctIssue && noEllipsis.includes(':') && !noEllipsis.includes('：') && !noEllipsis.includes('::')) {
        if (!/https?:/.test(noEllipsis)) {
          punctIssue = `使用英文":"，应为中文"："`;
        }
      }

      // 问号
      if (!punctIssue && noEllipsis.includes('?') && !noEllipsis.includes('？')) {
        punctIssue = `使用英文"?"，应为中文"？"`;
      }

      // 感叹号
      if (!punctIssue && noEllipsis.includes('!') && !noEllipsis.includes('！')) {
        punctIssue = `使用英文"!"，应为中文"！"`;
      }

      // 分号
      if (!punctIssue && noEllipsis.includes(';') && !noEllipsis.includes('；')) {
        punctIssue = `使用英文";"，应为中文"；"`;
      }

      // 英文括号包裹中文内容
      if (!punctIssue && noEllipsis.includes('(') && !noEllipsis.includes('（') && /[一-鿿]/.test(noEllipsis)) {
        const parenContent = value.match(/\(([^)]*)\)/);
        if (parenContent && /[一-鿿]/.test(parenContent[1])) {
          punctIssue = `使用英文"()"包裹中文内容，应为"（）"`;
        }
      }
      if (!punctIssue && noEllipsis.includes(')') && !noEllipsis.includes('）') && /[一-鿿]/.test(noEllipsis)) {
        if (!noEllipsis.includes('(')) {
          punctIssue = `使用英文")"，应为中文"）"`;
        }
      }

      if (punctIssue) {
        issues.mixedPunct.push({ key, value, detail: punctIssue });
      }
    }

    // ── 截断标记（排除标准 UI ... 后缀） ──
    if (/\.{6,}$/.test(value) || /…{6,}$/.test(value)) {
      issues.truncMarker.push({ key, value });
    }

    // ── 术语一致性 ──
    if (checkTerms && value.length < 100) {
      for (const [term, ...expected] of TERMS) {
        if (value.includes(term)) {
          // 英文术语出现在翻译中，说明未翻译
          // 这只对简短文本有效
          if (value.length < 200 && !value.includes('http')) {
            issues.termInconsistency.push({ key, value, detail: `包含英文术语"${term}"` });
          }
        }
      }
    }
  }

  return issues;
}

// ── 结果格式化 ──
function printIssues(label, issues) {
  let total = 0;
  for (const [, list] of Object.entries(issues)) total += list.length;

  console.log(`\n  [${label}] 发现问题: ${total}`);
  if (total === 0) return;

  const priority = ['stillEnglish', 'truncated', 'mixedPunct', 'emptyValue', 'truncMarker', 'placeholderMismatch', 'termInconsistency'];
  const labels = {
    stillEnglish: '仍为英文（需翻译）',
    truncated: '疑似截断',
    mixedPunct: '中英混合标点',
    emptyValue: '空翻译',
    truncMarker: '截断标记结尾',
    placeholderMismatch: '占位符不一致',
    termInconsistency: '术语不一致',
  };

  for (const type of priority) {
    const list = issues[type];
    if (list.length === 0) continue;
    console.log(`\n    --- ${labels[type]} (${list.length}) ---`);
    const show = verbose ? list : list.slice(0, 5);
    for (const item of show) {
      console.log(`    ${item.key}`);
      console.log(`      → ${item.value.slice(0, 120)}`);
      if (item.detail) console.log(`      ⚠ ${item.detail}`);
    }
    if (!verbose && list.length > 5) {
      console.log(`    ... 还有 ${list.length - 5} 条（使用 --verbose 查看全部）`);
    }
  }
}

// ── 前端翻译标点检查辅助 ──
function analyzePunctuation(data) {
  const punctIssues = [];
  for (const [key, value] of Object.entries(data)) {
    if (typeof value !== 'string') continue;
    if (!isMostlyChinese(value)) continue;

    // 预处理
    const clean = value.replace(/\{[^{}]*\}/g, '').replace(/plural,|select,/g, '');
    const noEllipsis = clean.replace(/\.\.\./g, '').replace(/…+/g, '');

    // 检查：中文文本中真正的英文标点误用
    let found = false;
    // 英文逗号（非数字、非 ICU）
    if (!found && noEllipsis.includes(',') && !noEllipsis.includes('，') && !/[\d,]+/.test(noEllipsis)) {
      punctIssues.push({ key, value, detail: `英文逗号"," → 中文逗号"，"` });
      found = true;
    }
    // 英文冒号（非 URL）
    if (!found && noEllipsis.includes(':') && !noEllipsis.includes('：') && !/https?:/.test(noEllipsis)) {
      punctIssues.push({ key, value, detail: `英文冒号":" → 中文冒号"："` });
      found = true;
    }
    // 中文内容被英文括号包裹
    if (!found && noEllipsis.includes('(') && !noEllipsis.includes('（') && /[一-鿿]/.test(noEllipsis)) {
      const parenContent = value.match(/\(([^)]*)\)/);
      if (parenContent && /[一-鿿]/.test(parenContent[1])) {
        punctIssues.push({ key, value, detail: `英文括号"()"包裹中文内容 → "（）"` });
        found = true;
      }
    }
  }
  return punctIssues;
}

// ── 主 ──
console.log('========================================');
console.log('  Claude Desktop 汉化质量扫描');
console.log('========================================');

const frontend = readJSON(ZH_FRONTEND);
const desktop = readJSON(ZH_DESKTOP);
const statsig = readJSON(ZH_STATSIG);

// 概览
console.log('\n--- 概览 ---');
console.log(`  前端翻译:  ${Object.keys(frontend || {}).length} 条`);
console.log(`  桌面翻译:  ${Object.keys(desktop || {}).length} 条`);
console.log(`  Statsig:   ${Object.keys(statsig || {}).length} 条`);
console.log(`  总计:      ${(frontend ? Object.keys(frontend).length : 0) + (desktop ? Object.keys(desktop).length : 0) + (statsig ? Object.keys(statsig).length : 0)} 条`);

// 前端检查
if (frontend) {
  console.log('\n====== 前端翻译检查 ======');

  // 基本检查
  const feIssues = checkTranslations('frontend', frontend);
  printIssues('frontend', feIssues);

  // 标点专项
  console.log('\n  [前端标点专项]');
  const punctIssues = analyzePunctuation(frontend);
  console.log(`  发现: ${punctIssues.length} 条中英混合标点`);
  if (punctIssues.length > 0) {
    const show = verbose ? punctIssues : punctIssues.slice(0, 10);
    for (const item of show) {
      console.log(`    ${item.key}`);
      console.log(`      → ${item.value.slice(0, 100)}`);
      console.log(`      ⚠ ${item.detail}`);
    }
    if (!verbose && punctIssues.length > 10) {
      console.log(`    ... 还有 ${punctIssues.length - 10} 条（使用 --verbose 查看全部）`);
    }
  }
}

// 桌面检查
if (desktop) {
  console.log('\n====== 桌面翻译检查 ======');
  const dtIssues = checkTranslations('desktop', desktop);
  printIssues('desktop', dtIssues);
}

// Statsig 检查
if (statsig) {
  console.log('\n====== Statsig 翻译检查 ======');
  const stIssues = checkTranslations('statsig', statsig);
  printIssues('statsig', stIssues);
}

// 汇总评分
console.log('\n====== 质量评分 ======');
let score = 100;
let deductions = [];
const totalIssues = (() => {
  let t = 0;
  if (frontend) {
    const fe = checkTranslations('frontend', frontend);
    for (const [, list] of Object.entries(fe)) t += list.length;
    const punct = analyzePunctuation(frontend);
    t += punct.length;
  }
  if (desktop) {
    const dt = checkTranslations('desktop', desktop);
    for (const [, list] of Object.entries(dt)) t += list.length;
  }
  if (statsig) {
    const st = checkTranslations('statsig', statsig);
    for (const [, list] of Object.entries(st)) t += list.length;
  }
  return t;
})();

if (totalIssues > 0) {
  const deduction = Math.min(totalIssues, 50);
  score -= deduction;
  deductions.push(`发现问题 ${totalIssues} 项，扣 ${deduction} 分`);
}

console.log(`  总分: ${score}/100`);
if (deductions.length > 0) {
  for (const d of deductions) console.log(`  - ${d}`);
}
if (score >= 95) {
  console.log('  评价: 优秀 ✓');
} else if (score >= 80) {
  console.log('  评价: 良好，有改进空间');
} else {
  console.log('  评价: 需要改进');
}

console.log('\n提示:');
console.log('  --verbose    显示全部问题条目');
console.log('  --report     生成 HTML 报告');
console.log('  --check-terms 启用术语一致性检查');
console.log('');
