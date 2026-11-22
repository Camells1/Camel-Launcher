"""
Spindel 4 analysis engine on localhost.

    python analyser.py

Opens http://localhost:8044 in your browser. Set up any position and the
engine shows the best move and in how many moves someone can force a win.
Only this computer can reach it (it listens on 127.0.0.1).
You can also just double-click analyse.html; it works without this server.
"""
import functools
import http.server
import os
import threading
import webbrowser

PORT = 8044
HERE = os.path.dirname(os.path.abspath(__file__))


def main():
    handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=HERE)
    server = http.server.ThreadingHTTPServer(("127.0.0.1", PORT), handler)
    url = "http://localhost:%d/analyse.html" % PORT
    print("Spindel 4 analyse draait op", url, " (stoppen: Ctrl+C)")
    threading.Timer(0.8, lambda: webbrowser.open(url)).start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
