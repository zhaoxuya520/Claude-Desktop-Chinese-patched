# Claude Desktop 中文代理版

面向 Windows 版 Claude Desktop `1.6259.1.x` 的中文化项目。

这个版本不再只依赖修改本地安装包，而是优先采用“正版客户端 + 本地代理替换远端语言资源”的方案，让官方 `WindowsApps` 里的 Claude 直接显示中文界面。

## 致谢与来源

本项目不是从零开始重写的。

它基于原始项目 [Po1nt9/Claude-Desktop-Chinese](https://github.com/Po1nt9/Claude-Desktop-Chinese) 继续演进，并在其基础上新增了适配 Claude Desktop `1.6259.1.x` 的“正版客户端代理汉化”方案。

当前仓库中，以下内容直接继承或延续自原项目：

- `resources/frontend-zh-CN.json`
- `resources/desktop-zh-CN.json`
- `resources/statsig-zh-CN.json`
- 部分安装、补丁、验证脚本结构

当前仓库中，以下内容是这次新增或重构的核心部分：

- `scripts/claude-zh-proxy.js`
- `scripts/Launch-Official-Proxy.ps1`
- `run-official-zh-proxy.bat`
- 正版 `Claude.exe` 通过本地代理启动的整套链路

原项目许可证为 MIT，本仓库继续保留 MIT 许可证，并在公开页面明确标注来源。更完整的说明见 [CREDITS.md](CREDITS.md)。

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

当前仓库只保留这一条主线：

- **官方 Claude + 本地代理 + 中文资源替换**

也就是说，这个仓库现在不再把“独立副本模式”或“旧版本本地补丁模式”作为主推方案。

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

## 快速开始

推荐直接使用：

- `run-official-zh-proxy.bat`
- 或桌面快捷方式 `Claude 正版中文代理.lnk`

它会自动完成这些步骤：

1. 关闭现有 Claude 和本地代理进程
2. 启动本地中文代理
3. 清理安全缓存
4. 以 `--proxy-server=http://127.0.0.1:8877 --ignore-certificate-errors --lang=zh-CN` 启动官方 Claude

## 重要说明

当前中文化效果依赖“官方 Claude 通过本项目提供的启动方式运行”。

也就是说：

- 使用 `run-official-zh-proxy.bat` 或对应快捷方式启动时，界面会走中文代理链路
- 直接点击系统原本的官方 Claude 入口时，不保证仍然显示为中文

请把这一点理解得更直接一些：

- **使用本项目启动器启动 = 汉化模式**
- **不使用本项目启动器启动 = 不能视为汉化模式**

换句话说，如果不是通过本项目提供的启动器拉起官方 Claude，那么即使你电脑上已经放好了本仓库，也不能认为当前运行的是汉化版。

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

第一次使用前，需要满足这些条件：

- 已安装 Windows 官方 `Claude Desktop MSIX`
- 系统里能直接运行 `node` / `npm`
- 项目目录完整保留，不要只拿单个脚本

如果是第一次使用：

```powershell
npm install
```

然后启动：

```powershell
.\run-official-zh-proxy.bat
```

## 复现说明

当前仓库默认是可以在其他 Windows 电脑上复现的，但前提是：

- Claude 本体是官方 MSIX 版本
- 机器上安装了 Node.js
- 使用者是从完整项目目录运行，而不是把脚本单独拷走

当前启动脚本默认使用本地端口：

- `127.0.0.1:8877`

如果这个端口被占用，可以这样改：

```powershell
.\run-official-zh-proxy.bat 9988
```

或者直接调用 PowerShell 脚本：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\Launch-Official-Proxy.ps1 -ProxyPort 9988
```

## 使用后你应该看到什么

正常情况下，启动成功后：

- Claude 会以官方正版客户端启动
- 主界面欢迎语会显示中文
- 输入框提示会显示中文
- 左侧主导航大部分会显示中文

如果你看到的还是完全英文，优先检查：

1. 进程是否真的带了代理参数启动
2. `8877` 端口是否被占用
3. Node.js 是否安装正常
4. 是否是官方 MSIX 版本而不是其他第三方打包版本

## 故障排查

### 1. 双击脚本没反应

先在项目目录打开 PowerShell，手动运行：

```powershell
.\run-official-zh-proxy.bat
```

### 2. 提示 `node` 或 `npm` 不存在

说明本机没有安装 Node.js，或者没有加入系统 PATH。

### 3. 启动后仍是英文

先确认 Claude 是通过下面这种参数启动的：

```text
--proxy-server=http://127.0.0.1:8877
```

如果端口被占用，换一个端口重新启动：

```powershell
.\run-official-zh-proxy.bat 9988
```

### 4. 启动时报证书或代理相关问题

当前方案依赖本地代理拦截远端资源，请确保：

- 本地没有其他程序占用同一端口
- 防火墙没有拦本地回环代理
- Claude 启动参数里保留了 `--ignore-certificate-errors`

### 5. 部分内容还是英文

这是已知情况。

当前方案主要覆盖常见界面文本和远端语言资源，但：

- 模型名
- 品牌词
- 个别动态下发内容
- 官方新上线但尚未补齐的文案

仍可能保留英文。

## 已知限制

- 当前主要验证过 `1.6259.1.x`
- Claude 官方一旦调整远端前端资源结构，这套规则可能需要继续适配
- 少量模型名、品牌词和个别动态内容可能仍会保留英文
- 这是本地代理方案，不是离线语言包方案

## 免责声明

本项目不是 Anthropic 官方项目。

- 不修改模型能力
- 不绕过订阅限制
- 不处理付费破解
- 仅用于界面中文化和本地启动链路调整

使用前请自行判断风险。
