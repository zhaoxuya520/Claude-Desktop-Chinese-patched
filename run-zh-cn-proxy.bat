@echo off
setlocal
cd /d "%~dp0"
if not exist node_modules (
  echo Installing proxy dependency...
  call npm install
)
start "" node scripts\launch-claude-zh-proxy.js
