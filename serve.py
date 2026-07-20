#!/usr/bin/env python3
"""Dev server for Travis Picker.

Same as `python3 -m http.server`, but sends no-store headers so the browser
never serves a stale ES module. Without this you have to hard-refresh after
every js/*.js edit (and module imports cache independently of the page).

    python3 serve.py [port]        # default 8137
"""
import sys
from functools import partial
from http.server import SimpleHTTPRequestHandler, test


class NoCacheHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, max-age=0")
        self.send_header("Pragma", "no-cache")
        super().end_headers()


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8137
    test(HandlerClass=partial(NoCacheHandler), port=port, bind="127.0.0.1")
