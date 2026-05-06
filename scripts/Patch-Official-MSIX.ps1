param(
    [string]$PatchedRoot
)

$ErrorActionPreference = "Stop"

function Write-Step { param($msg) Write-Host "[*] $msg" -ForegroundColor Cyan }
function Write-Success { param($msg) Write-Host "[+] $msg" -ForegroundColor Green }
function Write-Warn { param($msg) Write-Host "[!] $msg" -ForegroundColor Yellow }
function Write-Err { param($msg) Write-Host "[-] $msg" -ForegroundColor Red }

if (-not $PatchedRoot) {
    $PatchedRoot = Split-Path -Parent $PSScriptRoot
}

$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
    [Security.Principal.WindowsBuiltInRole]::Administrator
)

if (-not $isAdmin) {
    Write-Err "此脚本需要管理员权限。"
    exit 1
}

if (-not (Test-Path -LiteralPath $PatchedRoot)) {
    throw "Patched root not found: $PatchedRoot"
}

$pkg = Get-AppxPackage |
    Where-Object { $_.Name -eq "Claude" } |
    Sort-Object Version -Descending |
    Select-Object -First 1

if (-not $pkg) {
    throw "Claude MSIX package not found"
}

$pkgRoot = $pkg.InstallLocation
$resources = Join-Path $pkgRoot "app\resources"
$i18n = Join-Path $resources "ion-dist\i18n"
$assets = Join-Path $resources "ion-dist\assets\v1"
$backupRoot = Join-Path $env:LOCALAPPDATA ("Claude-zh-CN-backup\official-msix-" + (Get-Date -Format "yyyyMMdd-HHmmss"))

New-Item -ItemType Directory -Path $backupRoot -Force | Out-Null

Write-Step "Closing Claude..."
Get-Process -Name "Claude" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

Write-Step "Taking ownership of resources..."
& takeown /F $resources /A /R /D Y | Out-Null
& icacls $resources /grant "Administrators:F" /T /Q | Out-Null

Write-Step "Backing up touched files..."
$backupFiles = @(
    (Join-Path $resources "en-US.json"),
    (Join-Path $i18n "en-US.json"),
    (Join-Path $i18n "statsig\en-US.json")
)

$indexFiles = Get-ChildItem -LiteralPath $assets -Filter "index-*.js" -File -ErrorAction SilentlyContinue
$backupFiles += $indexFiles.FullName

foreach ($file in $backupFiles) {
    if (-not (Test-Path -LiteralPath $file)) { continue }
    $relative = $file.Substring($resources.Length).TrimStart("\")
    $dest = Join-Path $backupRoot $relative
    $destDir = Split-Path $dest -Parent
    New-Item -ItemType Directory -Path $destDir -Force | Out-Null
    Copy-Item -LiteralPath $file -Destination $dest -Force
}

Write-Step "Copying zh-CN locale files..."
Copy-Item -LiteralPath (Join-Path $PatchedRoot "resources\desktop-zh-CN.json") -Destination (Join-Path $resources "zh-CN.json") -Force
Copy-Item -LiteralPath (Join-Path $PatchedRoot "resources\frontend-zh-CN.json") -Destination (Join-Path $i18n "zh-CN.json") -Force
Copy-Item -LiteralPath (Join-Path $PatchedRoot "resources\statsig-zh-CN.json") -Destination (Join-Path $i18n "statsig\zh-CN.json") -Force
"{}" | Set-Content -LiteralPath (Join-Path $i18n "zh-CN.overrides.json") -Encoding UTF8

Write-Step "Patching main locale bundle..."
$index = $indexFiles | Sort-Object LastWriteTime -Descending | Select-Object -First 1
if (-not $index) {
    throw "index-*.js not found under $assets"
}

$js = Get-Content -LiteralPath $index.FullName -Raw -Encoding UTF8

if (-not $js.Contains('"zh-CN"')) {
    $pattern = '\["en-US"(?:,"[a-zA-Z]{2,3}(?:-[a-zA-Z0-9]{2,4})*")+\]'
    $match = [regex]::Match($js, $pattern)
    if ($match.Success) {
        $replacement = $match.Value.Substring(0, $match.Value.Length - 1) + ',"zh-CN"]'
        $js = $js.Substring(0, $match.Index) + $replacement + $js.Substring($match.Index + $match.Length)
    }
}

$patternLocale = 'const K1t="spa:locale",Z1t=(?:Qk\(\[\(\(\)=>\{try\{return localStorage\.getItem\(K1t\)\}catch\{return null\}\}\)\(\),\.\.\.navigator\.languages\]\)|"[^"]+");'
$matchLocale = [regex]::Match($js, $patternLocale)
if ($matchLocale.Success) {
    $replacementLocale = 'const K1t="spa:locale",Z1t="zh-CN";try{localStorage.setItem(K1t,Z1t)}catch{}'
    $js = $js.Substring(0, $matchLocale.Index) + $replacementLocale + $js.Substring($matchLocale.Index + $matchLocale.Length)
}

$patternBootstrap = 'Cb\(\)\.then\(([A-Za-z_$][\w$]*)=>\{if\(([A-Za-z_$][\w$]*)\|\|!\1\?\.locale\)return;const\s+([A-Za-z_$][\w$]*)=Qk\(\[\1\.locale\]\);'
$matchBootstrap = [regex]::Match($js, $patternBootstrap)
if ($matchBootstrap.Success) {
    $replacementBootstrap =
        'Cb().then(' + $matchBootstrap.Groups[1].Value +
        '=>{if(' + $matchBootstrap.Groups[2].Value +
        ')return;const ' + $matchBootstrap.Groups[3].Value +
        '="zh-CN";try{localStorage.setItem(K1t,' + $matchBootstrap.Groups[3].Value + ')}catch{}'
    $js = $js.Substring(0, $matchBootstrap.Index) + $replacementBootstrap + $js.Substring($matchBootstrap.Index + $matchBootstrap.Length)
}

Set-Content -LiteralPath $index.FullName -Value $js -Encoding UTF8 -NoNewline

Write-Step "Applying hardcoded text patches..."
node (Join-Path $PatchedRoot "scripts\patch-filter-menu.js") $assets
node (Join-Path $PatchedRoot "scripts\patch-3p-descriptions.js") $assets
node (Join-Path $PatchedRoot "scripts\patch-context-panel.js") $assets

Write-Step "Cleaning config + caches..."
$config = Join-Path $env:APPDATA "Claude\config.json"
if (Test-Path -LiteralPath $config) {
    node -e "const fs=require('fs'); const p=process.argv[1]; const c=JSON.parse(fs.readFileSync(p,'utf8')); delete c.locale; fs.writeFileSync(p, JSON.stringify(c,null,2)+'\n', 'utf8');" $config
}

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

Write-Step "Launching official Claude..."
$exe = Join-Path $pkgRoot "app\Claude.exe"
Start-Process -FilePath $exe -WorkingDirectory (Split-Path $exe -Parent)

Write-Success "Done"
Write-Host "Backup: $backupRoot" -ForegroundColor Gray
