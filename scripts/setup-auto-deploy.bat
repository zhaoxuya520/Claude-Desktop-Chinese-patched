@echo off
chcp 65001 >nul
title Claude Desktop 自动汉化安装

:: ===================================================
:: 一键安装——设置自动汉化，永久生效
::
:: 做了三件事：
::   1. 立即部署当前版本的汉化
::   2. 创建计划任务（用户登录时自动触发）
::   3. 以后 Claude 每次更新，计划任务自动重新部署
::
:: 只需运行这一次，后续无需任何操作。
:: ===================================================

echo.
echo ========================================
echo   Claude Desktop 自动汉化 — 一键安装
echo ========================================
echo.

:: 获取管理员权限
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo [*] 需要管理员权限，正在请求...
    powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -Verb RunAs -Wait"
    exit /b
)

set SCRIPTS_DIR=%~dp0
set PROJECT_DIR=%~dp0..

:: 自动检测 Node.js 路径（支持多个安装位置）
set NODE_EXE=
for /f "tokens=*" %%i in ('where node 2^>nul') do (
    if not defined NODE_EXE set "NODE_EXE=%%i"
)
if not defined NODE_EXE (
    if exist "C:\Program Files\nodejs\node.exe" set "NODE_EXE=C:\Program Files\nodejs\node.exe"
)
if not defined NODE_EXE (
    if exist "%ProgramFiles%\nodejs\node.exe" set "NODE_EXE=%ProgramFiles%\nodejs\node.exe"
)
if not defined NODE_EXE (
    if exist "%LOCALAPPDATA%\fnm\nodejs\node.exe" set "NODE_EXE=%LOCALAPPDATA%\fnm\nodejs\node.exe"
)

if not defined NODE_EXE (
    echo [-] 未找到 Node.js，请先安装 https://nodejs.org
    pause
    exit /b 1
)
echo [*] 使用 Node.js: %NODE_EXE%

:: Step 1: 立即部署当前版本
echo [*] 第一步：部署当前版本汉化...
"%NODE_EXE%" "%SCRIPTS_DIR%deploy-zh-cn.js"
if %errorlevel% neq 0 (
    echo [-] 部署失败，退出
    pause
    exit /b 1
)

:: Step 2: 创建计划任务
echo.
echo [*] 第二步：设置计划任务（登录时自动检测并部署）...
set TASK_NAME=ClaudeDesktop-AutoZhCN

:: 先删除旧任务（如果有）
schtasks /delete /tn "%TASK_NAME%" /f >nul 2>&1

:: 创建新任务：用户登录时触发，最高权限运行
schtasks /create /tn "%TASK_NAME%" ^
    /tr "\"%NODE_EXE%\" \"%SCRIPTS_DIR%ensure-zh-cn.js\"" ^
    /sc onlogon ^
    /rl highest ^
    /f

if %errorlevel% equ 0 (
    echo [+] 计划任务创建成功！
    echo     任务名: %TASK_NAME%
    echo     触发器: 用户登录时
    echo     操作:   "%NODE_EXE%" ensure-zh-cn.js

    :: 验证任务已创建
    schtasks /query /tn "%TASK_NAME%" /fo LIST /v >nul 2>&1
    if %errorlevel% equ 0 (
        echo [+] 任务验证通过
    ) else (
        echo [!] 任务已创建但验证失败（权限问题？）
    )
) else (
    echo [!] 计划任务创建失败，请手动检查权限
    schtasks /create /tn "%TASK_NAME%" /tr "'%NODE_EXE%' '%SCRIPTS_DIR%ensure-zh-cn.js'" /sc onlogon /rl highest /f
    pause
    exit /b 1
)

:: Step 3: 验证
echo.
echo [*] 第三步：验证...
"%NODE_EXE%" "%SCRIPTS_DIR%check-zh-cn.js"

echo.
echo ========================================
echo   安装完成！
echo ========================================
echo.
echo   Claude 更新后会自动重新汉化，无需任何操作。
echo   重启 Claude Desktop 即可体验。
echo.
echo   如需卸载自动任务：
echo     schtasks /delete /tn "%TASK_NAME%" /f
echo.
pause
