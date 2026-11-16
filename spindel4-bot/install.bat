@echo off
cd /d "%~dp0"
echo Installing the Spindel 4 robot (needs Python 3.9+ from python.org)...
python -m pip install -r requirements.txt
python -m playwright install chromium
echo.
echo Done! Double-click start.bat to let the robot play.
pause
