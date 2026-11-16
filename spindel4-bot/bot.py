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
                    choices=["climb", "Easy", "Medium", "Hard", "Expert", "all"],
                    help="difficulty (climb = move up after 3 wins, all = take turns)")
    ap.add_argument("--think", type=float, default=3, help="seconds to think per move")
    ap.add_argument("--games", type=int, default=0, help="stop after this many games (0 = never)")
    ap.add_argument("--headless", action="store_true", help="hide the browser window")
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
    done = {"flag": False}

    def on_console(msg):
        t = msg.text
        if t.startswith("[S4R]"):
            log(t[6:])
            if t.strip() == "[S4R] DONE":
                done["flag"] = True

    with sync_playwright() as pw:
        opts = dict(headless=args.headless, viewport={"width": 1000, "height": 800},
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
        page = ctx.pages[0] if ctx.pages else ctx.new_page()
        page.on("console", on_console)
        log("openen:" if not args.english else "opening", URL, "(advertenties geblokkeerd)" if not args.english else "(ad blocker on)")
        page.goto(URL, wait_until="domcontentloaded", timeout=90000)
        try:
            while not done["flag"] and not page.is_closed():
                page.wait_for_timeout(1000)
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
