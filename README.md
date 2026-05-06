# Claude Desktop 中文汉化包 v1.0
（汉化可用并不完美，作者自发布后正在朝着完美爆肝,24小时内会推出2.0）

<div align="center">

[![GitHub release](https://img.shields.io/badge/Claude-1.5354.0.0-blue)](https://github.com/Po1nt9/Claude-Desktop-Chinese)
[![Coverage](https://img.shields.io/badge/覆盖率-99.08%25-success)](https://github.com/Po1nt9/Claude-Desktop-Chinese)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

**Claude Desktop 完全中文化方案** — 无需魔法，一键部署。

[English](#english) | [简体中文](#简体中文)

</div>

---

> ⚠️ **法律声明 / Legal Notice**
>
> **本软件并非 Anthropic 官方产品。** "Claude" 名称及相关标识是 **Anthropic** 的注册商标。
> 本项目与 Anthropic **无任何关联、赞助或认可关系**。本软件仅对 Claude Desktop 的界面文字进行
> 简体中文翻译，**不修改核心功能、不绕过付费限制、不收集用户数据**。使用前请阅读完整的
> [免责声明](DISCLAIMER.md)。
>
> _This is NOT an official Anthropic product. "Claude" is a trademark of Anthropic.
> This project is not affiliated with or endorsed by Anthropic. See full [Disclaimer](DISCLAIMER.md)._

---

<a name="简体中文"></a>

## 简体中文

### 简介

本项目为 Claude Desktop for Windows 提供完整的中文界面汉化，覆盖 **99%+** 的界面字符串。

**效果预览：** 安装后启动 Claude Desktop，界面将全面显示为简体中文 —— 菜单、侧边栏、筛选器、设置面板、弹窗提示等均已完成汉化。

### 功能特性

- ✅ **双层汉化架构** — JSON 翻译文件 + JS 源码补丁，全面覆盖
- ✅ **一键安装** — 双击 `中文安装.bat` 即可
- ✅ **自动检测** — 自动定位 Claude 安装目录
- ✅ **自动备份** — 安装前备份原始文件
- ✅ **安全部署** — 非破坏性修补，可随时卸载恢复

### 安装方法

**方法一：一键安装（推荐）**

1. 下载本项目到本地
2. **以管理员身份** 双击 `scripts\中文安装.bat`
3. 等待安装完成
4. 重启 Claude Desktop

**方法二：PowerShell**

```powershell
# 以管理员身份运行 PowerShell
cd 项目目录\scripts
.\Install-Chinese.ps1
```

**方法三：Node.js**

```bash
# 以管理员身份运行
cd 项目目录
node scripts/deploy-zh-cn.js
node scripts/patch-filter-menu.js
node scripts/patch-3p-descriptions.js
```

### 验证安装

```bash
node scripts/_verify.js
```

若全部通过（37/37 ✅），说明安装成功。

### 卸载

以管理员身份运行 `scripts\uninstall.ps1`，或手动恢复备份文件。

> 备份位置：`%LOCALAPPDATA%\Claude-zh-CN-backup`

### 翻译统计

| 文件 | Key 数 | 类型 |
|------|--------|------|
| `desktop-zh-CN.json` | 361 | 桌面层（主进程）翻译 |
| `frontend-zh-CN.json` | 13,293 | 前端层（渲染进程）翻译 |
| `statsig-zh-CN.json` | 46 | Statsig 遥测翻译 |
| **JS 硬编码补丁** | ≈247 处 | title/label/placeholder/description 等 |
| **翻译覆盖率** | **99.08%** | 仅 122 条保留英文（品牌/缩写/格式串） |

### 注意事项

- **需要管理员权限** — 因 Claude 安装在 `C:\Program Files\WindowsApps` 受保护目录
- **Claude 更新后需重新安装** — WindowsApps 更新会还原所有修改，重新运行 `中文安装.bat` 即可
- **主菜单不在此范围** — `app.asar` 中的 Electron 菜单字符串因数字签名原因未处理
- 本工具仅适用于 **Windows** 版 Claude Desktop

### 技术架构

```
┌─────────────────────────────────────────────────┐
│                JS 源码补丁层                       │
│  patch-filter-menu.js  → 150处 title/label/...   │
│  patch-3p-descriptions.js → 85处 description/... │
├─────────────────────────────────────────────────┤
│              JSON 翻译文件层                       │
│  frontend-zh-CN.json  → ion-dist/i18n/zh-CN.json │
│  desktop-zh-CN.json   → app/resources/zh-CN.json │
│  statsig-zh-CN.json   → i18n/statsig/zh-CN.json  │
├─────────────────────────────────────────────────┤
│               部署/验证层                          │
│  deploy-zh-cn.js  → 部署 + 白名单 + locale 设置   │
│  find-claude.js   → 自动检测 Claude 安装目录       │
│  _verify.js       → 37项验证检查                   │
└─────────────────────────────────────────────────┘
```

---

<a name="english"></a>

## English

### Overview

**Claude Desktop Chinese Localization Pack** — Complete Chinese (Simplified) UI localization for Claude Desktop on Windows.

Coverage: **99.08%** of UI strings across the application.

### One-Click Install

1. Download this repository
2. **Run as Administrator** `scripts\中文安装.bat`
3. Restart Claude Desktop

### Verify

```bash
node scripts/_verify.js
```

All 37 checks should pass.

### Important Notes

- **Admin rights required** — Claude is installed in WindowsApps protected directory
- **Re-apply after Claude updates** — WindowsApps updates restore original files
- **99.08% coverage** — 122 strings retained in English (brand names, abbreviations, format strings)

### Legal Disclaimer

> ⚠️ **This is NOT an official Anthropic product.** "Claude" is a registered trademark of **Anthropic**.
> This project is **not affiliated with, endorsed by, or connected to** Anthropic in any way.
>
> This localization pack **only modifies UI display text** (button labels, menus, tooltips).
> It does **NOT** alter AI model behavior, bypass paywalls/subscriptions, or collect user data.
>
> Use at your own risk. See the full [Disclaimer](DISCLAIMER.md) for details.

### License

MIT
