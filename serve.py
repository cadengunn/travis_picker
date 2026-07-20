#!/usr/bin/env python3
"""Dev server for Travis Picker.

Same as `python3 -m http.server`, but sends no-store headers so the browser
never serves a stale ES module. Without this you have to hard-refresh after
every js/*.js edit (and module imports cache independently of the page).

    python3 serve.py              # laptop only, http://localhost:8137
    python3 serve.py --lan        # also reachable from your phone
    python3 serve.py 9000 --lan   # ...on a different port

`--lan` binds to all interfaces so another device on the SAME Wi-Fi can load the
app (it prints the URL to type into your phone). That does expose the server to
your local network for as long as it runs, so it's opt-in rather than the
default. Plain HTTP over the LAN is fine for testing audio and tap targets;
installing as a PWA later needs HTTPS, which is what GitHub Pages is for.
"""
import socket
import sys
from functools import partial
from http.server import SimpleHTTPRequestHandler, test


class NoCacheHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, max-age=0")
        self.send_header("Pragma", "no-cache")
        super().end_headers()


def lan_ip():
    """Best guess at this machine's address on the local network."""
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("8.8.8.8", 80))  # no packets sent; just picks the route
        return s.getsockname()[0]
    except OSError:
        return "127.0.0.1"
    finally:
        s.close()


if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if a != "--lan"]
    share = "--lan" in sys.argv
    port = int(args[0]) if args else 8137

    if share:
        print(f"\n  On this phone/tablet (same Wi-Fi):  http://{lan_ip()}:{port}/index.html\n")

    test(HandlerClass=partial(NoCacheHandler), port=port,
         bind="0.0.0.0" if share else "127.0.0.1")
