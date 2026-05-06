@echo off
chcp 65001 >nul
echo ========================================
echo   Claude Desktop 汉化安装向导
echo   (需要管理员权限)
echo ========================================
echo.
echo  [!] 法律声明 / Legal Notice
echo  本软件并非 Anthropic 官方产品。
echo  "Claude" 是 Anthropic 的注册商标。
echo  本软件仅修改界面语言，不修改核心功能、
echo  不绕过付费限制、不收集用户数据。
echo  使用即表示您已阅读并同意相关条款。
echo ========================================
echo.
echo 选项:
echo   1. 直接安装 (InPlace) - 修改原安装目录
echo   2. 创建独立副本 - 在 %LOCALAPPDATA% 创建中文版
echo   3. 预览模式 (DryRun) - 查看将修改的内容
echo   4. 提取字符串 - 扫描可翻译的字符串
echo   5. 退出
echo.

set /p choice=请选择 (1-5):

if "%choice%"=="1" goto inplace
if "%choice%"=="2" goto standalone
if "%choice%"=="3" goto dryrun
if "%choice%"=="4" goto extract
if "%choice%"=="5" goto end

:checkadmin
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo [!] 需要管理员权限，正在请求...
    powershell -NoProfile -Command "Start-Process '%~f0' -Verb RunAs; exit"
    pause
    exit /b
)
goto donechoice

:inplace
echo.
echo [*] 正在以 InPlace 模式安装...
powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process -FilePath '%~dp0Install-Chinese.ps1' -Verb RunAs -Wait -ArgumentList '-InPlace'"
goto end

:standalone
echo.
echo [*] 正在创建独立副本...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0Install-Chinese.ps1"
goto end

:dryrun
echo.
echo [*] 预览模式...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0Install-Chinese.ps1" -DryRun
pause
goto end

:extract
echo.
echo [*] 提取字符串...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0Install-Chinese.ps1" -ExtractOnly -ShowAll
pause
goto end

:donechoice
if "%choice%"=="1" goto inplace
if "%choice%"=="2" goto standalone
goto end

:end
echo.
echo ========================================
echo   完成
echo ========================================
pause
