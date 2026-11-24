@echo off
REM Windows baslatici
cd /d "%~dp0"
if not exist .venv python -m venv .venv
call .venv\Scripts\activate.bat
pip install -q -r requirements.txt
if not exist .env (copy .env.example .env & echo .env olusturuldu - ANTHROPIC_API_KEY yaz ve tekrar calistir. & pause & exit /b)
python server.py %*
pause
