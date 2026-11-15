@echo off
cd /d "%~dp0"
if not exist ".venv\Scripts\pythonw.exe" (
  echo Once kur.bat dosyasini calistirmalisin.
  pause
  exit /b
)
start "" ".venv\Scripts\pythonw.exe" "%~dp0app.py"
