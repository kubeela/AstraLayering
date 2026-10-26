@echo off
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo 请先安装 Node.js 24.12 或更新版本，再重新双击。
  start "" "https://nodejs.org/en/download"
  pause
  exit /b 1
)
node scripts\start-workbench.mjs
if errorlevel 1 (
  pause
  exit /b 1
)
