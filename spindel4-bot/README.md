# Spindel 4 robot 🕷️

A self-learning robot that opens **play.spindel4.com** on your PC, plays
against the game's computer opponent and gets better after every game.

- Opens its own browser window with an **ad and tracker blocker** built in
- Plays automatically: reads the web from the screen and clicks its moves
- **Learns from its mistakes** and remembers everything in `brain.json`

## Install (Windows)

1. Install Python 3.9 or newer from https://www.python.org/downloads/ and
   tick **"Add Python to PATH"** during setup.
2. Double-click **`install.bat`** (one time only).
3. Double-click **`start.bat`**. A browser opens and the robot starts playing.

Mac/Linux: `pip3 install -r requirements.txt`, then
`python3 -m playwright install chromium`, then `./start.sh`.

The first time, the site shows a short "how to make a move" tutorial. The
robot clicks through it by itself. If that ever fails, click through it once
yourself in the robot's browser window.

Stop the robot with **Ctrl+C** in the black window, or close it. What it has
learned is saved after every game.

## Options

```
python bot.py                         play forever against "Hard"
python bot.py --level Expert          Easy / Medium / Hard / Expert
python bot.py --level Easy --climb    go up a level after 3 wins in a row
python bot.py --games 10              stop after 10 games
python bot.py --think 4               think longer per move (stronger, slower)
python bot.py --headless              hide the browser window
python bot.py --train 200             practise 200 games against itself (no browser)
```

## How it learns

| What                 | How                                                                                       |
|----------------------|-------------------------------------------------------------------------------------------|
| Position memory      | Remembers every position it played and whether that game was won or lost. It avoids moves that lost before and repeats moves that won. Rotated or mirrored versions of a web count as the same position. |
| Mistake review       | After a loss it goes back over its own moves and thinks about each one 3× longer. Where it finds a better move it stores a "fix" and uses it next time. |
| Position judgement   | The weights it uses to judge a position (open threes, threats, and so on) are nudged after every game toward what actually predicted the result. |
| Practice             | `--train` lets it play itself to tune those weights without the website.                  |

Its search looks several moves ahead (alpha-beta search), always takes a win
when one is there, and always blocks yours.

Delete `brain.json` to make it forget everything. Delete `browser-profile`
to reset the robot's browser.

## Files

- `bot.py`: the browser part (opens the site, blocks ads, menus, playing)
- `engine.py`: the game rules and look-ahead search
- `brain.py`: memory and learning
- `vision.py`: reads the web from a screenshot

## Fair play

The robot only plays **against the computer**. On purpose, it has no
support for online games against real people, and it plays anonymously so it
doesn't show up on the leaderboard.
