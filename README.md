# Claude Desktop 中文代理版

面向 Windows 版 Claude Desktop `1.6259.1.x` 的中文化项目。

这个版本不再只依赖修改本地安装包，而是优先采用“正版客户端 + 本地代理替换远端语言资源”的方案，让官方 `WindowsApps` 里的 Claude 直接显示中文界面。

## 项目说明

Claude Desktop 这个版本的主界面并不完全由本地资源渲染，很多内容来自：

- `https://claude.ai`
- `https://assets-proxy.anthropic.com`

因此，传统的“只往本地安装目录里塞 `zh-CN.json`”在这个版本上不够。  
本项目当前的主方案是：

1. 启动正版 Claude。
2. 让它通过本地代理访问 `claude.ai`。
3. 拦截语言资源请求。
4. 把远端默认英文语言包替换为本地中文语言包。
5. 再补一层页面级文本替换，处理少量硬编码英文。

## 当前效果

当前已经实现：

- 正版 Claude 主界面中文化
- 欢迎语、输入框提示、底部功能按钮中文化
- 左侧主导航大部分中文化
- 大量远端加载的界面文本改为中文

截图中已经可以看到：

- `新对话`
- `项目`
- `制品`
- `自定义`
- `代码`
- `协作`
- `今天我能帮你做些什么？`

## 推荐启动方式

推荐直接使用：

`run-official-zh-proxy.bat`

或者桌面快捷方式：

`Claude 正版中文代理.lnk`

它会做这些事：

1. 关闭现有 Claude 和本地代理进程
2. 启动本地中文代理
3. 清理安全缓存
4. 以 `--proxy-server=http://127.0.0.1:8877 --ignore-certificate-errors --lang=zh-CN` 启动官方 Claude

## 主要文件

核心文件如下：

- `scripts/claude-zh-proxy.js`
  负责拦截 `claude.ai` 和 `assets-proxy.anthropic.com` 的请求，并返回中文资源

- `scripts/Launch-Official-Proxy.ps1`
  负责启动代理并拉起正版 Claude

- `run-official-zh-proxy.bat`
  一键启动入口

- `resources/frontend-zh-CN.json`
  主前端中文语言包

- `resources/desktop-zh-CN.json`
  桌面层中文语言包

- `resources/statsig-zh-CN.json`
  statsig 相关中文语言包

## 安装和依赖

如果是第一次使用：

```powershell
npm install
```

然后启动：

```powershell
.\run-official-zh-proxy.bat
```

## 兼容说明

当前主要针对：

- Windows
- Claude Desktop MSIX 安装版
- `1.6259.1.x`

如果 Claude 官方更新了远端前端资源名、请求路径或页面结构，代理规则可能需要同步调整。

## 其他模式

仓库里仍然保留了之前的一些方案：

- 独立副本模式
- 本地安装包补丁模式
- 旧版本地 JS 文案补丁

但对这个版本来说，**官方代理模式** 是当前最有效、最稳定的方案。

## 免责声明

本项目不是 Anthropic 官方项目。

- 不修改模型能力
- 不绕过订阅限制
- 不处理付费破解
- 仅用于界面中文化和本地启动链路调整

使用前请自行判断风险。
