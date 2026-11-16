"""
Spindel 4 robot.

Opens play.spindel4.com in its own browser (with ads and trackers blocked),
starts a game against the computer, plays it, learns from the result and
starts the next game.

  python bot.py                       # play forever against "Hard"
  python bot.py --level Expert --games 20
  python bot.py --train 200           # practise against itself (no browser)
"""
import argparse
import os
import re
import sys
import time

from brain import Brain
from engine import Board, Engine, R, S
from vision import cell_xy, color_dist, read_colors

URL = "https://play.spindel4.com"
HERE = os.path.dirname(os.path.abspath(__file__))
PROFILE = os.path.join(HERE, "browser-profile")
BRAIN = os.path.join(HERE, "brain.json")

# Ad / tracker blocker: any request whose URL matches is dropped.
AD_HOSTS = re.compile(
    r"googlesyndication|doubleclick|googleadservices|adservice\.google|"
    r"googletagmanager|google-analytics|googletagservices|pagead|adnxs|"
    r"amazon-adsystem|taboola|outbrain|criteo|pubmatic|rubiconproject|"
    r"adsrvr|moatads|scorecardresearch|facebook\.net|hotjar|quantserve|"
    r"fundingchoicesmessages|ad\.doubleclick|adsafeprotected|2mdn"
)

DEBUG = os.environ.get("SPINDEL_DEBUG")

LEVELS = ["Easy", "Medium", "Hard", "Expert"]

JS_ENABLE_SEMANTICS = """
() => { const e = document.querySelector('flt-semantics-placeholder');
        if (e) { e.click(); return true } return false }"""

JS_TEXTS = """
() => Array.from(document.querySelectorAll('flt-semantics'))
  .map(e => (e.innerText || '').trim())
  .filter(t => t && !t.includes('\\n'))"""

JS_NODES = """
() => Array.from(document.querySelectorAll('flt-semantics')).map(e => {
  const r = e.getBoundingClientRect();
  return {role: e.getAttribute('role') || '',
          label: (e.getAttribute('aria-label') || (e.children.length ? '' : e.textContent) || '').trim(),
          x: r.x, y: r.y, w: r.width, h: r.height};
})"""


def log(*a):
    print(time.strftime("%H:%M:%S"), *a, flush=True)


class Site:
    def __init__(self, headless=False):
        from playwright.sync_api import sync_playwright
        self.pw = sync_playwright().start()
        opts = dict(headless=headless, viewport={"width": 1000, "height": 800}, locale="en-US",
                    device_scale_factor=1)
        exe = os.environ.get("SPINDEL_CHROME")
        if exe:
            opts["executable_path"] = exe
        self.ctx = self.pw.chromium.launch_persistent_context(PROFILE, **opts)
        self.blocked = 0
        self.ctx.route("**/*", self._route)
        self.page = self.ctx.pages[0] if self.ctx.pages else self.ctx.new_page()

    def _route(self, route):
        if AD_HOSTS.search(route.request.url):
            self.blocked += 1
            route.abort()
        else:
            route.continue_()

    def close(self):
        try:
            self.ctx.close()
        finally:
            self.pw.stop()

    def open(self):
        log("opening", URL, "(ad blocker on)")
        self.page.goto(URL, wait_until="domcontentloaded", timeout=90000)
        self.wait_nodes(lambda n: True, 60)

    # ---- flutter accessibility tree -------------------------------------
    def nodes(self):
        try:
            self.page.evaluate(JS_ENABLE_SEMANTICS)
            return self.page.evaluate(JS_NODES)
        except Exception:
            return []

    def buttons(self):
        return [n for n in self.nodes() if n["role"] in ("button", "menuitem") and n["label"]]

    def texts(self):
        try:
            return self.page.evaluate(JS_TEXTS)
        except Exception:
            return []

    def my_turn(self):
        return any(t.lower().startswith("your move") for t in self.texts())

    def result(self):
        """'win' / 'loss' / 'draw' when the game is over, else None."""
        texts = self.texts()
        for t in texts:
            low = t.lower()
            if re.search(r"\b(wins|won)\b", low):
                return "win" if "(you)" in low else "loss"
            if re.search(r"\b(draw|tie)\b", low):
                return "draw"
        if self.find_button("Play again"):
            return "unknown"
        return None

    def find_button(self, *labels):
        want = [l.lower() for l in labels]
        for n in self.buttons():
            lab = n["label"].lower()
            if any(lab == w or lab.startswith(w) for w in want):
                return n
        return None

    def click_node(self, n):
        self.page.mouse.click(n["x"] + n["w"] / 2, n["y"] + n["h"] / 2)

    def click_button(self, *labels, timeout=10):
        end = time.time() + timeout
        while time.time() < end:
            n = self.find_button(*labels)
            if n:
                self.click_node(n)
                time.sleep(0.8)
                return True
            time.sleep(0.4)
        return False

    def wait_nodes(self, cond, timeout):
        end = time.time() + timeout
        while time.time() < end:
            ns = self.nodes()
            if ns and cond(ns):
                return ns
            time.sleep(0.5)
        return None

    def board_box(self):
        best = None
        for n in self.nodes():
            w, h = n["w"], n["h"]
            if w >= 250 and abs(w - h) < 3 and not (n["x"] == 0 and n["y"] == 0):
                if best is None or w > best[2]:
                    best = (n["x"], n["y"], w, h)
        return best

    # ---- board ---------------------------------------------------------
    def read(self):
        """Returns (box, colours) or (None, None)."""
        box = self.board_box()
        if not box:
            return None, None
        self.page.mouse.move(995, 795)  # no hover highlight
        time.sleep(0.15)
        png = self.page.screenshot()
        self.last_png = png
        return box, read_colors(png, box)

    def stable_read(self, tries=8):
        prev = None
        for _ in range(tries):
            box, cols = self.read()
            if cols is not None:
                sig = [[c is not None for c in col] for col in cols]
                if prev is not None and sig == prev[0] and box == prev[1]:
                    return box, cols
                prev = (sig, box)
            time.sleep(0.35)
        return self.read()

    def click_cell(self, box, s, r):
        x, y = cell_xy(box, s, r)
        self.page.mouse.move(x, y)
        time.sleep(0.25)
        self.page.mouse.click(x, y)

    # ---- menus ---------------------------------------------------------
    def dismiss_popups(self):
        for lab in ("Continue anonymously", "Got it, continue!", "Accept", "OK", "Close"):
            for _ in range(5):  # dialogs animate in, so a click can be missed
                n = self.find_button(lab)
                if not n:
                    break
                log("closing popup:", n["label"])
                self.click_node(n)
                time.sleep(1.2)

    def start_game(self, level):
        """From anywhere: get to a fresh game against one computer."""
        for attempt in range(6):
            self.dismiss_popups()
            if self.find_button("Play again"):
                self.click_button("Play again")
                return True
            if self.find_button("Against the computer"):
                self.click_button("Against the computer")
                time.sleep(1)
                if self.find_button("1 computer"):
                    self.click_button("1 computer")
                if self.click_button(level, timeout=6):
                    return True
            if self.find_button("1 computer"):
                self.click_button("1 computer")
                if self.click_button(level, timeout=6):
                    return True
            if self.find_button(level):
                self.click_button(level)
                return True
            if self.tutorial():
                continue
            back = self.find_button("Back")
            if back:
                self.click_node(back)
                time.sleep(1.5)
                continue
            time.sleep(2)
        return False

    def in_tutorial(self):
        labels = [n["label"] for n in self.buttons()]
        return labels == ["Back"] and self.board_box() is None

    def tutorial(self):
        """The site shows a 2-step 'how to make a move' tutorial the first
        time a browser profile plays. Positions are for the 1000x800 window."""
        if not self.in_tutorial():
            return False
        log("first-time tutorial detected - doing it automatically")
        from PIL import Image
        import io
        m = self.page.mouse

        def step1_done():
            # the "1 Point" bubble turns from red to green when step 1 is done
            img = Image.open(io.BytesIO(self.page.screenshot())).convert("RGB")
            r, g, b = img.getpixel((419, 114))
            return g > r

        end = time.time() + 90
        while time.time() < end and not step1_done():
            m.move(560, 315); time.sleep(0.8); m.click(563, 312); time.sleep(2.0)
        end = time.time() + 90
        while time.time() < end and not self.find_button("Got it"):
            m.move(500, 318); time.sleep(0.5); m.move(640, 400); time.sleep(0.4)
            m.move(663, 482); time.sleep(0.8); m.click(663, 482)
            for _ in range(6):
                time.sleep(0.5)
                if self.find_button("Got it"):
                    break
        if not self.click_button("Got it", timeout=20):
            log("could not finish the tutorial automatically - please click through it "
                "yourself in the browser window (run without --headless)")
            self.wait_nodes(lambda ns: any(n["label"] in ("Got it, continue!", "1 computer",
                                                          "Against the computer") for n in ns), 300)
            self.dismiss_popups()
        return True


# ------------------------------------------------------------------ playing
class Game:
    def __init__(self, site, engine, brain, think):
        self.site, self.engine, self.brain, self.think = site, engine, brain, think

    def play(self):
        site = self.site
        palette = {}          # player number -> colour (0 = whoever moved first)
        me = None             # 0 if the bot moved first
        moves = []            # slices in play order
        known = [[None] * R for _ in range(S)]
        last_change = time.time()

        def classify(c):
            if not palette:
                p = 0 if me in (None, 1) else 1
                palette[p] = c
                return p
            d = {p: color_dist(c, col) for p, col in palette.items()}
            if len(palette) == 1:
                (p, dist), = d.items()
                if dist > 90:
                    palette[p ^ 1] = c
                    return p ^ 1
                return p
            return min(d, key=d.get)

        def sync(cols):
            new = sorted((r, s, cols[s][r]) for s in range(S) for r in range(R)
                         if cols[s][r] is not None and known[s][r] is None)
            for r, s, c in new:
                known[s][r] = classify(c)
                moves.append(s)
            return len(new)

        result = None
        while result is None:
            result = site.result()
            if result:
                break
            if not site.my_turn():
                if time.time() - last_change > 120:
                    raise RuntimeError("nothing happened for 2 minutes")
                time.sleep(0.3)
                continue
            box, cols = site.stable_read()
            if cols is None:
                time.sleep(0.5)
                continue
            if not site.my_turn():
                continue
            sync(cols)
            last_change = time.time()
            b = Board.from_cells(known)
            if me is None:
                me = b.count & 1  # it is our turn: even count means we started
            if b.turn != me:
                # board and turn disagree (e.g. a piece still animating): look again
                time.sleep(0.5)
                continue
            if DEBUG:
                self._dump(site, box, moves, known)

            scores, depth = self.engine.analyse(b, self.think)
            s, why = self.brain.choose(b, scores)
            log("  move %2d: slice %2d  (depth %d, score %+d, %s)"
                % (b.count + 1, s, depth, scores[s], why))
            r = b.h[s]
            for attempt in range(3):
                site.click_cell(box, s, r)
                placed = False
                for _ in range(24):
                    time.sleep(0.25)
                    if site.result():
                        placed = True   # our move ended the game
                        break
                    box2, cols2 = site.read()
                    if cols2 and cols2[s][r] is not None:
                        placed = True
                        if me not in palette:
                            palette[me] = cols2[s][r]
                        break
                if placed:
                    known[s][r] = me
                    moves.append(s)
                    break
                log("  click did not register, retrying")
                box = site.board_box() or box
            time.sleep(0.3)

        if me is None:
            me = 0
        if result == "unknown":
            w = Board.from_cells(known).winner()
            result = "draw" if w is None else ("win" if w == me else "loss")
        return moves, me, result

    def _dump(self, site, box, moves, known):
        n = len(moves)
        with open(os.path.join(DEBUG, "m%02d.png" % n), "wb") as f:
            f.write(site.last_png)
        with open(os.path.join(DEBUG, "m%02d.txt" % n), "w") as f:
            f.write("box %s\nmoves %s\n" % (box, moves))
            for r in reversed(range(R)):
                f.write(" ".join(".XO"[0 if known[s][r] is None else 1 + known[s][r]]
                                 for s in range(S)) + "\n")


# ----------------------------------------------------------------- training
def self_play(brain, n, think=0.15):
    """Bot vs bot practice to tune its evaluation (no website needed)."""
    log("self-play training: %d games" % n)
    for g in range(n):
        b = Board()
        moves = []
        engines = [Engine(brain.weights), Engine(brain.weights)]
        while b.winner() is None and not b.full():
            scores, _ = engines[b.turn].analyse(b, think)
            s, _ = brain.choose(b, scores, explore=0.12 if b.count < 10 else 0.03)
            b.play(s)
            moves.append(s)
        w = b.winner()
        res0 = "draw" if w is None else ("win" if w == 0 else "loss")
        res1 = {"win": "loss", "loss": "win", "draw": "draw"}[res0]
        brain.record(moves, 0, res0, "self-play")
        brain._tune(moves, 1, res1)
        if (g + 1) % 10 == 0:
            brain.save()
            log("  %d games done, weights %s" % (g + 1, [round(x, 3) for x in brain.weights]))
    brain.save()


def main():
    ap = argparse.ArgumentParser(description="Self-learning Spindel 4 robot")
    ap.add_argument("--level", default="Hard", choices=LEVELS)
    ap.add_argument("--games", type=int, default=0, help="number of games (0 = forever)")
    ap.add_argument("--think", type=float, default=2.0, help="seconds to think per move")
    ap.add_argument("--climb", action="store_true",
                    help="move up a level after 3 wins in a row")
    ap.add_argument("--headless", action="store_true", help="hide the browser window")
    ap.add_argument("--train", type=int, default=0, help="self-play practice games, then exit")
    args = ap.parse_args()

    brain = Brain(BRAIN)
    log("brain loaded: %d games played so far" % brain.games)
    if args.train:
        self_play(brain, args.train)
        return

    site = Site(headless=args.headless)
    level = args.level
    streak = 0
    played = 0
    try:
        site.open()
        while not args.games or played < args.games:
            if not site.start_game(level):
                log("could not start a game, reloading the page")
                site.open()
                continue
            log("game %d against the computer (%s)" % (brain.games + 1, level))
            engine = Engine(brain.weights)
            try:
                moves, me, result = Game(site, engine, brain, args.think).play()
            except RuntimeError as e:
                log("game aborted:", e)
                site.open()
                continue
            played += 1
            brain.record(moves, me, result, level)
            st = brain.stats[level]
            log("RESULT: %s  (%s record: %d won, %d draw, %d lost)  ads blocked: %d"
                % (result.upper(), level, st[0], st[1], st[2], site.blocked))
            if result == "loss":
                log("  reviewing the lost game to learn from mistakes...")
                n = brain.review(moves, me, Engine(brain.weights), seconds=args.think * 3, log=log)
                log("  learned %d fix(es)" % n)
            brain.save()
            streak = streak + 1 if result == "win" else 0
            if args.climb and streak >= 3 and LEVELS.index(level) < len(LEVELS) - 1:
                level = LEVELS[LEVELS.index(level) + 1]
                streak = 0
                log("3 wins in a row - moving up to", level)
                site.click_button("Back")
                time.sleep(1.5)
    except KeyboardInterrupt:
        log("stopped")
    finally:
        brain.save()
        site.close()


if __name__ == "__main__":
    main()
