@echo off
title "pyTOP Pro - Terminal Sistem ve Surec Monitoru"
color 0A
echo ========================================================
echo         pyTOP Pro Baslatiliyor...
echo ========================================================
echo.

set "PY_CMD="
python3.12 --version >nul 2>&1 && set "PY_CMD=python3.12"
if not defined PY_CMD (
    python --version >nul 2>&1 && set "PY_CMD=python"
)
if not defined PY_CMD (
    py --version >nul 2>&1 && set "PY_CMD=py"
)
if not defined PY_CMD (
    if exist "%LOCALAPPDATA%\Microsoft\WindowsApps\python3.12.exe" (
        set "PY_CMD=%LOCALAPPDATA%\Microsoft\WindowsApps\python3.12.exe"
    )
)

if not defined PY_CMD (
    echo [HATA] Python komutu bulunamadi!
    pause
    exit /b 1
)

echo [BILGI] Python bulundu: %PY_CMD%
echo [BILGI] Terminal ekrani aciliyor: http://127.0.0.1:5000
echo.

start "" cmd /c "timeout /t 2 /nobreak >nul && start http://127.0.0.1:5000"

"%PY_CMD%" app.py
pause
