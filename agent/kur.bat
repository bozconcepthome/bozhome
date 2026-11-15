@echo off
chcp 65001 >nul
setlocal EnableDelayedExpansion
title Boz Agent - Kurulum
cd /d "%~dp0"

echo.
echo  ==============================================
echo     BOZ AGENT KURULUMU  (ChatGPT / Codex)
echo  ==============================================
echo.

REM ---------- 1) Python ----------
set "PY="
where py >nul 2>&1 && set "PY=py -3"
if not defined PY ( where python >nul 2>&1 && set "PY=python" )
if not defined PY (
  echo [1/5] Python bulunamadi, winget ile kuruluyor...
  winget install -e --id Python.Python.3.12 --accept-source-agreements --accept-package-agreements
  echo.
  echo  Python kuruldu. Lutfen bu pencereyi KAPATIP kur.bat'i TEKRAR calistir.
  pause & exit /b
)
echo [1/5] Python bulundu.

REM ---------- 2) Node.js ----------
where node >nul 2>&1
if errorlevel 1 (
  echo [2/5] Node.js bulunamadi, winget ile kuruluyor...
  winget install -e --id OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements
  echo.
  echo  Node.js kuruldu. Lutfen bu pencereyi KAPATIP kur.bat'i TEKRAR calistir.
  pause & exit /b
)
echo [2/5] Node.js bulundu.

REM ---------- 3) Python paketleri ----------
echo [3/5] Python paketleri kuruluyor (1-2 dakika surebilir)...
if not exist ".venv\Scripts\python.exe" ( %PY% -m venv .venv || goto :hata )
".venv\Scripts\python.exe" -m pip install --upgrade pip >nul
".venv\Scripts\python.exe" -m pip install -r requirements.txt || goto :hata

REM ---------- 4) Codex CLI ----------
echo [4/5] OpenAI Codex CLI kuruluyor...
call npm install -g @openai/codex || goto :hata

REM ---------- 5) Masaustu kisayolu ----------
echo [5/5] Masaustune "Boz Agent" kisayolu ekleniyor...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$s=(New-Object -ComObject WScript.Shell).CreateShortcut([Environment]::GetFolderPath('Desktop')+'\Boz Agent.lnk');" ^
  "$s.TargetPath='%~dp0.venv\Scripts\pythonw.exe';" ^
  "$s.Arguments='\"%~dp0app.py\"';" ^
  "$s.WorkingDirectory='%~dp0';" ^
  "$s.IconLocation='%SystemRoot%\System32\imageres.dll,109';" ^
  "$s.Save()"

echo.
echo  ----------------------------------------------
echo   ChatGPT hesabinla giris yapiliyor...
echo   Tarayicida acilan sayfada "Sign in with ChatGPT" sec.
echo  ----------------------------------------------
call codex login status >nul 2>&1
if errorlevel 1 ( call codex login )

echo.
echo  ==============================================
echo    KURULUM TAMAM!  Masaustundeki "Boz Agent"
echo    simgesine cift tikla ya da baslat.bat'i ac.
echo  ==============================================
pause
exit /b

:hata
echo.
echo  !! Bir hata olustu. Yukaridaki mesaji kontrol et.
pause
exit /b 1
