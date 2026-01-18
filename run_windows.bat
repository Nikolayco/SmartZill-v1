@echo off
setlocal
title Nikolayco SmartZill Baslatiliyor...

echo ===================================================
echo   NIKOLAYCO SMARTZILL - Windows Kurulum ve Baslatma
echo ===================================================

REM ---------------------------------------------------
REM 0. Calisma Dizinini Sabitle
REM Yonetici olarak calistirilinca System32'ye gitmemesi icin
REM ---------------------------------------------------
cd /d "%~dp0"
echo [BILGI] Calisma Dizini: %CD%

REM ---------------------------------------------------
REM 1. Yonetici Izni Kontrolu
REM ---------------------------------------------------
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo.
    echo [HATA] Yonetici izni yok.
    echo Lutfen sag tiklayip "Yonetici Olarak Calistir" secenegini kullanin.
    echo.
    pause
    exit /b
)

echo.
echo [1/5] Gerekli Yazilimlar Kontrol Ediliyor...

REM ---------------------------------------------------
REM 2. Python Kontrol
REM ---------------------------------------------------
python --version >nul 2>&1
if %errorLevel% EQU 0 goto :PYTHON_OK

echo [BILGI] Python bulunamadi. Winget ile yukleniyor...
winget install -e --id Python.Python.3.12 --scope machine --accept-source-agreements --accept-package-agreements
if %errorLevel% NEQ 0 goto :PYTHON_FAIL

echo [BILGI] Python yuklendi. PATH guncelleniyor...
set "PATH=%PATH%;C:\Program Files\Python312\;C:\Program Files\Python312\Scripts\"
goto :PYTHON_OK

:PYTHON_FAIL
echo.
echo [HATA] Python yuklenemedi.
echo Lutfen Python 3.12+ surumunu manuel indirip kurun.
echo Adres: https://www.python.org/downloads/
pause
exit /b

:PYTHON_OK
echo [OK] Python mevcut.

REM ---------------------------------------------------
REM 3. Node.js Kontrol
REM ---------------------------------------------------
node --version >nul 2>&1
if %errorLevel% EQU 0 goto :NODE_OK

echo [BILGI] Node.js bulunamadi. Winget ile yukleniyor...
winget install -e --id OpenJS.NodeJS --scope machine --accept-source-agreements --accept-package-agreements
if %errorLevel% NEQ 0 goto :NODE_FAIL
goto :NODE_OK

:NODE_FAIL
echo.
echo [HATA] Node.js yuklenemedi.
echo Lutfen Node.js LTS surumunu manuel indirip kurun.
echo Adres: https://nodejs.org/
pause
exit /b

:NODE_OK
echo [OK] Node.js mevcut.

REM ---------------------------------------------------
REM 4. VLC Player Kontrol
REM ---------------------------------------------------
if exist "C:\Program Files\VideoLAN\VLC\vlc.exe" goto :VLC_OK
if exist "C:\Program Files (x86)\VideoLAN\VLC\vlc.exe" goto :VLC_OK

echo [BILGI] VLC Media Player bulunamadi. Winget ile yukleniyor...
winget install -e --id VideoLAN.VLC --scope machine --accept-source-agreements --accept-package-agreements
REM VLC hatasi kritik degil, devam edebiliriz ama uyari verelim
if %errorLevel% NEQ 0 (
    echo [UYARI] VLC yuklenemedi. Ses ozellikleri calismayabilir.
)

:VLC_OK
echo [OK] VLC kontrolu tamamlandi.

REM ---------------------------------------------------
REM 5. Port Temizligi
REM ---------------------------------------------------
echo.
echo [2/5] Eski Portlar Temizleniyor...
REM Basit dongu
for %%p in (7777 5555 8000 3000) do (
    for /f "tokens=5" %%a in ('netstat -aon ^| findstr :%%p') do (
        echo Port %%p temizleniyor PID: %%a
        taskkill /F /PID %%a >nul 2>&1
    )
)

REM ---------------------------------------------------
REM 6. Backend Kurulum ve Baslatma
REM ---------------------------------------------------
echo.
echo [3/5] Backend Hazirlaniyor...
if not exist "backend" (
    echo [HATA] 'backend' klasoru bulunamadi!
    echo Lutfen %CD% klasorunde backend klasoru oldugundan emin olun.
    pause
    exit /b
)

cd backend
if exist "venv" goto :VENV_EXISTS
echo [BILGI] Sanal ortam (venv) olusturuluyor...
python -m venv venv
if %errorLevel% NEQ 0 (
    echo [HATA] venv olusturulamadi. Python kurulumunuzu kontrol edin.
    pause
    exit /b
)
:VENV_EXISTS

echo [BILGI] Kutuphaneler yukleniyor...
call venv\Scripts\activate.bat
if %errorLevel% NEQ 0 (
    echo [HATA] venv aktive edilemedi.
    pause
    exit /b
)

pip install -r requirements.txt
if %errorLevel% NEQ 0 (
    echo [HATA] Python paketleri yuklenirken hata olustu.
    pause
    exit /b
)

echo [BILGI] Backend sunucusu baslatiliyor...
start "Nikolayco SmartZill Backend" cmd /k "venv\Scripts\activate && uvicorn main:app --host 0.0.0.0 --port 7777 --reload"
cd ..

REM ---------------------------------------------------
REM 7. Frontend Kurulum ve Baslatma
REM ---------------------------------------------------
echo.
echo [4/5] Frontend Hazirlaniyor...
if not exist "frontend" (
    echo [HATA] 'frontend' klasoru bulunamadi!
    pause
    exit /b
)

cd frontend
if exist "node_modules" goto :NODE_MODULES_EXIST

echo [BILGI] Node modulleri yukleniyor (Internet hizina bagli surer)...
call npm install
if %errorLevel% NEQ 0 (
    echo [HATA] npm install komutu basarisiz oldu.
    pause
    exit /b
)
:NODE_MODULES_EXIST

echo [BILGI] Frontend sunucusu baslatiliyor...
start "Nikolayco SmartZill Frontend" cmd /k "npm run dev"
cd ..

REM ---------------------------------------------------
REM 8. Bitis
REM ---------------------------------------------------
echo.
echo [5/5] ISLEM TAMAMLANDI.
echo.
echo Tarayici acilmasi bekleniyor (10 saniye)...
timeout /t 10

start http://localhost:5555

echo.
echo ===================================================
echo  PROGRAM CALISIYOR
echo ===================================================
echo.
echo Bu pencereyi kapatabilirsiniz.
pause
