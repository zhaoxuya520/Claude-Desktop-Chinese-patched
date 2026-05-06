# Claude Desktop 汉化卸载脚本
# 恢复英文界面

param(
    [switch]$KeepLocale,     # 可选：保留 locale 设置
    [switch]$KeepFiles,     # 可选：只移除 locale，不删除中文版文件
    [switch]$Restore        # 可选：从备份恢复 WindowsApps 原文件
)

$ErrorActionPreference = 'Stop'

function Write-Step { param($msg) Write-Host "[*] $msg" -ForegroundColor Cyan }
function Write-Success { param($msg) Write-Host "[+] $msg" -ForegroundColor Green }
function Write-Warn { param($msg) Write-Host "[!] $msg" -ForegroundColor Yellow }
function Write-Err { param($msg) Write-Host "[-] $msg" -ForegroundColor Red }

$LocalAppData = $env:LOCALAPPDATA
$AppData = $env:APPDATA
$ClaudeZhCnRoot = "$LocalAppData\Claude-zh-CN"
$BackupRoot = "$LocalAppData\Claude-zh-CN-backup"
$ConfigPath = "$AppData\Claude\config.json"

function Find-ClaudeAppDir {
    $windowsApps = "C:\Program Files\WindowsApps"
    if (Test-Path $windowsApps) {
        $candidates = Get-ChildItem "$windowsApps\Claude_*_x64__*\app\resources\en-US.json" -ErrorAction SilentlyContinue |
            Sort-Object { [version]($_.Directory.Parent.Name -replace 'Claude_(\d+\.\d+\.\d+\.\d+)_.*', '$1') } -Descending |
            Select-Object -First 1

        if ($candidates) {
            return $candidates.Directory.Parent.FullName
        }
    }
    return $null
}

function Restore-FromBackup {
    param($BackupDir, $TargetDir)

    if (-not (Test-Path $BackupDir)) {
        Write-Warn "备份目录不存在: $BackupDir"
        return 0
    }

    $restored = 0
    $files = Get-ChildItem $BackupDir -Recurse -File
    foreach ($file in $files) {
        $relPath = $file.FullName.Substring($BackupDir.Length).TrimStart('\')
        $dstPath = Join-Path $TargetDir $relPath
        $dstDir = Split-Path $dstPath -Parent

        if (-not (Test-Path $dstDir)) {
            New-Item -ItemType Directory -Path $dstDir -Force | Out-Null
        }

        try {
            # 获取目标文件所有权
            if (Test-Path $dstPath) {
                & takeown /F $dstPath /A 2>&1 | Out-Null
                & icacls $dstPath /grant "Administrators:F" 2>&1 | Out-Null
            }

            Copy-Item $file.FullName $dstPath -Force
            $restored++
        } catch {
            Write-Warn "恢复失败: $relPath"
        }
    }

    return $restored
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Magenta
Write-Host "  Claude Desktop 中文界面卸载程序" -ForegroundColor Magenta
Write-Host "========================================" -ForegroundColor Magenta
Write-Host ""

# 1. 检查管理员权限
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
    [Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Err "此脚本需要管理员权限。"
    Write-Host "请右键 PowerShell -> 以管理员身份运行" -ForegroundColor Yellow
    Read-Host "按 Enter 键退出"
    exit 1
}

# 2. 关闭 Claude
Write-Step "正在关闭 Claude..."
Get-Process -Name "Claude" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 1

# 3. 从备份恢复（如果指定了 -Restore）
if ($Restore) {
    Write-Step "正在从备份恢复..."
    $ClaudeAppDir = Find-ClaudeAppDir
    if ($ClaudeAppDir) {
        $ResourcesDir = "$ClaudeAppDir\app\resources"
        $AssetsDir = "$ResourcesDir\ion-dist\assets\v1"

        # 恢复 chunks 备份
        $chunksBackup = Join-Path $BackupRoot "chunks"
        if (Test-Path $chunksBackup) {
            $restored = Restore-FromBackup -BackupDir $chunksBackup -TargetDir $AssetsDir
            Write-Success "已恢复 JS Bundle: $restored 个文件"
        }

        # 恢复其他备份
        $backups = Get-ChildItem $BackupRoot -Directory
        foreach ($backup in $backups) {
            if ($backup.Name -ne "chunks") {
                $restored = Restore-FromBackup -BackupDir $backup.FullName -TargetDir $ResourcesDir
                if ($restored -gt 0) {
                    Write-Success "已恢复 $($backup.Name): $restored 个文件"
                }
            }
        }

        Write-Success "恢复完成"
    } else {
        Write-Warn "找不到 Claude 安装目录"
    }
}

# 4. 处理 locale
if ($KeepLocale) {
    Write-Step "保留 locale 设置"
} else {
    Write-Step "正在移除 locale..."
    if (Test-Path $ConfigPath) {
        try {
            $config = Get-Content $ConfigPath -Raw -Encoding UTF8 | ConvertFrom-Json
            if ($config.locale -eq "zh-CN") {
                $config.PSObject.Properties.Remove('locale')
                $config | ConvertTo-Json -Depth 10 | Set-Content $ConfigPath -Encoding UTF8
                Write-Success "已移除 locale=zh-CN"
            } else {
                Write-Step "locale 不是 zh-CN，无需修改"
            }
        } catch {
            Write-Warn "恢复 locale 失败: $_"
        }
    } else {
        Write-Warn "配置文件不存在，跳过"
    }
}

# 5. 处理中文版目录
if ($KeepFiles) {
    Write-Step "保留中文版目录"
} else {
    if (Test-Path $ClaudeZhCnRoot) {
        Write-Step "正在删除 $ClaudeZhCnRoot ..."

        $starter = Join-Path $ClaudeZhCnRoot "run-zh-cn.bat"
        if (-not (Test-Path $starter)) {
            Write-Warn "目录不是标准中文版安装，可能是其他版本"
            Write-Host "强制删除? (Ctrl+C 取消)" -ForegroundColor Yellow
            Start-Sleep -Seconds 2
        }

        try {
            Remove-Item $ClaudeZhCnRoot -Recurse -Force -ErrorAction Stop
            Write-Success "已删除中文版目录"
        } catch {
            Write-Err "删除失败: $_"
            Write-Step "可能需要手动删除或重启后重试"
        }
    } else {
        Write-Step "中文版目录不存在，跳过"
    }
}

# 6. 显示备份信息
if (Test-Path $BackupRoot) {
    $backups = Get-ChildItem $BackupRoot -Directory -ErrorAction SilentlyContinue
    if ($backups) {
        Write-Host ""
        Write-Host "发现以下备份目录：" -ForegroundColor Cyan
        foreach ($b in $backups | Sort-Object Name -Descending | Select-Object -First 5) {
            $fileCount = (Get-ChildItem $b.FullName -Recurse -File).Count
            Write-Host "  $($b.Name) ($fileCount 文件)" -ForegroundColor Gray
        }
        Write-Host ""
        Write-Host "提示：使用 -Restore 参数可自动恢复备份" -ForegroundColor Yellow
    }
}

# 完成
Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  卸载完成！" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "提示：" -ForegroundColor Cyan
Write-Host "  - 官方 Claude Desktop 不受影响" -ForegroundColor Gray
Write-Host "  - 备份目录: $BackupRoot" -ForegroundColor Gray
Write-Host "  - 使用 -Restore 可从备份恢复原文件" -ForegroundColor Gray
Write-Host ""

Read-Host "按 Enter 键退出"
