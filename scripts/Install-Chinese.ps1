# Claude Desktop 汉化安装向导 v2.0
# 集成 JS Bundle 修补和更多翻译

param(
    [string]$AppDir,
    [switch]$SkipLocale,
    [switch]$InPlace,
    [switch]$DryRun,
    [switch]$ExtractOnly
)

$ErrorActionPreference = 'Continue'

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir

function Write-Step { param($msg) Write-Host "[*] $msg" -ForegroundColor Cyan }
function Write-Success { param($msg) Write-Host "[+] $msg" -ForegroundColor Green }
function Write-Warn { param($msg) Write-Host "[!] $msg" -ForegroundColor Yellow }
function Write-Err { param($msg) Write-Host "[-] $msg" -ForegroundColor Red }

$LocalAppData = $env:LOCALAPPDATA
$AppData = $env:APPDATA
$ClaudeZhCnRoot = "$LocalAppData\Claude-zh-CN"
$BackupRoot = "$LocalAppData\Claude-zh-CN-backup"
$ConfigPath = "$AppData\Claude\config.json"

# ============================================
# 通用函数
# ============================================

function Take-Ownership {
    param($Path)

    if (-not (Test-Path $Path)) { return $true }

    Write-Step "正在获取所有权: $(Split-Path $Path -Leaf)..."
    $result = & takeown /F $Path /A /R /D Y 2>&1
    if ($LASTEXITCODE -eq 0) { return $true }

    try {
        $acl = Get-Acl $Path
        $currentUser = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
        $rule = New-Object System.Security.AccessControl.FileSystemAccessRule($currentUser, "FullControl", "Allow")
        $acl.SetAccessRule($rule)
        Set-Acl -Path $Path -AclObject $acl -ErrorAction SilentlyContinue
        return $true
    } catch {
        Write-Warn "获取所有权失败: $_"
        return $false
    }
}

function Grant-Permission {
    param($Path)
    $result = & icacls $Path /grant "Administrators:F" /T 2>&1
    return ($LASTEXITCODE -eq 0)
}

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

function Backup-ToArchive {
    param($SrcDir, $BackupDir)

    if (-not (Test-Path $SrcDir)) { return }

    $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
    $archiveName = "app_backup_$timestamp"
    $archivePath = Join-Path $BackupDir $archiveName

    New-Item -ItemType Directory -Path $archivePath -Force | Out-Null
    Write-Step "正在备份原文件到 $archivePath ..."

    $keyFiles = @(
        "resources\en-US.json",
        "resources\ion-dist\i18n\en-US.json",
        "resources\ion-dist\i18n\statsig\en-US.json"
    )

    foreach ($relPath in $keyFiles) {
        $srcFile = Join-Path $SrcDir $relPath
        $dstFile = Join-Path $archivePath $relPath
        if (Test-Path $srcFile) {
            $dstDir = Split-Path $dstFile -Parent
            New-Item -ItemType Directory -Path $dstDir -Force | Out-Null
            Copy-Item $srcFile $dstFile -Force
        }
    }

    $indexFiles = Get-ChildItem "$SrcDir\resources\ion-dist\assets\v1\index-*.js" -ErrorAction SilentlyContinue
    if ($indexFiles) {
        $indexBackupDir = Join-Path $archivePath "index_js_backup"
        New-Item -ItemType Directory -Path $indexBackupDir -Force | Out-Null
        foreach ($f in $indexFiles) {
            Copy-Item $f.FullName $indexBackupDir -Force
        }
    }

    Write-Success "备份完成"
}

function Copy-FileWithPermission {
    param($Src, $Dst)

    $dir = Split-Path $Dst -Parent
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }

    if (Test-Path $Dst) {
        Take-Ownership $Dst
    }

    try {
        Copy-Item $Src $Dst -Force -ErrorAction Stop
        return $true
    } catch {
        Write-Warn "复制失败: $_"
        return $false
    }
}

function Copy-AppDirectory {
    param($Src, $Dst)

    if (-not (Test-Path $Src)) { throw "源目录不存在: $Src" }
    New-Item -ItemType Directory -Path $Dst -Force | Out-Null

    $robocopyArgs = @($Src, $Dst, "/E", "/XF", "*.vhdx")

    $excludeDirs = @(
        "Cache", "Code Cache", "GPUCache", "DawnWebGPUCache", "DawnGraphiteCache",
        "Session Storage", "Local Storage", "Network", "Shared Dictionary",
        "blob_storage", "DIPS", "Crashpad", "Sentry", "logs"
    )

    foreach ($dir in $excludeDirs) {
        $robocopyArgs += @("/XD", $dir)
    }

    Write-Step "正在复制文件（排除缓存目录）..."
    & robocopy @robocopyArgs 2>&1 | Out-Null

    if ($LASTEXITCODE -ge 8) {
        Write-Warn "robocopy 返回码: $LASTEXITCODE"
    } else {
        Write-Success "复制完成"
    }
}

# ============================================
# JS Bundle 补丁
# ============================================

$COMMON_PATCHES = @(
    # 侧边栏标签
    @('label:"Chat"', 'label:"聊天"'),
    @('label:"Cowork"', 'label:"协作"'),
    @('label:"Code"', 'label:"代码"'),
    @('label:"Operon"', 'label:"实验室"'),
    @('label:"Projects"', 'label:"项目"'),
    @('label:"Scheduled"', 'label:"已安排"'),
    @('label:"Tasks"', 'label:"任务"'),
    @('label:"Replay"', 'label:"回放"'),
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

    # 过滤器
    @('oo="Local"', 'oo="本地"'),
    @('io="Cloud"', 'io="云端"'),
    @('co="All"', 'co:"全部"'),

    # 状态标签
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
    @('children:"Drag to pin"', 'children:"拖拽固定"'),
    @('"Drop here"', '"放在这里"'),
    @('"Let go"', '"松开"'),
    @('children:"View all"', 'children:"查看全部"'),
    @('children:"Clear filters"', 'children:"清除筛选"'),

    # 3P 相关
    @('children:"3P"', 'children:"第三方"'),
    @('gateway:"Gateway"', 'gateway:"自定义"'),

    # 任务相关
    @('title:"Scheduled tasks",subheader', 'title:"计划任务",subheader'),
    @('Ifn={all:"All",active:"Active",archived:"Archived"}', 'Ifn={all:"全部",active:"活跃",archived:"已归档"}'),
    @('"No tasks yet."', '"还没有任务。"'),
    @('"No active tasks."', '"没有活跃任务。"'),
    @('?"New task":"New chat"', '?"新建任务":"新建聊天"'),

    # 同步源
    @('label:"Documents"', 'label:"文档"'),
    @('label:"Files"', 'label:"文件"'),
    @('label:"Sync Sources"', 'label:"同步源"'),

    # 外观
    @('"Appearance"', '"外观"'),
    @('"Light"', '"浅色"'),
    @('"Dark"', '"深色"'),
    @('"Auto"', '"自动"'),

    # 设置页面
    @('"Settings"', '"设置"'),
    @('"General"', '"通用"'),
    @('"Account"', '"账户"'),
    @('"Developer"', '"开发者"'),
    @('"About"', '"关于"'),

    # 连接器和扩展
    @('"Extensions"', '"扩展"'),
    @('"MCP Servers"', '"MCP 服务器"'),

    # 虚拟机
    @('"Sandbox"', '"沙盒"'),
    @('"Workspace"', '"工作区"'),

    # 遥测
    @('"Telemetry"', '"遥测"'),
    @('"Updates"', '"更新"'),

    # 通用操作
    @('"Create"', '"创建"'),
    @('"Delete"', '"删除"'),
    @('"Edit"', '"编辑"'),
    @('"Save"', '"保存"'),
    @('"Cancel"', '"取消"'),
    @('"Confirm"', '"确认"'),
    @('"Close"', '"关闭"'),

    # 状态
    @('"Connected"', '"已连接"'),
    @('"Error"', '"错误"'),
    @('"Loading"', '"加载中"'),

    # 权限
    @('"Allow"', '"允许"'),
    @('"Enable"', '"启用"'),
    @('"Disable"', '"禁用"'),

    # 文件操作
    @('"Share"', '"分享"'),
    @('"Export"', '"导出"'),
    @('"Import"', '"导入"'),
    @('"Download"', '"下载"'),
    @('"Open"', '"打开"'),

    # Live Artifacts
    @('"Live"', '"实时"'),
    @('"Artifacts"', '"制品"'),

    # 其他
    @('"Copied!"', '"已复制！"'),
    @('"No results"', '"无结果"'),
    @('"Retry"', '"重试"')
)

$PATCHES_3P = @(
    @('"Egress Requirements"', '"出口要求"'),
    @('"Gateway base URL"', '"自定义 Base URL"'),
    @('"Gateway API key"', '"自定义 API Key"'),
    @('"Gateway auth scheme"', '"自定义认证方式"'),
    @('"Gateway extra headers"', '"自定义额外请求头"'),
    @('"Allow desktop extensions"', '"允许桌面扩展"'),
    @('"Allow user-added MCP servers"', '"允许用户添加 MCP 服务器"'),
    @('"Allow Claude Code tab"', '"允许 Claude Code 标签页"'),
    @('"Secure VM features"', '"安全虚拟机功能"'),
    @('"Required full VM sandbox"', '"要求完整虚拟机沙盒"'),
    @('"Allowed egress hosts"', '"允许的出口主机"'),
    @('"OpenTelemetry collector endpoint"', '"采集器端点"'),
    @('"OpenTelemetry exporter protocol"', '"导出协议"'),
    @('"Block auto-updates"', '"禁止自动更新"'),
    @('"Required organization"', '"必需的组织"'),
    @('"Inference provider"', '"推理供应商"'),
    @('"Connection"', '"连接方式"'),
    @('"Sandbox & workspace"', '"沙盒与工作区"'),
    @('"Connectors & extensions"', '"连接器与扩展"'),
    @('"Telemetry & updates"', '"遥测与更新"'),
    @('"Usage limits"', '"使用限制"'),
    @('"Plugins & skills"', '"插件与技能"')
)

function Patch-JsBundles {
    param($AssetsDir, $BackupDir)

    if (-not (Test-Path $AssetsDir)) {
        Write-Warn "Assets 目录不存在，跳过 JS 修补"
        return 0
    }

    Write-Step "正在修补 JS Bundle..."

    $totalPatches = 0
    $jsFiles = Get-ChildItem -Path $AssetsDir -Filter "*.js" -ErrorAction SilentlyContinue

    foreach ($fpath in $jsFiles) {
        $fileName = $fpath.Name
        $is3PFile = $fileName -match "c71860c77"

        if (-not $is3PFile -and $fileName -notmatch "^index-.*\.js$") {
            continue
        }

        Write-Step "  处理: $fileName"

        if (-not $DryRun) {
            # 备份
            $relPath = $fpath.FullName.Substring($AssetsDir.Length).TrimStart('\')
            $backupPath = Join-Path $BackupDir $relPath
            $backupDir = Split-Path $backupPath -Parent
            if (-not (Test-Path $backupDir)) {
                New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
            }
            if (-not (Test-Path $backupPath)) {
                Copy-Item $fpath.FullName $backupPath -Force -ErrorAction SilentlyContinue
            }
        }

        $content = Get-Content $fpath.FullName -Raw -Encoding UTF8
        $changed = 0

        foreach ($pair in $COMMON_PATCHES) {
            $old = $pair[0]
            $new = $pair[1]
            if ($content -match [regex]::Escape($old)) {
                if (-not $DryRun) {
                    $content = $content -replace [regex]::Escape($old), $new
                }
                $changed++
            }
        }

        if ($is3PFile) {
            foreach ($pair in $PATCHES_3P) {
                $old = $pair[0]
                $new = $pair[1]
                if ($content -match [regex]::Escape($old)) {
                    if (-not $DryRun) {
                        $content = $content -replace [regex]::Escape($old), $new
                    }
                    $changed++
                }
            }
        }

        if ($changed -gt 0) {
            if ($DryRun) {
                Write-Host "    预览: 将应用 $changed 处替换" -ForegroundColor Yellow
            } else {
                Write-Step "    应用了 $changed 处替换"
                Take-Ownership $fpath.FullName
                Set-Content -Path $fpath.FullName -Value $content -Encoding UTF8 -NoNewline
                $totalPatches += $changed
            }
        }
    }

    return $totalPatches
}

function Patch-LocaleWhitelist {
    param($AssetsDir)

    $indexFile = Get-ChildItem -Path $AssetsDir -Filter "index-*.js" -ErrorAction SilentlyContinue |
        Sort-Object LastWriteTime -Descending |
        Select-Object -First 1

    if (-not $indexFile) {
        Write-Warn "未找到 index-*.js，跳过语言白名单修补"
        return $false
    }

    $content = Get-Content $indexFile.FullName -Raw -Encoding UTF8
    if ($content.Contains('"zh-CN"')) {
        Write-Success "语言白名单已包含 zh-CN"
        return $true
    }

    $pattern = '\["en-US"(?:,"[a-zA-Z]{2,3}(?:-[a-zA-Z0-9]{2,4})*")+\]'
    $match = [regex]::Match($content, $pattern)
    if (-not $match.Success) {
        Write-Warn "未匹配到语言白名单数组"
        return $false
    }

    if (-not $DryRun) {
        $replacement = $match.Value.Substring(0, $match.Value.Length - 1) + ',"zh-CN"]'
        $content = $content.Substring(0, $match.Index) + $replacement + $content.Substring($match.Index + $match.Length)
        Set-Content -Path $indexFile.FullName -Value $content -Encoding UTF8 -NoNewline
    }

    Write-Success "已添加 zh-CN 到语言白名单"
    return $true
}

function Set-Locale {
    param($Locale = "zh-CN")

    if ($SkipLocale) {
        Write-Step "跳过 locale 设置"
        return $true
    }

    try {
        $ConfigDir = Split-Path $ConfigPath -Parent
        if (-not (Test-Path $ConfigDir)) {
            New-Item -ItemType Directory -Path $ConfigDir -Force | Out-Null
        }

        if (Test-Path $ConfigPath) {
            $config = Get-Content $ConfigPath -Raw -Encoding UTF8 | ConvertFrom-Json
            $config.locale = $Locale
            $config | ConvertTo-Json -Depth 10 | Set-Content $ConfigPath -Encoding UTF8
            Write-Step "已更新 locale=$Locale"
        } else {
            $config = @{ locale = $Locale }
            $config | ConvertTo-Json -Depth 10 | Set-Content $ConfigPath -Encoding UTF8
            Write-Step "已创建配置文件并设置 locale=$Locale"
        }
        return $true
    } catch {
        Write-Err "设置 locale 失败: $_"
        return $false
    }
}

# ============================================
# 主程序
# ============================================

Write-Host ""
Write-Host "========================================" -ForegroundColor Magenta
Write-Host "  Claude Desktop 汉化安装向导 v2.0" -ForegroundColor Magenta
Write-Host "========================================" -ForegroundColor Magenta
Write-Host ""

if ($DryRun) {
    Write-Host "[模式] 预览模式 - 不实际修改文件" -ForegroundColor Yellow
}
if ($ExtractOnly) {
    Write-Host "[模式] 仅提取字符串" -ForegroundColor Yellow
}
Write-Host ""

# 检查管理员权限
if ($InPlace -and -not $DryRun -and -not $ExtractOnly) {
    $isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
        [Security.Principal.WindowsBuiltInRole]::Administrator)
    if (-not $isAdmin) {
        Write-Err "InPlace 模式需要管理员权限。独立副本模式无需管理员权限。"
        Read-Host "按 Enter 键退出"
        exit 1
    }
}

try {
    Write-Step "正在查找 Claude 安装目录..."
    $ClaudeAppDir = Find-ClaudeAppDir -AppDirOverride $AppDir
    Write-Success "找到: $ClaudeAppDir"
} catch {
    Write-Err $_
    exit 1
}

$ResourcesDir = "$ClaudeAppDir\app\resources"
$AssetsDir = "$ResourcesDir\ion-dist\assets\v1"

if ($ExtractOnly) {
    Write-Step "提取 JS 字符串..."
    & "$ScriptDir\Extract-Strings.ps1" -AppDir $ClaudeAppDir -ShowAll
    exit 0
}

# 创建备份目录
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$ThisBackupRoot = "$BackupRoot\$timestamp"
New-Item -ItemType Directory -Path $ThisBackupRoot -Force | Out-Null

if (-not $DryRun) {
    Write-Step "正在关闭 Claude..."
    Get-Process -Name "Claude" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
    Write-Success "Claude 已关闭"
}

if ($InPlace) {
    # InPlace 模式
    Write-Host "[模式] 直接修改原安装目录" -ForegroundColor Yellow
    $TargetAppDir = "$ClaudeAppDir\app"
    $ResourcesDir = "$TargetAppDir\resources"

    Write-Step "正在获取目录权限..."
    $targetDirs = @($ResourcesDir, "$ResourcesDir\ion-dist", "$ResourcesDir\ion-dist\i18n")
    foreach ($d in $targetDirs) {
        if (Test-Path $d) {
            & takeown /F $d /A /R /D Y 2>&1 | Out-Null
            & icacls $d /grant "Administrators:F" /T 2>&1 | Out-Null
        }
    }
    Start-Sleep -Seconds 1

    Write-Step "正在备份原文件..."
    Backup-ToArchive -SrcDir $TargetAppDir -BackupDir $ThisBackupRoot

    Write-Step "正在安装中文翻译..."
    $errors = 0

    $desktopZhCn = Join-Path $ProjectRoot "resources\desktop-zh-CN.json"
    $targetDesktop = "$ResourcesDir\zh-CN.json"
    if (Test-Path $desktopZhCn) {
        if (Copy-FileWithPermission -Src $desktopZhCn -Dst $targetDesktop) {
            Write-Step "已安装: resources\zh-CN.json"
        } else { $errors++ }
    } else {
        Write-Err "找不到: $desktopZhCn"
        $errors++
    }

    $frontendZhCn = Join-Path $ProjectRoot "resources\frontend-zh-CN.json"
    $targetFrontend = "$ResourcesDir\ion-dist\i18n\zh-CN.json"
    if (Test-Path $frontendZhCn) {
        if (Copy-FileWithPermission -Src $frontendZhCn -Dst $targetFrontend) {
            Write-Step "已安装: ion-dist\i18n\zh-CN.json"
        } else { $errors++ }
    } else {
        Write-Err "找不到: $frontendZhCn"
        $errors++
    }

    $statsigZhCn = Join-Path $ProjectRoot "resources\statsig-zh-CN.json"
    $targetStatsig = "$ResourcesDir\ion-dist\i18n\statsig\zh-CN.json"
    if (Test-Path $statsigZhCn) {
        if (Copy-FileWithPermission -Src $statsigZhCn -Dst $targetStatsig) {
            Write-Step "已安装: ion-dist\i18n\statsig\zh-CN.json"
        } else { $errors++ }
    } else {
        Write-Err "找不到: $statsigZhCn"
        $errors++
    }

    Write-Step "正在修补 JS Bundle..."
    $jsPatches = Patch-JsBundles -AssetsDir "$ResourcesDir\ion-dist\assets\v1" -BackupDir $ThisBackupRoot
    if ($jsPatches -gt 0) {
        Write-Success "JS 补丁完成: $jsPatches 处替换"
    }

    Patch-LocaleWhitelist -AssetsDir "$ResourcesDir\ion-dist\assets\v1" | Out-Null

    Write-Step "正在修补上下文面板文本换行..."
    $ctxAssetsDir = if ($InPlace) { "$ResourcesDir\ion-dist\assets\v1" } else { "$ClaudeZhCnRoot\app\resources\ion-dist\assets\v1" }
    $ctxPatchResult = & node "$ScriptDir\patch-context-panel.js" $ctxAssetsDir 2>&1
    if ($LASTEXITCODE -eq 0 -and $ctxPatchResult -match "修补完成") {
        Write-Success "上下文面板补丁完成"
    }

} else {
    # 默认模式：复制到独立目录
    Write-Host "[模式] 创建独立副本" -ForegroundColor Yellow

    Backup-ToArchive -SrcDir "$ClaudeAppDir\app" -BackupDir $ThisBackupRoot

    if (Test-Path $ClaudeZhCnRoot) {
        Write-Step "正在删除旧的中文版目录..."
        Remove-Item $ClaudeZhCnRoot -Recurse -Force -ErrorAction SilentlyContinue
    }

    Write-Step "正在复制 Claude 到本地目录..."
    Copy-AppDirectory -Src "$ClaudeAppDir\app" -Dst "$ClaudeZhCnRoot\app"

    Write-Step "正在安装中文翻译..."
    $errors = 0

    $desktopZhCn = Join-Path $ProjectRoot "resources\desktop-zh-CN.json"
    $targetDesktop = "$ClaudeZhCnRoot\app\resources\zh-CN.json"
    if (Test-Path $desktopZhCn) {
        Copy-Item $desktopZhCn $targetDesktop -Force
        Write-Step "已安装: resources\zh-CN.json"
    } else {
        Write-Err "找不到: $desktopZhCn"
        $errors++
    }

    $frontendZhCn = Join-Path $ProjectRoot "resources\frontend-zh-CN.json"
    $targetFrontend = "$ClaudeZhCnRoot\app\resources\ion-dist\i18n\zh-CN.json"
    if (Test-Path $frontendZhCn) {
        $targetFrontendDir = Split-Path $targetFrontend -Parent
        New-Item -ItemType Directory -Path $targetFrontendDir -Force | Out-Null
        Copy-Item $frontendZhCn $targetFrontend -Force
        Write-Step "已安装: ion-dist\i18n\zh-CN.json"
    } else {
        Write-Err "找不到: $frontendZhCn"
        $errors++
    }

    $statsigZhCn = Join-Path $ProjectRoot "resources\statsig-zh-CN.json"
    $targetStatsig = "$ClaudeZhCnRoot\app\resources\ion-dist\i18n\statsig\zh-CN.json"
    if (Test-Path $statsigZhCn) {
        $targetStatsigDir = Split-Path $targetStatsig -Parent
        New-Item -ItemType Directory -Path $targetStatsigDir -Force | Out-Null
        Copy-Item $statsigZhCn $targetStatsig -Force
        Write-Step "已安装: ion-dist\i18n\statsig\zh-CN.json"
    } else {
        Write-Err "找不到: $statsigZhCn"
        $errors++
    }

    Write-Step "正在修补 JS Bundle..."
    $jsPatches = Patch-JsBundles -AssetsDir "$ClaudeZhCnRoot\app\resources\ion-dist\assets\v1" -BackupDir $ThisBackupRoot
    if ($jsPatches -gt 0) {
        Write-Success "JS 补丁完成: $jsPatches 处替换"
    }

    Patch-LocaleWhitelist -AssetsDir "$ClaudeZhCnRoot\app\resources\ion-dist\assets\v1" | Out-Null

    Write-Step "正在修补上下文面板文本换行..."
    $ctxAssetsDir = if ($InPlace) { "$ResourcesDir\ion-dist\assets\v1" } else { "$ClaudeZhCnRoot\app\resources\ion-dist\assets\v1" }
    $ctxPatchResult = & node "$ScriptDir\patch-context-panel.js" $ctxAssetsDir 2>&1
    if ($LASTEXITCODE -eq 0 -and $ctxPatchResult -match "修补完成") {
        Write-Success "上下文面板补丁完成"
    }

    Write-Step "正在创建启动器..."
    $startBat = "$ClaudeZhCnRoot\run-zh-cn.bat"
    $startBatContent = "@echo off`nREM Claude Desktop Chinese version launcher`nstart `"`" `"%LOCALAPPDATA%\Claude-zh-CN\app\Claude.exe`""
    Set-Content -Path $startBat -Value $startBatContent -Encoding ASCII

    $startPs1 = "$ClaudeZhCnRoot\run-zh-cn.ps1"
    $startPs1Content = "Start-Process `"$env:LOCALAPPDATA\Claude-zh-CN\app\Claude.exe`""
    Set-Content -Path $startPs1 -Value $startPs1Content -Encoding UTF8

    Write-Success "启动器已创建: $ClaudeZhCnRoot"

    Write-Step "正在创建卸载脚本..."
    $uninstallBat = "$ClaudeZhCnRoot\uninstall.bat"
    $uninstallBatContent = "@echo off`nREM Claude Desktop Chinese version uninstaller`nif exist `"%LOCALAPPDATA%\Claude-zh-CN`" rmdir /s /q `"%LOCALAPPDATA%\Claude-zh-CN`"`npowershell -NoProfile -ExecutionPolicy Bypass -File `"%~dp0..\scripts\uninstall.ps1`"`necho Done`npause"
    Set-Content -Path $uninstallBat -Value $uninstallBatContent -Encoding ASCII
    Write-Success "卸载脚本已创建"
}

Set-Locale -Locale "zh-CN"

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  安装完成!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

if ($InPlace) {
    Write-Host "请重启 Claude Desktop 使汉化生效" -ForegroundColor Cyan
} else {
    Write-Host "启动方式: $ClaudeZhCnRoot\run-zh-cn.bat" -ForegroundColor Cyan
    Write-Host "或: $ClaudeZhCnRoot\run-zh-cn.ps1" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "卸载方式: $ClaudeZhCnRoot\uninstall.bat" -ForegroundColor Yellow
}
Write-Host ""
Write-Host "备份位置: $ThisBackupRoot" -ForegroundColor Gray
Write-Host ""

Read-Host "按 Enter 键退出"
