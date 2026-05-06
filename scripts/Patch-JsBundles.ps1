# Claude Desktop JS Bundle 汉化补丁 v3.1
# 优化翻译质量，修复空格一致性问题

param(
    [string]$AppDir,
    [switch]$DryRun
)

$ErrorActionPreference = 'Continue'

$BACKUP_ROOT = "$env:LOCALAPPDATA\Claude-zh-CN-backup\chunks"

function Write-Step { param($msg) Write-Host "[*] $msg" -ForegroundColor Cyan }
function Write-Success { param($msg) Write-Host "[+] $msg" -ForegroundColor Green }
function Write-Warn { param($msg) Write-Host "[!] $msg" -ForegroundColor Yellow }
function Write-Err { param($msg) Write-Host "[-] $msg" -ForegroundColor Red }

function Find-ClaudeAppDir {
    param($AppDirOverride)

    if ($AppDirOverride) {
        if (Test-Path "$AppDirOverride\resources\en-US.json") {
            return $AppDirOverride
        }
        throw "指定的目录不存在 en-US.json: $AppDirOverride"
    }

    $windowsApps = "C:\Program Files\WindowsApps"
    if (Test-Path $windowsApps) {
        $candidates = Get-ChildItem "$windowsApps\Claude_*_x64__*\app\resources\en-US.json" -ErrorAction SilentlyContinue |
            Sort-Object { [version]($_.Directory.Parent.Name -replace 'Claude_(\d+\.\d+\.\d+\.\d+)_.*', '$1') } -Descending |
            Select-Object -First 1

        if ($candidates) {
            return $candidates.Directory.Parent.FullName
        }
    }

    throw "找不到 Claude Desktop 安装目录"
}

function Backup-File {
    param($Path, $AssetsDir)

    if (-not (Test-Path $Path)) { return }

    $rel = $Path.FullName.Substring($AssetsDir.Length).TrimStart('\')
    $dst = Join-Path $BACKUP_ROOT $rel
    $dstDir = Split-Path $dst -Parent

    if (-not (Test-Path $dstDir)) {
        New-Item -ItemType Directory -Path $dstDir -Force | Out-Null
    }

    if (-not (Test-Path $dst)) {
        try {
            Copy-Item $Path $dst -Force
        } catch {
            Write-Warn "备份失败: $($_.Exception.Message)"
        }
    }
}

function Write-TextBestEffort {
    param($Path, $Content)

    try {
        Set-Content -Path $Path -Value $Content -Encoding UTF8 -NoNewline -ErrorAction Stop
        return $true
    } catch {
        try {
            $item = Get-Item $Path -ErrorAction SilentlyContinue
            if ($item) {
                $item.Attributes = $item.Attributes -band (-bnot [System.IO.FileAttributes]::ReadOnly)
            }
            Set-Content -Path $Path -Value $Content -Encoding UTF8 -NoNewline -ErrorAction Stop
            return $true
        } catch {
            Write-Warn "写入失败: $($_.Exception.Message)"
            return $false
        }
    }
}

# ============================================
# 空格一致性补丁 - 修复产品名后紧跟中文
# ============================================
$SPACE_PATCHES = @(
    # Cowork 空格修复
    @('Cowork设置', 'Cowork 设置'),
    @('Cowork试用', 'Cowork 试用'),
    @('Cowork任务', 'Cowork 任务'),
    @('Cowork会话', 'Cowork 会话'),
    @('Cowork模式', 'Cowork 模式'),
    @('Cowork说明', 'Cowork 说明'),
    @('Cowork清单', 'Cowork 清单'),
    @('Cowork插图', 'Cowork 插图'),
    @('Cowork限制', 'Cowork 限制'),
    @('下载Cowork', '下载 Cowork'),
    @('尝试Cowork', '尝试 Cowork'),
    @('了解Cowork', '了解 Cowork'),
    @('在Cowork', '在 Cowork'),
    @('你的Cowork', '你的 Cowork'),
    @('需要Cowork', '需要 Cowork'),

    # Claude Code 空格修复
    @('Claude Code设置', 'Claude Code 设置'),
    @('Claude Code分析', 'Claude Code 分析'),
    @('Claude Code实例', 'Claude Code 实例'),
    @('Claude Code会话', 'Claude Code 会话'),
    @('Claude Code快速', 'Claude Code 快速'),
    @('Claude Code指南', 'Claude Code 指南'),
    @('Claude Code访问', 'Claude Code 访问'),
    @('Claude Code令牌', 'Claude Code 令牌'),
    @('无法访问Claude Code', '无法访问 Claude Code'),
    @('开始Claude Code', '开始 Claude Code'),
    @('安装Claude Code', '安装 Claude Code'),
    @('启动Claude Code', '启动 Claude Code'),
    @('在Claude Code', '在 Claude Code'),
    @('你的Claude Code', '你的 Claude Code'),
    @('需要Claude Code', '需要 Claude Code'),

    # Artifact 空格修复
    @('Artifact共享', 'Artifact 共享'),
    @('创建Artifact', '创建 Artifact'),
    @('共享此Artifact', '共享此 Artifact'),
    @('此Artifact', '此 Artifact'),
    @('新Artifact', '新 Artifact'),
    @('生成的Artifact', '生成的 Artifact'),
    @('你的Artifact', '你的 Artifact'),
    @('该Artifact', '该 Artifact'),
    @('一个Artifact', '一个 Artifact'),
    @('作为Artifact', '作为 Artifact'),
    @('多个Artifact', '多个 Artifact'),
    @('实时Artifact', '实时 Artifact'),
    @('互动Artifact', '互动 Artifact'),
    @('直播Artifact', '直播 Artifact'),
    @('AI Artifact', 'AI Artifact'),
)

# ============================================
# 通用补丁 - 适用于所有 JS 文件
# ============================================
$COMMON_PATCHES = @(
    # 侧边栏标签（保留产品名 Cowork/Operon/Artifacts）
    @('label:"Chat"', 'label:"聊天"'),
    @('label:"Code"', 'label:"代码"'),
    @('label:"Projects"', 'label:"项目"'),
    @('label:"Scheduled"', 'label:"已计划"'),
    @('label:"Tasks"', 'label:"任务"'),
    @('label:"Replay"', 'label:"重放"'),
    @('label:"Dispatch"', 'label:"调度"'),
    @('label:"Ideas"', 'label:"想法"'),
    @('label:"Apps"', 'label:"应用"'),
    @('label:"Security"', 'label:"安全"'),
    @('label:"Customize"', 'label:"自定义"'),
    @('label:"Status"', 'label:"状态"'),
    @('label:"Environment"', 'label:"环境"'),

    # 新建操作
    @('chat:"New chat"', 'chat:"新建聊天"'),
    @('cowork:"New task"', 'cowork:"新建任务"'),
    @('code:"New session"', 'code:"新建会话"'),
    @('operon:"New session"', 'operon:"新建会话"'),

    # 过滤器状态
    @('oo="Local"', 'oo="本地"'),
    @('io="Cloud"', 'io:"云端"'),
    @('co="All"', 'co="全部"'),
    @('["active","Active"]', '["active","活跃"]'),
    @('["archived","Archived"]', '["archived","已归档"]'),
    @('["all","All"]', '["all","全部"]'),
    @('["1","1d"]', '["1","1天"]'),
    @('["7","7d"]', '["7","7天"]'),
    @('["30","30d"]', '["30","30天"]'),

    # 日期和时间
    @('"Date"', '"日期"'),
    @('"None"', '"无"'),
    @('"Older"', '"更早"'),

    # 操作按钮
    @('children:"Pinned"', 'children:"已固定"'),
    @('children:"Drag to pin"', 'children:"拖动固定"'),
    @('"Drop here"', '"拖放到这里"'),
    @('"Let go"', '"松开"'),
    @('children:"View all"', 'children:"查看全部"'),
    @('children:"Clear filters"', 'children:"清除筛选"'),

    # 任务相关
    @('title:"Scheduled tasks",subheader', 'title:"计划任务",subheader'),
    @('Ifn={all:"All",active:"Active",archived:"Archived"}', 'Ifn={all:"全部",active:"活跃",archived:"已归档"}'),
    @('"No tasks yet."', '"暂无任务"'),
    @('"No active tasks."', '"无进行中的任务"'),
    @('"No archived tasks."', '"无已归档的任务"'),
    @('?"New task":"New chat"', '?"新建任务":"新建聊天"'),

    # 同步源
    @('label:"Documents"', 'label:"文档"'),
    @('label:"Files"', 'label:"文件"'),
    @('label:"Sync Sources"', 'label:"同步源"'),

    # 外观设置
    @('"Appearance"', '"外观"'),
    @('"Appearance & Theme"', '"外观与主题"'),
    @('"Light"', '"浅色"'),
    @('"Dark"', '"深色"'),
    @('"Auto"', '"自动"'),
    @('"sans"', '"无衬线"'),
    @('"serif"', '"有衬线"'),
    @('"monospace"', '"等宽"'),

    # 设置页面
    @('"Settings"', '"设置"'),
    @('"General"', '"通用"'),
    @('"Account"', '"账户"'),
    @('"Organization"', '"组织"'),
    @('"Billing"', '"账单"'),
    @('"Usage"', '"用量"'),
    @('"Keyboard shortcuts"', '"快捷键"'),
    @('"About"', '"关于"'),
    @('"Version"', '"版本"'),

    # 开发者
    @('"Developer"', '"开发者"'),
    @('"Developer mode"', '"开发者模式"'),
    @('"Developer tools"', '"开发者工具"'),
    @('"Logs"', '"日志"'),
    @('"Debug"', '"调试"'),

    # 连接器和扩展
    @('"Connectors"', '"连接器"'),
    @('"Extensions"', '"扩展"'),
    @('"Plugins"', '"插件"'),
    @('"MCP Servers"', '"MCP 服务器"'),
    @('"Installed"', '"已安装"'),
    @('"Available"', '"可用"'),

    # 虚拟机和沙盒
    @('"VM"', '"虚拟机"'),
    @('"Sandbox"', '"沙盒"'),
    @('"Workspace"', '"工作区"'),

    # 网络
    @('"Network"', '"网络"'),
    @('"Proxy"', '"代理"'),
    @('"Firewall"', '"防火墙"'),
    @('"Egress"', '"出口流量"'),
    @('"Allowed hosts"', '"允许的主机"'),

    # 遥测和更新
    @('"Telemetry"', '"遥测"'),
    @('"Updates"', '"更新"'),
    @('"Auto-update"', '"自动更新"'),
    @('"Check for updates"', '"检查更新"'),
    @('"Update available"', '"有可用更新"'),

    # 通用操作
    @('"Create"', '"创建"'),
    @('"Delete"', '"删除"'),
    @('"Edit"', '"编辑"'),
    @('"Save"', '"保存"'),
    @('"Cancel"', '"取消"'),
    @('"Confirm"', '"确认"'),
    @('"Close"', '"关闭"'),
    @('"Back"', '"返回"'),
    @('"Next"', '"下一步"'),
    @('"Done"', '"完成"'),

    # 搜索和筛选
    @('"Search"', '"搜索"'),
    @('"Filter"', '"筛选"'),
    @('"Sort"', '"排序"'),
    @('"Group"', '"分组"'),
    @('"Name"', '"名称"'),
    @('"Size"', '"大小"'),
    @('"Type"', '"类型"'),
    @('"Modified"', '"修改时间"'),

    # 筛选菜单标签（硬编码在 JS 中）
    @('label:"Last activity"', 'label:"最近活动"'),
    @('label:"Group by"', 'label:"分组依据"'),
    @('label:"Sort by"', 'label:"排序方式"'),
    @('["alpha","Alphabetically"]', '["alpha","按字母顺序"]'),
    @('["created","Created time"]', '["created","创建时间"]'),
    @('["recency","Recency"]', '["recency","最近活动"]'),
    @('["1","1d"]', '["1","1天"]'),
    @('["3","3d"]', '["3","3天"]'),
    @('["7","7d"]', '["7","7天"]'),
    @('["30","30d"]', '["30","30天"]'),
    @('["0","All"]', '["0","全部"]'),
    @('jl="Local"', 'jl="本地"'),
    @('Cl="Cloud"', 'Cl="云端"'),
    @('Ml="Remote Control"', 'Ml="远程控制"'),
    @('Fl="Recents"', 'Fl="最近"'),
    @('children:"Project"', 'children:"项目"'),
    @('children:"Session"', 'children:"会话"'),
    @('children:"All"', 'children:"全部"'),
    @('{label:"All",count:', '{label:"全部",count:'),

    # 状态
    @('"Connected"', '"已连接"'),
    @('"Disconnected"', '"已断开"'),
    @('"Connecting"', '"连接中"'),
    @('"Error"', '"错误"'),
    @('"Warning"', '"警告"'),
    @('"Success"', '"成功"'),
    @('"Loading"', '"加载中"'),
    @('"Ready"', '"就绪"'),
    @('"Waiting"', '"等待中"'),

    # 权限
    @('"Allow"', '"允许"'),
    @('"Deny"', '"拒绝"'),
    @('"Block"', '"阻止"'),
    @('"Enable"', '"启用"'),
    @('"Disable"', '"禁用"'),
    @('"Required"', '"必需"'),
    @('"Optional"', '"可选"'),
    @('"Always allow"', '"始终允许"'),

    # 文件操作
    @('"Share"', '"分享"'),
    @('"Export"', '"导出"'),
    @('"Import"', '"导入"'),
    @('"Download"', '"下载"'),
    @('"Upload"', '"上传"'),
    @('"Open"', '"打开"'),
    @('"Enter"', '"进入"'),
    @('"Leave"', '"离开"'),
    @('"Join"', '"加入"'),
    @('"Remove"', '"移除"'),
    @('"Update"', '"更新"'),

    # 其他
    @('"Copied!"', '"已复制"'),
    @('"Copied to clipboard"', '"已复制到剪贴板"'),
    @('"Select all"', '"全选"'),
    @('"No results"', '"无结果"'),
    @('"Clear"', '"清除"'),
    @('"Retry"', '"重试"'),
    @('"Refresh"', '"刷新"'),
    @('"Expand"', '"展开"'),
    @('"Collapse"', '"收起"'),
    @('"Maximize"', '"最大化"'),
    @('"Minimize"', '"最小化"'),
    @('"Restore"', '"还原"'),

    # 拉取请求
    @('label:"Pull Requests"', 'label:"拉取请求"')
)

# 3P 设置页面专用补丁
$PATCHES_3P = @(
    @('"Egress Requirements"', '"出口要求"'),
    @('"Gateway base URL"', '"自定义端点 URL"'),
    @('"Gateway API key"', '"自定义 API Key"'),
    @('"Gateway auth scheme"', '"自定义认证方式"'),
    @('"Gateway extra headers"', '"自定义请求头"'),
    @('"Allow desktop extensions"', '"允许桌面扩展"'),
    @('"Show extension directory"', '"显示扩展目录"'),
    @('"Require signed extensions"', '"要求扩展签名"'),
    @('"Allow user-added MCP servers"', '"允许用户添加 MCP 服务器"'),
    @('"Allow Claude Code tab"', '"允许 Claude Code 标签页"'),
    @('"Secure VM features"', '"安全虚拟机功能"'),
    @('"Require full VM sandbox"', '"要求完整虚拟机沙盒"'),
    @('"Allowed egress hosts"', '"允许的出口主机"'),
    @('"OpenTelemetry collector endpoint"', '"遥测收集器端点"'),
    @('"OpenTelemetry exporter protocol"', '"遥测导出协议"'),
    @('"OpenTelemetry exporter headers"', '"遥测请求头"'),
    @('"Auto-update enforcement window"', '"自动更新强制窗口"'),
    @('"Block auto-updates"', '"禁用自动更新"'),
    @('"Skip login-mode chooser"', '"跳过登录模式选择"'),
    @('"Required organization"', '"必需的组织"'),
    @('"Inference provider"', '"推理供应商"'),
    @('"Connection"', '"连接方式"'),
    @('"Sandbox & workspace"', '"沙盒与工作区"'),
    @('"Connectors & extensions"', '"连接器与扩展"'),
    @('"Telemetry & updates"', '"遥测与更新"'),
    @('"Usage limits"', '"用量限制"'),
    @('"Plugins & skills"', '"插件与技能"')
)

# ============================================
# 主程序
# ============================================
Write-Host ""
Write-Host "========================================" -ForegroundColor Magenta
Write-Host "  Claude Desktop JS Bundle 汉化补丁 v3.1" -ForegroundColor Magenta
Write-Host "  优化翻译质量，修复空格一致性" -ForegroundColor Gray
Write-Host "========================================" -ForegroundColor Magenta
Write-Host ""

if ($DryRun) {
    Write-Host "[模式] 预览模式 - 不实际修改文件" -ForegroundColor Yellow
    Write-Host ""
}

# 检查管理员权限
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
    [Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Err "此脚本需要管理员权限。"
    Write-Host "请右键 PowerShell -> 以管理员身份运行" -ForegroundColor Yellow
    Read-Host "按 Enter 键退出"
    exit 1
}

try {
    Write-Step "正在查找 Claude 安装目录..."
    $ClaudeAppDir = Find-ClaudeAppDir -AppDirOverride $AppDir
    Write-Success "找到: $ClaudeAppDir"
} catch {
    Write-Err $_
    Read-Host "按 Enter 键退出"
    exit 1
}

$ResourcesDir = "$ClaudeAppDir\app\resources"
$AssetsDir = "$ResourcesDir\ion-dist\assets\v1"

if (-not (Test-Path $AssetsDir)) {
    Write-Err "Assets 目录不存在: $AssetsDir"
    Read-Host "按 Enter 键退出"
    exit 1
}

# 创建备份目录
New-Item -ItemType Directory -Path $BACKUP_ROOT -Force | Out-Null

Write-Step "正在获取文件权限..."
$takeownResult = & takeown /F $AssetsDir /A /R /D Y 2>&1
$icaclsResult = & icacls $AssetsDir /grant "Administrators:F" /T 2>&1
Start-Sleep -Seconds 1

Write-Step "正在应用 JS 补丁..."
$totalPatches = 0
$totalFiles = 0

# 获取所有 JS 文件
$jsFiles = Get-ChildItem -Path $AssetsDir -Filter "*.js" -ErrorAction SilentlyContinue

foreach ($fpath in $jsFiles) {
    $fileName = $fpath.Name
    $isIndexFile = $fileName -match "^index-.*\.js$"
    $is3PFile = $fileName -match "c71860c77"

    # 跳过非 UI 文件（worker、wasm、tree-sitter）
    if ($fileName -match "^(worker|wasm|framebuffer|tree-sitter)") {
        continue
    }

    Write-Step "处理: $fileName"

    if (-not $DryRun) {
        Backup-File -Path $fpath.FullName -AssetsDir $AssetsDir
    }

    $content = Get-Content $fpath.FullName -Raw -Encoding UTF8
    $changed = 0
    $appliedPatches = @()

    # 应用空格一致性补丁
    foreach ($pair in $SPACE_PATCHES) {
        $old = $pair[0]
        $new = $pair[1]

        if ($content -match [regex]::Escape($old)) {
            if (-not $DryRun) {
                $content = $content -replace [regex]::Escape($old), $new
            }
            $changed++
            $appliedPatches += $old
        }
    }

    # 应用通用补丁
    foreach ($pair in $COMMON_PATCHES) {
        $old = $pair[0]
        $new = $pair[1]

        if ($content -match [regex]::Escape($old)) {
            if (-not $DryRun) {
                $content = $content -replace [regex]::Escape($old), $new
            }
            $changed++
            $appliedPatches += $old
        }
    }

    # 应用 3P 专用补丁
    if ($is3PFile) {
        foreach ($pair in $PATCHES_3P) {
            $old = $pair[0]
            $new = $pair[1]

            if ($content -match [regex]::Escape($old)) {
                if (-not $DryRun) {
                    $content = $content -replace [regex]::Escape($old), $new
                }
                $changed++
                $appliedPatches += $old
            }
        }
    }

    if ($changed -gt 0) {
        if ($DryRun) {
            Write-Host "  预览: 将应用 $changed 处替换" -ForegroundColor Yellow
            foreach ($patch in $appliedPatches | Select-Object -First 10) {
                Write-Host "    - $patch" -ForegroundColor Gray
            }
            if ($appliedPatches.Count -gt 10) {
                Write-Host "    ... 还有 $($appliedPatches.Count - 10) 处" -ForegroundColor Gray
            }
        } else {
            Write-Step "  应用了 $changed 处替换"
            if (Write-TextBestEffort -Path $fpath.FullName -Content $content) {
                $totalPatches += $changed
                $totalFiles++
            }
        }
    }
}

Write-Host ""
if ($DryRun) {
    Write-Host "预览模式完成" -ForegroundColor Yellow
} else {
    Write-Success "JS 补丁完成！"
    Write-Host "  修改了 $totalFiles 个文件" -ForegroundColor Cyan
    Write-Host "  共应用 $totalPatches 处替换" -ForegroundColor Cyan
    Write-Host "备份位置: $BACKUP_ROOT" -ForegroundColor Gray
}
Write-Host ""

if (-not $DryRun) {
    Read-Host "按 Enter 键退出"
}
