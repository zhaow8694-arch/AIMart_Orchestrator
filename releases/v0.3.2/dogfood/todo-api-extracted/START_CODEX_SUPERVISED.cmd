@echo off
setlocal
powershell -ExecutionPolicy Bypass -File "%~dp0START_CODEX_SUPERVISED.ps1"
exit /b %ERRORLEVEL%