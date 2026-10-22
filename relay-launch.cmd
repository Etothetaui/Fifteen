@echo off
setlocal
cd /d "%~dp0"
set "RELAY_PYTHON=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe"
if exist "%RELAY_PYTHON%" (
    "%RELAY_PYTHON%" relay_server.py --open
) else (
    python relay_server.py --open
)
pause
