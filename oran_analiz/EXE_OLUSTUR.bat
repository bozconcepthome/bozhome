@echo off
cd /d "%~dp0"
if not exist .venv ( py -3 -m venv .venv && .venv\Scripts\python -m pip install -r requirements.txt )
.venv\Scripts\python -m pip install pyinstaller
.venv\Scripts\pyinstaller --noconfirm --windowed --name OranAnaliz app.py
echo EXE: dist\OranAnaliz\OranAnaliz.exe
pause
