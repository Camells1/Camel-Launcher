# Spindel 4 robot 🕷️

A self-learning robot that plays **play.spindel4.com** against the game's
computer opponents, on your **iPhone** or your **PC**.

- Plays every mode: **1, 2 or 3 computers**, at **Easy, Medium, Hard or Expert**
- Can take turns through all modes, or climb from Easy to Expert
- **Learns from its mistakes** and remembers what it learned
- Hides ads

The robot is one file, `spindel4-robot.user.js`. It runs inside the game's
own web page, so the same robot works on the phone and on the PC.

---

## iPhone (Safari)

**One-time setup (about 3 minutes):**

1. Install the free app **"Userscripts"** (by Justin Wasack) from the App Store.
2. Open the **Userscripts** app once and tap **"Set Userscripts Directory"**.
   Pick or create a folder, for example *On My iPhone → Userscripts*.
3. Go to **Settings → Apps → Safari → Extensions → Userscripts**. Turn it
   **on** and set *All Websites* (or *play.spindel4.com*) to **Allow**.
4. In **Safari**, open this link:
   `https://raw.githubusercontent.com/Camells1/Camel-Launcher/claude/serene-cray-y4fb3b/spindel4-bot/spindel4-robot.user.js`
   Tap the **puzzle-piece / "AA" button** in the address bar, choose
   **Userscripts**, then tap **Install**.
   *(Alternative: save `spindel4-robot.user.js` into the Userscripts folder
   with the Files app.)*

**Playing:**

1. Open **play.spindel4.com** in Safari.
2. Tap the **🕷 Robot** button in the bottom-left corner.
3. Choose the number of computers and the level, then tap **Start robot**.

Keep Safari open with the screen on. iPhones pause web pages in the background.
Tip: *Settings → Display & Brightness → Auto-Lock → Never* while it plays.

**Fully blocking ads on iPhone:** the robot hides the game's ads, but iOS still
lets the page download the ad file. To stop that too, install a free Safari
content blocker such as **AdGuard** and turn it on under Settings → Apps →
Safari → Extensions.

---

## PC (Windows)

1. Install Python 3.9 or newer from https://www.python.org/downloads/ and
   tick **"Add Python to PATH"**.
2. Double-click **`install.bat`** (one time only).
3. Double-click **`start.bat`**. A browser opens and the robot plays. It takes
   turns between 1, 2 and 3 computers and climbs from Easy to Expert.

On the PC the ads are blocked completely, at the network level.

Other modes from a command window:

```
python bot.py --computers 1 --level Expert
python bot.py --computers 3 --level Hard
python bot.py --computers all --level all     every combination in turn
python bot.py --computers all --level climb   (default in start.bat)
python bot.py --think 3                       think longer per move
python bot.py --games 10                      stop after 10 games
python bot.py --headless                      no browser window
```

Mac/Linux: `pip3 install -r requirements.txt`, then
`python3 -m playwright install chromium`, then `./start.sh`.

You can also use the userscript in a normal desktop browser with the
**Tampermonkey** extension. Install it from the same link as on the iPhone.

---

## Control panel

| Setting    | Options                                                        |
|------------|----------------------------------------------------------------|
| Computers  | 1, 2, 3, or **All** (takes turns)                              |
| Level      | Easy, Medium, Hard, Expert, **Climb** (up after 3 wins in a row), **All** (takes turns) |
| Think time | 0.5 s to 5 s per move (longer = stronger)                      |

The panel shows wins / draws / losses for every mode. **Export brain** saves
what the robot has learned to a file. **Import** loads that file on another
device, for example to move the PC's learning to your iPhone.

## How it plays and learns

- It reads the web from the screen and looks several moves ahead. It always
  takes a win and blocks threats.
- With 2 or 3 computers you can't block someone right after their move, so it
  assumes all computers work together against it and plays safe.
- **Position memory:** it remembers every position it has played and whether
  that game was won or lost. It avoids moves that lost and repeats moves that won.
  Rotated or mirrored webs count as the same position.
- **Mistake review:** after a loss it re-checks its own last moves, thinking
  3× longer. Better moves it finds are saved and used next time.
- **Judgement tuning:** after every game it adjusts how it values things
  like open threes and threats.

Everything is stored in the browser (Safari on the phone, the robot's own
browser profile on the PC). **Forget all** in the panel resets it.

## Fair play

The robot only plays **against the computer**. On purpose, it has no
support for online games against real people.
