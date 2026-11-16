@echo off
cd /d "%~dp0"
rem Starts at Easy and moves up a level after 3 wins in a row.
python bot.py --level Easy --climb
pause
