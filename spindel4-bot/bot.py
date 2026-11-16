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
    }
    tabs = max(1, min(10, args.tabs))
    done = set()

    def on_console(n):
        def handler(msg):
            t = msg.text
            if t.startswith("[S4R]"):
                log(("[tab %d] " % n if tabs > 1 else "") + t[6:])
                if t.strip() == "[S4R] DONE":
                    done.add(n)
        return handler

    with sync_playwright() as pw:
        opts = dict(headless=args.headless, viewport={"width": 1000, "height": 800},
                    # keep playing when the window is behind other windows
                    args=["--disable-background-timer-throttling",
                          "--disable-renderer-backgrounding",
                          "--disable-backgrounding-occluded-windows"],
                    locale="en-US" if args.english else "nl-NL", device_scale_factor=1)
        exe = os.environ.get("SPINDEL_CHROME")
        if exe:
            opts["executable_path"] = exe
        ctx = pw.chromium.launch_persistent_context(PROFILE, **opts)
        blocked = [0]

        def route(r):
            if AD_HOSTS.search(r.request.url):
                blocked[0] += 1
                r.abort()
            else:
                r.continue_()

        ctx.route("**/*", route)
        ctx.add_init_script("window.__S4R_CONFIG = %s;" % json.dumps(config))
        ctx.add_init_script(path=SCRIPT)
        pages = []
        for n in range(1, tabs + 1):
            page = ctx.pages[0] if (n == 1 and ctx.pages) else ctx.new_page()
            page.on("console", on_console(n))
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
        log(("gestopt (geblokkeerde advertenties: %d)" if not args.english else "stopped (ads blocked: %d)") % blocked[0])
        try:
            ctx.close()
        except Exception:
            pass


if __name__ == "__main__":
    main()
