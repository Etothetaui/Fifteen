"""Temporary local artifact recorder, separate from the game and its runtime.

The browser posts the observer's diary through this form. This never chooses
moves, changes game state, or instruments either AI implementation.
"""
import base64
import json
import html
import sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs

ROOT = Path(__file__).resolve().parent


class Recorder(BaseHTTPRequestHandler):
    def do_GET(self):
        mark = 'o' if self.path == '/resume/o' else 'x'
        saved = ROOT / f'level4-playstudy-{mark}-browser-journal.json'
        initial = saved.read_text(encoding='utf-8') if saved.exists() and self.path in ('/resume', '/resume/o') else ''
        chunks = ''.join(f'<label>Saved part {i // 50000}<textarea aria-label="Saved part {i // 50000}">{html.escape(initial[i:i+50000])}</textarea></label>' for i in range(0, len(initial), 50000))
        body = f'''<!doctype html><title>Play study recorder</title>
        <form method="post"><label>Study log<textarea name="log" aria-label="Study log"></textarea></label>
        <button>Save log</button></form>{chunks}'''.encode('utf-8')
        self.send_response(200)
        self.send_header('Content-Type', 'text/html; charset=utf-8')
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self):
        raw = self.rfile.read(int(self.headers['Content-Length']))
        data = json.loads(parse_qs(raw.decode())['log'][0])
        mark = data['game'].lower()
        if mark not in ('x', 'o'):
            self.send_error(400)
            return
        picture = data.pop('screenshotJpegBase64', None)
        path = ROOT / f'level4-playstudy-{mark}-browser-journal.json'
        path.write_text(json.dumps(data, indent=2), encoding='utf-8')
        if picture:
            (ROOT / f'level4-playstudy-{mark}-checkpoint.jpg').write_bytes(base64.b64decode(picture))
        self.send_response(200)
        self.send_header('Content-Type', 'text/plain; charset=utf-8')
        self.end_headers()
        self.wfile.write(f'Saved {path.name}: {len(data["moves"])} moves.'.encode())


if __name__ == '__main__':
    ThreadingHTTPServer(('127.0.0.1', int(sys.argv[1]) if len(sys.argv) > 1 else 8001), Recorder).serve_forever()
