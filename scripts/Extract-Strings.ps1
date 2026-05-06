# Claude Desktop 字符串提取工具
# 从 JS bundle 中提取可能需要翻译的字符串

param(
    [string]$AppDir,
    [switch]$ShowAll,
    [int]$MinLength = 3
)

$ErrorActionPreference = 'Continue'

$ClaudeAppDir = $AppDir

if (-not $ClaudeAppDir) {
    $windowsApps = "C:\Program Files\WindowsApps"
    if (Test-Path $windowsApps) {
        $candidates = Get-ChildItem "$windowsApps\Claude_*_x64__*\app\resources\en-US.json" -ErrorAction SilentlyContinue |
            Sort-Object { [version]($_.Directory.Parent.Name -replace 'Claude_(\d+\.\d+\.\d+\.\d+)_.*', '$1') } -Descending |
            Select-Object -First 1

        if ($candidates) {
            $ClaudeAppDir = $candidates.Directory.Parent.Parent.FullName
        }
    }
}

if (-not $ClaudeAppDir) {
    Write-Host "找不到 Claude 安装目录" -ForegroundColor Red
    exit 1
}

$assetsDir = "$ClaudeAppDir\app\resources\ion-dist\assets\v1"

if (-not (Test-Path $assetsDir)) {
    Write-Host "Assets 目录不存在: $assetsDir" -ForegroundColor Red
    exit 1
}

Write-Host "扫描 JS Bundle 中的字符串..." -ForegroundColor Cyan
Write-Host "目录: $assetsDir" -ForegroundColor Gray
Write-Host ""

# 已知的英文关键词（需要翻译的）
$keywords = @(
    "Chat", "Cowork", "Code", "Operon", "Projects", "Scheduled", "Tasks",
    "Replay", "Dispatch", "Ideas", "Apps", "Security", "Customize", "Status",
    "Environment", "Documents", "Files", "Settings", "Preferences", "Help",
    "New chat", "New task", "New session", "Delete", "Edit", "Copy", "Cut", "Paste",
    "Send", "Cancel", "OK", "Confirm", "Save", "Close", "Back", "Next",
    "Active", "Archived", "All", "Local", "Cloud", "Remote",
    "Theme", "Appearance", "Font", "Font Family",
    "Search", "Filter", "Sort", "Group", "Date", "Name", "Size",
    "Enable", "Disable", "Required", "Optional",
    "Connected", "Disconnected", "Connecting", "Error", "Warning", "Success",
    "Loading", "Ready", "Waiting", "Processing",
    "Share", "Export", "Import", "Download", "Upload",
    "Enter", "Leave", "Join", "Create", "Remove", "Update",
    "Gateway", "3P", "Third Party",
    "Artifact", "Artifacts", "Live",
    "Pinned", "Recent", "Recents", "Last activity",
    "Scheduled tasks", "Planned tasks",
    "No tasks", "No chats", "No results",
    "Drop here", "Let go", "Drag to pin",
    "View all", "Clear filters", "All projects",
    "Dev panels", "Development panels",
    "Egress", "Allowed hosts", "Collector endpoint",
    "Sandbox", "VM", "Workspace",
    "Telemetry", "Updates", "Auto-update",
    "Plugins", "Skills", "Extensions", "MCP Servers",
    "Organization", "Account", "Billing", "Usage limits",
    "Inference provider", "Connection",
    "Developer mode", "Developer tools", "Logs"
)

$foundStrings = @{}
$jsFiles = Get-ChildItem $assetsDir -Filter "*.js" -ErrorAction SilentlyContinue

foreach ($jsFile in $jsFiles) {
    Write-Host "分析: $($jsFile.Name)" -ForegroundColor Gray

    $content = Get-Content $jsFile.FullName -Raw -Encoding UTF8

    foreach ($keyword in $keywords) {
        # 匹配各种模式
        $patterns = @(
            [regex]::Escape("label:`"$keyword`""),
            [regex]::Escape("label:`"$keyword"),
            [regex]::Escape("label:`'$keyword`'"),
            [regex]::Escape("children:`"$keyword`""),
            [regex]::Escape("title:`"$keyword`""),
            [regex]::Escape("`"$keyword`""),
            [regex]::Escape("`'$keyword`'"),
            [regex]::Escape("$keyword:"),
            [regex]::Escape("$keyword=")
        )

        foreach ($pattern in $patterns) {
            if ($content -match $pattern) {
                $context = $null

                # 尝试获取上下文
                $match = [regex]::Match($content, $pattern)
                if ($match.Success) {
                    $start = [Math]::Max(0, $match.Index - 30)
                    $length = [Math]::Min(100, $match.Length + 60)
                    $context = $content.Substring($start, $length) -replace "`n", " " -replace "`r", ""
                    $context = $context -replace '\s+', ' '
                }

                $key = "$keyword|$($jsFile.Name)"
                if (-not $foundStrings.ContainsKey($key)) {
                    $foundStrings[$key] = @{
                        Keyword = $keyword
                        File = $jsFile.Name
                        Context = $context
                        Count = 1
                    }
                } else {
                    $foundStrings[$key].Count++
                }
            }
        }
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "发现的可能需要翻译的字符串" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$results = $foundStrings.Values | Sort-Object Keyword

foreach ($item in $results) {
    $countStr = if ($item.Count -gt 1) { " (x$($item.Count))" } else { "" }
    Write-Host "[$($item.File)] $($item.Keyword)$countStr" -ForegroundColor Yellow

    if ($ShowAll -and $item.Context) {
        Write-Host "  上下文: ...$($item.Context)..." -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "总计: $($results.Count) 个唯一字符串" -ForegroundColor Green

# 输出可复制的 PowerShell 补丁格式
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "PowerShell 补丁格式" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

$grouped = $results | Group-Object File
foreach ($group in $grouped) {
    Write-Host ""
    Write-Host "# === $($group.Name) ===" -ForegroundColor Magenta
    Write-Host "`$PATCHES[`"$($group.Name)`"] = @("

    foreach ($item in $group.Group) {
        $chinese = ""
        switch ($item.Keyword) {
            "Chat" { $chinese = "聊天" }
            "Cowork" { $chinese = "协作" }
            "Code" { $chinese = "代码" }
            "Operon" { $chinese = "实验室" }
            "Projects" { $chinese = "项目" }
            "Scheduled" { $chinese = "已安排" }
            "Tasks" { $chinese = "任务" }
            "Replay" { $chinese = "回放" }
            "Dispatch" { $chinese = "调度" }
            "Ideas" { $chinese = "想法" }
            "Apps" { $chinese = "应用" }
            "Security" { $chinese = "安全" }
            "Customize" { $chinese = "自定义" }
            "Status" { $chinese = "状态" }
            "Environment" { $chinese = "环境" }
            "Documents" { $chinese = "文档" }
            "Files" { $chinese = "文件" }
            "Settings" { $chinese = "设置" }
            "Active" { $chinese = "活跃" }
            "Archived" { $chinese = "已归档" }
            "All" { $chinese = "全部" }
            "Local" { $chinese = "本地" }
            "Cloud" { $chinese = "云端" }
            "Theme" { $chinese = "主题" }
            "Font" { $chinese = "字体" }
            "Gateway" { $chinese = "自定义" }
            "3P" { $chinese = "第三方" }
            "Artifacts" { $chinese = "制品" }
            "Pinned" { $chinese = "已固定" }
            "Recents" { $chinese = "最近" }
            "Delete" { $chinese = "删除" }
            "Edit" { $chinese = "编辑" }
            "Copy" { $chinese = "复制" }
            "Save" { $chinese = "保存" }
            "Cancel" { $chinese = "取消" }
            default { $chinese = "[待翻译]" }
        }

        Write-Host "    @(`"$($item.Keyword)`", `"`"$chinese`"`"),"
    }

    Write-Host ")"
}
