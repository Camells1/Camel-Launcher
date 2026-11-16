@echo off
cd /d "%~dp0"
rem Plays 1, 2 and 3 computers in turn and climbs from Easy to Expert.
rem Change the line below for other modes, e.g.:  python bot.py --computers 3 --level Expert
python bot.py --computers all --level climb
pause
