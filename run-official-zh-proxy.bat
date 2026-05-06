@echo off
cd /d "%~dp0"
if "%~1"=="" (
  powershell -NoProfile -ExecutionPolicy Bypass -File ".\scripts\Launch-Official-Proxy.ps1"
) else (
  powershell -NoProfile -ExecutionPolicy Bypass -File ".\scripts\Launch-Official-Proxy.ps1" -ProxyPort %1
)
