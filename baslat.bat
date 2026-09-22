@echo off
title pyTOP Pro (Beta v2.1) - Terminal Sistem ve Surec Monitoru
color 0A
chcp 65001 >nul
cls
echo ========================================================
echo   🚀 pyTOP Pro (Beta v2.1) - Windows Baslatici
echo ========================================================
echo.

set "PY_CMD="
python --version >nul 2>&1 && set "PY_CMD=python"
if not defined PY_CMD (
    python3.12 --version >nul 2>&1 && set "PY_CMD=python3.12"
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
    echo [HATA] Sistemde Python bulunamadi!
    echo Lutfen python.org adresinden Python 3.8+ kurun.
    echo (Kurulum sirasinda "Add Python to PATH" secenegini isaretleyin).
    pause
    exit /b 1
)

echo [OK] Python bulundu: %PY_CMD%

:: Gerekli kutuphaneleri kontrol et
"%PY_CMD%" -c "import flask, psutil" >nul 2>&1
if %errorlevel% neq 0 (
    echo [BILGI] Gerekli kutuphaneler eksik, requirements.txt otomatik yukleniyor...
    "%PY_CMD%" -m pip install -r requirements.txt
)

echo [BILGI] Terminal ekrani aciliyor: http://127.0.0.1:5000
echo.

start "" cmd /c "timeout /t 2 /nobreak >nul && start http://127.0.0.1:5000"

"%PY_CMD%" app.py
pause
