@echo off
setlocal EnableDelayedExpansion
title pyTOP Pro (Beta v2.1) - Sistem ve Surec Monitoru
color 0A
cd /d "%~dp0"

echo ========================================================
echo   [*] pyTOP Pro (Beta v2.1) - Windows Baslatici
echo ========================================================
echo.

set "PY_CMD="

:: 1. py launcher kontrol et
py -c "import sys" >nul 2>&1
if not errorlevel 1 (
    set "PY_CMD=py"
    goto :python_found
)

:: 2. python3.12 kontrol et
python3.12 -c "import sys" >nul 2>&1
if not errorlevel 1 (
    set "PY_CMD=python3.12"
    goto :python_found
)

:: 3. python kontrol et
python -c "import sys" >nul 2>&1
if not errorlevel 1 (
    set "PY_CMD=python"
    goto :python_found
)

:: 4. WindowsApps ozel yolu
if exist "%LOCALAPPDATA%\Microsoft\WindowsApps\python3.12.exe" (
    "%LOCALAPPDATA%\Microsoft\WindowsApps\python3.12.exe" -c "import sys" >nul 2>&1
    if not errorlevel 1 (
        set "PY_CMD=%LOCALAPPDATA%\Microsoft\WindowsApps\python3.12.exe"
        goto :python_found
    )
)

:no_python
echo [HATA] Sisteminizde calisan bir Python surumu bulunamadi!
echo Lutfen https://python.org adresinden Python 3.8+ yukleyin.
echo Kurulum ekraninda "Add Python to PATH" secenegini isaretleyin.
echo.
pause
exit /b 1

:python_found
echo [+] Python bulundu: !PY_CMD!

:: Gerekli kutuphaneleri kontrol et
!PY_CMD! -c "import flask, psutil" >nul 2>&1
if errorlevel 1 (
    echo [!] Gerekli kutuphaneler eksik, requirements.txt yukleniyor...
    !PY_CMD! -m pip install -r requirements.txt
    if errorlevel 1 (
        echo [HATA] Kutuphaneler yuklenemedi. Lutfen internet baglantinizi kontrol edin.
        pause
        exit /b 1
    )
)

echo [+] Sunucu baslatiliyor...
echo [i] Web arayuzu aciliyor: http://127.0.0.1:5000
echo.

:: Tarayiciyi 2 saniye sonra otomatik ac
start "" cmd /c "timeout /t 2 /nobreak >nul && start http://127.0.0.1:5000"

:: Flask uygulamasini calistir
!PY_CMD! app.py

if errorlevel 1 (
    echo.
    echo [!] pyTOP Pro kapandi veya bir hata olustu.
    pause
)
