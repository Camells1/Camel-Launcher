#!/bin/sh
# Mac / Linux: first time run   pip3 install -r requirements.txt && python3 -m playwright install chromium
cd "$(dirname "$0")"
exec python3 bot.py --computers all --level climb "$@"
