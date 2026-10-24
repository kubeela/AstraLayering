"""Serve one generated gallery on an automatically selected loopback port."""
import argparse
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
import os
from pathlib import Path

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--run", default="elf-parts-e271df62")
parser.add_argument("--port", type=int, default=0)
args = parser.parse_args()
experiment_root = Path(__file__).resolve().parent
root = (experiment_root / "outputs" / args.run).resolve()
if not root.is_relative_to((experiment_root / "outputs").resolve()) or not (root / "index.html").is_file():
    parser.error("Run must be a completed gallery inside outputs")
server = ThreadingHTTPServer(("127.0.0.1", args.port), partial(SimpleHTTPRequestHandler, directory=str(root)))
url = f"http://127.0.0.1:{server.server_address[1]}/"
(root / "server.json").write_text(json.dumps({"pid": os.getpid(), "url": url}), encoding="utf-8")
print(url, flush=True)
server.serve_forever()
