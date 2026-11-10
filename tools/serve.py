"""Local test server that never caches, so edits and rebakes show up on reload.
Run from the repo root:  python tools/serve.py   then open http://localhost:8766
"""
import http.server
import sys


class NoCache(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()


if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8766
    http.server.ThreadingHTTPServer(('', port), NoCache).serve_forever()
