# Claude Code Desktop locale setter
$configPath = "C:\Users\朱佳辉\AppData\Local\Claude-3p\config.json"

Write-Host "Checking config..."
if (-not (Test-Path $configPath)) {
    Write-Host "Config not found"
    exit 1
}

$content = Get-Content $configPath -Raw
$newContent = $content -replace '"locale":\s*"[^"]*"', '"locale": "zh-CN"'

Set-Content -Path $configPath -Value $newContent -Encoding UTF8

$verify = Get-Content $configPath -Raw | ConvertFrom-Json
if ($verify.locale -eq "zh-CN") {
    Write-Host "Success: locale = zh-CN" -ForegroundColor Green
} else {
    Write-Host "Failed" -ForegroundColor Red
}
