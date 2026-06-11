@echo off
setlocal
powershell -ExecutionPolicy Bypass -File "%~dp0START_CODEX_AUTONOMOUS.ps1"
exit /b %ERRORLEVEL%