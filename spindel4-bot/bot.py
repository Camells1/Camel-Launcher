"""
Spindel 4 robot - PC launcher.

Opens play.spindel4.com in its own browser with ads/trackers blocked and
loads spindel4-robot.user.js into the page. The userscript does all the
playing and learning (the same script runs on iPhone, see README).

  python bot.py                                  # 1 computer, climb Easy -> Expert
  python bot.py --computers 3 --level Expert
  python bot.py --computers all --level all      # take turns through every mode
"""
import argparse
import json
import os
import re
import time

URL = "https://play.spindel4.com"
HERE = os.path.dirname(os.path.abspath(__file__))
PROFILE = os.path.join(HERE, "browser-profile")
SCRIPT = os.path.join(HERE, "spindel4-robot.user.js")

AD_HOSTS = re.compile(
    r"googlesyndication|doubleclick|googleadservices|adservice\.google|"
    r"googletagmanager|google-analytics|googletagservices|pagead|adnxs|"
    r"amazon-adsystem|taboola|outbrain|criteo|pubmatic|rubiconproject|"
    r"adsrvr|moatads|scorecardresearch|facebook\.net|hotjar|quantserve|"
    r"fundingchoicesmessages|adsafeprotected|2mdn"
)


def log(*a):
    print(time.strftime("%H:%M:%S"), *a, flush=True)


def main():
    ap = argparse.ArgumentParser(description="Self-learning Spindel 4 robot")
    ap.add_argument("--computers", default="1", choices=["1", "2", "3", "all"],
                    help="how many computer opponents (all = take turns)")
    ap.add_argument("--level", default="climb",
                    choices=["climb", "Easy", "Medium", "Hard", "Expert", "Impossible", "all"],
                    help="difficulty (climb = move up after 3 wins, all = take turns)")
    ap.add_argument("--think", type=float, default=3, help="seconds to think per move")
    ap.add_argument("--games", type=int, default=0, help="stop after this many games (0 = never)")
    ap.add_argument("--headless", action="store_true",
                    help="no browser window: keeps playing while you use the PC for other things")
    ap.add_argument("--tabs", type=int, default=1,
                    help="games at the same time, 1-10 (they share one memory)")
    ap.add_argument("--english", action="store_true", help="English instead of Dutch")
    args = ap.parse_args()

    from playwright.sync_api import sync_playwright

    config = {
        "autostart": True,
        "computers": "rotate" if args.computers == "all" else args.computers,
        "level": "rotate" if args.level == "all" else args.level,
        "think": args.think,
        "games": args.games,
        "lang": "en" if args.english else "nl",
        # share the CPU cores fairly between the tabs
        "threads": max(1, (os.cpu_count() or 4) // max(1, min(10, args.tabs))),
    }
    tabs = max(1, min(10, args.tabs))
    done = set()
    # running total over all tabs, split by who started (first robot move odd = robot started)
    tally = {"first": [0, 0, 0], "second": [0, 0, 0]}   # won, draw, lost
    first_move = {}

    def result_line():
        f, sc = tally["first"], tally["second"]
        n = sum(f) + sum(sc)
        won = f[0] + sc[0]
        pct = lambda a: ("%.1f%%" % (100.0 * a[0] / sum(a))) if sum(a) else "-"
        if args.english:
            return "TOTAL: %d/%d won (%s) | robot started: %d/%d (%s) | computer started: %d/%d (%s)" % (
                won, n, pct([won, 0, n - won]), f[0], sum(f), pct(f), sc[0], sum(sc), pct(sc))
        return "TOTAAL: %d/%d gewonnen (%s) | robot begon: %d/%d (%s) | computer begon: %d/%d (%s)" % (
            won, n, pct([won, 0, n - won]), f[0], sum(f), pct(f), sc[0], sum(sc), pct(sc))

    def on_console(n):
        def handler(msg):
            t = msg.text
            if t.startswith("[S4R]"):
                body = t[6:]
                log(("[tab %d] " % n if tabs > 1 else "") + body)
                m = re.match(r"(?:zet|move) (\d+):", body)
                if m and first_move.get(n) is None:
                    first_move[n] = int(m.group(1))
                if body.startswith(("UITSLAG", "RESULT")):
                    key = "first" if (first_move.get(n) or 1) % 2 == 1 else "second"
                    up = body.upper()
                    slot = 0 if ("GEWONNEN" in up or "WIN" in up.split("(")[0]) else (1 if ("GELIJK" in up.split("(")[0] or "DRAW" in up.split("(")[0]) else 2)
                    tally[key][slot] += 1
                    first_move[n] = None
                    log(result_line())
                    try:
                        with open(os.path.join(HERE, "resultaten.txt"), "w") as fh:
                            fh.write(result_line() + "\n")
                    except OSError:
                        pass
                if t.strip() == "[S4R] DONE":
                    done.add(n)
        return handler

    with sync_playwright() as pw:
        common = dict(viewport={"width": 1000, "height": 800}, device_scale_factor=1,
                      locale="en-US" if args.english else "nl-NL")
        launch = dict(headless=args.headless,
                      # keep playing when the window is behind other windows
                      args=["--disable-background-timer-throttling",
                            "--disable-renderer-backgrounding",
                            "--disable-backgrounding-occluded-windows"])
        exe = os.environ.get("SPINDEL_CHROME")
        if exe:
            launch["executable_path"] = exe
        blocked = [0]

        def route(r):
            if AD_HOSTS.search(r.request.url):
                blocked[0] += 1
                r.abort()
            else:
                r.continue_()

        def prepare(ctx):
            ctx.route("**/*", route)
            ctx.add_init_script("window.__S4R_CONFIG = %s;" % json.dumps(config))
            ctx.add_init_script(path=SCRIPT)

        # The game only allows one open tab per browser session ("Spindel 4 is
        # al open"), so with several tabs every tab gets its own session, like
        # a separate device. Each tab's memory is kept in state/tab-N.json.
        browser, contexts, pages = None, [], []
        state_dir = os.path.join(HERE, "state")
        if tabs == 1:
            ctx = pw.chromium.launch_persistent_context(PROFILE, **launch, **common)
            prepare(ctx)
            contexts.append((ctx, None))
        else:
            os.makedirs(state_dir, exist_ok=True)
            browser = pw.chromium.launch(**launch)
            for n in range(1, tabs + 1):
                path = os.path.join(state_dir, "tab-%d.json" % n)
                ctx = browser.new_context(storage_state=path if os.path.exists(path) else None, **common)
                prepare(ctx)
                contexts.append((ctx, path))

        def save_states():
            for ctx, path in contexts:
                if path:
                    try:
                        ctx.storage_state(path=path)
                    except Exception:
                        pass

        for n, (ctx, _) in enumerate(contexts, 1):
            page = ctx.pages[0] if ctx.pages else ctx.new_page()
            handler = on_console(n)

            def on_msg(msg, handler=handler):
                handler(msg)
                if "UITSLAG" in msg.text or "RESULT" in msg.text:
                    save_states()   # keep what every tab learned so far
            page.on("console", on_msg)
            log(("openen:" if not args.english else "opening"), URL,
                ("(tab %d van %d)" % (n, tabs) if not args.english else "(tab %d of %d)" % (n, tabs)) if tabs > 1 else "",
                "(advertenties geblokkeerd)" if not args.english else "(ad blocker on)")
            page.goto(URL, wait_until="domcontentloaded", timeout=90000)
            pages.append(page)
            if n < tabs:
                pages[0].wait_for_timeout(4000)  # don't start every tab at once
        try:
            while len(done) < tabs and not all(p.is_closed() for p in pages):
                pages[0].wait_for_timeout(1000)
        except KeyboardInterrupt:
            pass
        except Exception as e:  # browser window closed
            log("browser closed:", e.__class__.__name__)
        save_states()
        log(("gestopt (geblokkeerde advertenties: %d)" if not args.english else "stopped (ads blocked: %d)") % blocked[0])
        for ctx, _ in contexts:
            try:
                ctx.close()
            except Exception:
                pass
        if browser:
            try:
                browser.close()
            except Exception:
                pass

if __name__ == "__main__":
    main()
