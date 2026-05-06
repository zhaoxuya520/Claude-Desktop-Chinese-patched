@echo off
chcp 65001 >nul
title Claude Desktop 汉化部署
echo ========================================
echo   Claude Desktop 汉化部署
echo ========================================
echo.

:: 检查管理员权限，自动提权
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo [*] 需要管理员权限，正在请求...
    powershell -NoProfile -Command "Start-Process -FilePath 'node' -ArgumentList '%~dp0deploy-zh-cn.js' -Verb RunAs -Wait"
    echo.
    pause
    exit /b
)

:: 已提权，执行部署
node "%~dp0deploy-zh-cn.js"
if %errorlevel% neq 0 (
    echo.
    echo [-]
    pause
    exit /b
)

echo.
pause
