@echo off
cd /d "%~dp0"
rem Practice games against itself (no browser). Makes the robot smarter offline.
python bot.py --train 200
pause
