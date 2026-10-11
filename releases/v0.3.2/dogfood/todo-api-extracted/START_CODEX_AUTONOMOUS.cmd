@echo off
setlocal
REM -ExecutionPolicy Bypass applies to this PowerShell process only; it does not change the machine's execution policy.
powershell -ExecutionPolicy Bypass -File "%~dp0START_CODEX_AUTONOMOUS.ps1"
exit /b %ERRORLEVEL%