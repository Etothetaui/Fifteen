"""Focused level-ten interface using the existing exact-game adapter.

The adapter owns all transitions, previews, persistence and AI. This module
only selects assets and starts its existing HTTP transport.
"""
import argparse
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import threading
from urllib.parse import urlparse

HERE = Path(__file__).resolve().parent
from campaign import Campaign, Handler as GameHandler


class Handler(GameHandler):
    def do_GET(self):
        path = urlparse(self.path).path
        if path in ('/', '/relay.html', '/relay/', '/relay/index.html'):
            # The same page uses HTTP locally and Python-in-browser on Pages.
            body = (HERE / 'relay' / 'index.html').read_text(encoding='utf-8')
            body = body.replace('data-transport="browser"', 'data-transport="http"').encode('utf-8')
            self.send_response(200)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        assets = {"/relay-transport.js": "relay-transport.js",
                  "/relay.js": "relay.js", "/relay.css": "relay.css"}
        if path in assets:
            self.path = "/" + assets[path]
            # Retain the adapter's restricted API; never expose player saves.
            self.directory = str(HERE)
            return SimpleHTTPRequestHandler.do_GET(self)
        if path.startswith("/api/"):
            return super().do_GET()
        self.send_error(404)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=8093)
    parser.add_argument("--no-save", action="store_true")
    parser.add_argument("--open", action="store_true")
    args = parser.parse_args()
    server = ThreadingHTTPServer(("127.0.0.1", args.port), Handler)
    server.game_lock = threading.RLock()
    server.campaign = Campaign(None if args.no_save else HERE / "relay-save.json")
    print(f"Relay: http://127.0.0.1:{args.port}", flush=True)
    if args.open:
        import webbrowser
        webbrowser.open(f"http://127.0.0.1:{args.port}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
