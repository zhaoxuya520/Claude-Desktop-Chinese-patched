# 致谢与来源

## 原始项目

本仓库基于以下项目继续修改与扩展：

- 项目名：`Claude-Desktop-Chinese`
- 作者：`Po1nt9`
- 地址：[https://github.com/Po1nt9/Claude-Desktop-Chinese](https://github.com/Po1nt9/Claude-Desktop-Chinese)

## 复用内容

本仓库复用了原始项目中的部分内容，包括但不限于：

- `resources/frontend-zh-CN.json`
- `resources/desktop-zh-CN.json`
- `resources/statsig-zh-CN.json`

这些内容构成了当前仓库中文语言资源的基础。

## 新增内容

为适配 Claude Desktop `1.6259.1.x` 的实际运行方式，本仓库新增并实现了以下核心能力：

- 正版 `WindowsApps` 客户端通过本地代理启动
- 远端语言资源请求拦截与替换
- 正版客户端首页注入和页面级文本补充翻译
- 面向当前版本的启动脚本、代理脚本和仓库说明重构

核心新增文件包括：

- `scripts/claude-zh-proxy.js`
- `scripts/Launch-Official-Proxy.ps1`
- `run-official-zh-proxy.bat`

## 许可证说明

原始项目采用 MIT License。

当前仓库继续保留 MIT License，并保留原许可证文本：

- [LICENSE](LICENSE)

如果你使用、分发或继续修改本仓库，请同时保留原作者版权声明和 MIT 许可文本。
