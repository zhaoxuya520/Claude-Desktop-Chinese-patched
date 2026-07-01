param(
    [string]$PatchedRoot,
    [int]$ProxyPort = 8877
)

$ErrorActionPreference = "Stop"

function Write-Step { param($msg) Write-Host "[*] $msg" -ForegroundColor Cyan }
function Write-Success { param($msg) Write-Host "[+] $msg" -ForegroundColor Green }
function Write-Err { param($msg) Write-Host "[-] $msg" -ForegroundColor Red }

if (-not $PatchedRoot) {
    $PatchedRoot = Split-Path -Parent $PSScriptRoot
}

if (-not (Test-Path -LiteralPath $PatchedRoot)) {
    throw "Patched root not found: $PatchedRoot"
}

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    throw "node.exe not found in PATH"
}

# Resolve the installed official Claude package up front: we need its paths both
# to pass the official zh strings to the proxy and to activate it by AUMID.
$pkg = Get-AppxPackage |
    Where-Object { $_.Name -eq "Claude" } |
    Sort-Object Version -Descending |
    Select-Object -First 1

if (-not $pkg) {
    throw "Official Claude package not found"
}

$officialExe = Join-Path $pkg.InstallLocation "app\Claude.exe"
if (-not (Test-Path -LiteralPath $officialExe)) {
    throw "Official Claude exe not found: $officialExe"
}

# Official zh strings: Anthropic ships them inside SOME Claude versions
# (app\resources\ion-dist\i18n\zh-CN.json) but not others -- 1.17377 dropped the
# file, and claude.ai does not serve Chinese either. So don't depend on the
# CURRENT version having it: scan EVERY installed Claude package, and cache the
# last good copy under %LOCALAPPDATA% so coverage survives an update that removes
# it. The proxy reads whatever we point CLAUDE_ZH_OFFICIAL_I18N at (below).
$zhCacheDir = Join-Path $env:LOCALAPPDATA "claude-zh-proxy"
$zhCache = Join-Path $zhCacheDir "official-zh-CN.json"
$officialFound = Get-AppxPackage |
    Where-Object { $_.Name -eq "Claude" } |
    ForEach-Object { Join-Path $_.InstallLocation "app\resources\ion-dist\i18n\zh-CN.json" } |
    Where-Object { Test-Path -LiteralPath $_ } |
    Select-Object -First 1
if ($officialFound) {
    if (-not (Test-Path -LiteralPath $zhCacheDir)) {
        New-Item -ItemType Directory -Force -Path $zhCacheDir | Out-Null
    }
    Copy-Item -LiteralPath $officialFound -Destination $zhCache -Force -ErrorAction SilentlyContinue
}
# Prefer the cache (last known good); fall back to whatever we just found, or
# $null if no installed version ever shipped zh and the cache is still empty.
$officialZh = if (Test-Path -LiteralPath $zhCache) { $zhCache } else { $officialFound }

Write-Step "Stopping existing Claude Desktop (preserving Claude Code) and old proxy..."
# Only kill the packaged Claude Desktop (runs from WindowsApps); never touch a
# Claude Code CLI, which is ALSO named claude.exe but lives elsewhere.
Get-CimInstance Win32_Process -Filter "Name='Claude.exe'" |
    Where-Object { $_.CommandLine -match "WindowsApps" } |
    ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
Get-CimInstance Win32_Process |
    Where-Object { $_.Name -eq "node.exe" -and $_.CommandLine -match "claude-zh-proxy.js" } |
    ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
Start-Sleep -Seconds 2

$proxyOut = Join-Path $env:LOCALAPPDATA "Claude-zh-proxy-official-stdout.log"
$proxyErr = Join-Path $env:LOCALAPPDATA "Claude-zh-proxy-official-stderr.log"
Remove-Item $proxyOut, $proxyErr -Force -ErrorAction SilentlyContinue

Write-Step "Starting zh proxy on 127.0.0.1:$ProxyPort ..."
if ($officialZh -and (Test-Path -LiteralPath $officialZh)) {
    $env:CLAUDE_ZH_OFFICIAL_I18N = $officialZh
    Write-Step "Official zh source: $officialZh"
} else {
    Remove-Item Env:\CLAUDE_ZH_OFFICIAL_I18N -ErrorAction SilentlyContinue
    Write-Err "Official zh not found in any installed version and no cache; bundled fallback only"
}

$proxyProc = Start-Process -FilePath "node.exe" `
    -ArgumentList @("scripts\claude-zh-proxy.js") `
    -WorkingDirectory $PatchedRoot `
    -PassThru `
    -WindowStyle Hidden `
    -RedirectStandardOutput $proxyOut `
    -RedirectStandardError $proxyErr

Start-Sleep -Seconds 5
$tcpOk = $false
try {
    $tcpOk = (Test-NetConnection 127.0.0.1 -Port $ProxyPort -WarningAction SilentlyContinue).TcpTestSucceeded
} catch {
    $tcpOk = $false
}

if (-not $tcpOk) {
    Write-Err "Proxy did not open port $ProxyPort"
    if (Test-Path -LiteralPath $proxyOut) { Get-Content -LiteralPath $proxyOut -Encoding UTF8 }
    if (Test-Path -LiteralPath $proxyErr) { Get-Content -LiteralPath $proxyErr -Encoding UTF8 }
    throw "Proxy failed to start"
}

Write-Step "Clearing safe frontend caches..."
# MSIX virtualizes %APPDATA%\Claude into the package container, so the real user
# data (and the Service Worker cache that can pin stale i18n/HTML) lives here.
$userData = Join-Path $env:LOCALAPPDATA "Packages\$($pkg.PackageFamilyName)\LocalCache\Roaming\Claude"
if (-not (Test-Path -LiteralPath $userData)) { $userData = Join-Path $env:APPDATA "Claude" }
$cacheDirs = @(
    "Cache",
    "Code Cache",
    "GPUCache",
    "DawnWebGPUCache",
    "DawnGraphiteCache",
    "Service Worker\CacheStorage",
    "Service Worker\ScriptCache"
)

foreach ($relative in $cacheDirs) {
    $cachePath = Join-Path $userData $relative
    if (Test-Path -LiteralPath $cachePath) {
        Remove-Item -LiteralPath $cachePath -Recurse -Force -ErrorAction SilentlyContinue
    }
}

Write-Step "Launching official Claude through proxy (AUMID activation)..."
$claudeArgs = @(
    "--proxy-server=http://127.0.0.1:$ProxyPort",
    "--ignore-certificate-errors",
    "--lang=zh-CN"
)

# Launch via the package's app activation (AUMID), NOT the inner exe path.
# Directly starting WindowsApps\...\Claude.exe on 1.15962.x makes the app exit
# instantly (it never reaches the main process logger). Proper MSIX activation
# keeps the package identity intact AND still forwards our Chromium switches,
# because Claude is a Windows.FullTrustApplication.
$aumid = "$($pkg.PackageFamilyName)!Claude"
Write-Step "AUMID: $aumid"
Start-Process -FilePath "shell:AppsFolder\$aumid" -ArgumentList $claudeArgs

Write-Success "Official Claude launched with proxy interception"
Write-Host "Proxy stdout: $proxyOut" -ForegroundColor Gray
Write-Host "Proxy stderr: $proxyErr" -ForegroundColor Gray
