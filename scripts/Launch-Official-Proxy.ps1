param(
    [string]$PatchedRoot = "C:\Users\24781\Downloads\Claude-Desktop-Chinese-1.6259.1-patched",
    [int]$ProxyPort = 8877
)

$ErrorActionPreference = "Stop"

function Write-Step { param($msg) Write-Host "[*] $msg" -ForegroundColor Cyan }
function Write-Success { param($msg) Write-Host "[+] $msg" -ForegroundColor Green }
function Write-Err { param($msg) Write-Host "[-] $msg" -ForegroundColor Red }

if (-not (Test-Path -LiteralPath $PatchedRoot)) {
    throw "Patched root not found: $PatchedRoot"
}

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    throw "node.exe not found in PATH"
}

Write-Step "Stopping existing Claude and proxy processes..."
Get-Process -Name "Claude" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Get-CimInstance Win32_Process |
    Where-Object { $_.Name -eq "node.exe" -and $_.CommandLine -match "claude-zh-proxy.js" } |
    ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
Start-Sleep -Seconds 2

$proxyOut = Join-Path $env:LOCALAPPDATA "Claude-zh-proxy-official-stdout.log"
$proxyErr = Join-Path $env:LOCALAPPDATA "Claude-zh-proxy-official-stderr.log"
Remove-Item $proxyOut, $proxyErr -Force -ErrorAction SilentlyContinue

Write-Step "Starting zh proxy on 127.0.0.1:$ProxyPort ..."
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

Write-Step "Clearing safe frontend caches..."
$userData = Join-Path $env:APPDATA "Claude"
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

Write-Step "Launching official Claude through proxy..."
$args = @(
    "--proxy-server=http://127.0.0.1:$ProxyPort",
    "--ignore-certificate-errors",
    "--lang=zh-CN"
)

Start-Process -FilePath $officialExe -ArgumentList $args -WorkingDirectory (Split-Path $officialExe -Parent)

Write-Success "Official Claude launched with proxy interception"
Write-Host "Proxy stdout: $proxyOut" -ForegroundColor Gray
Write-Host "Proxy stderr: $proxyErr" -ForegroundColor Gray
