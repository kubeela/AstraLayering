"""Download the official Windows CUDA wheel with verified resumable ranges."""
import local_env
import concurrent.futures
import hashlib
from html.parser import HTMLParser
import re
import time
from urllib.parse import unquote, urljoin

from pip._vendor import requests

INDEX = "https://download.pytorch.org/whl/cu128/torch/"
FILENAME = "torch-2.10.0+cu128-cp312-cp312-win_amd64.whl"
DESTINATION = local_env.ROOT / "cache" / "wheels" / FILENAME
PARTS = local_env.ROOT / "cache" / "torch-parts"


class Links(HTMLParser):
    def __init__(self):
        super().__init__()
        self.links = []

    def handle_starttag(self, tag, attrs):
        if tag == "a":
            self.links.extend(value for key, value in attrs if key == "href")


def main():
    response = requests.get(INDEX, timeout=30)
    response.raise_for_status()
    parser = Links()
    parser.feed(response.text)
    matches = [link for link in parser.links if unquote(link).split("#")[0].endswith("/" + FILENAME)]
    if len(matches) != 1:
        raise RuntimeError(f"Expected one official wheel link, got {len(matches)}")
    url = urljoin(INDEX, matches[0])
    checksum_match = re.search(r"#sha256=([0-9a-f]{64})", url)
    if not checksum_match:
        raise RuntimeError("Official wheel SHA-256 unavailable")
    expected_hash = checksum_match.group(1)
    url = url.split("#")[0]
    probe = requests.get(url, headers={"Range": "bytes=0-0"}, timeout=30)
    probe.raise_for_status()
    total = int(probe.headers["Content-Range"].split("/")[-1])
    PARTS.mkdir(parents=True, exist_ok=True)
    DESTINATION.parent.mkdir(parents=True, exist_ok=True)
    chunk_size = 16 * 1024 * 1024
    jobs = [(index, start, min(total - 1, start + chunk_size - 1))
            for index, start in enumerate(range(0, total, chunk_size))]

    def download(job):
        index, start, end = job
        part = PARTS / f"{index:04d}.part"
        size = end - start + 1
        if part.exists() and part.stat().st_size == size:
            return size
        for attempt in range(4):
            try:
                result = requests.get(url, headers={"Range": f"bytes={start}-{end}"}, timeout=(20, 90))
                result.raise_for_status()
                if (result.status_code != 206 or len(result.content) != size
                        or result.headers.get("Content-Range") != f"bytes {start}-{end}/{total}"):
                    raise RuntimeError("Range response mismatch")
                part.write_bytes(result.content)
                return size
            except Exception as error:
                if attempt == 3:
                    raise
                print(f"Retry part {index}: {type(error).__name__}", flush=True)
                time.sleep(1 + attempt)

    completed = 0
    last_report = 0.0
    with concurrent.futures.ThreadPoolExecutor(max_workers=24) as executor:
        for future in concurrent.futures.as_completed([executor.submit(download, job) for job in jobs]):
            completed += future.result()
            now = time.monotonic()
            if now - last_report > 10 or completed == total:
                print(f"Downloaded {completed / 1e6:.1f}/{total / 1e6:.1f} MB", flush=True)
                last_report = now
    digest = hashlib.sha256()
    with DESTINATION.open("wb") as output:
        for index, _, _ in jobs:
            with (PARTS / f"{index:04d}.part").open("rb") as source:
                while data := source.read(4 * 1024 * 1024):
                    digest.update(data)
                    output.write(data)
    if digest.hexdigest() != expected_hash:
        raise RuntimeError("Official SHA-256 mismatch")
    print(f"Verified SHA-256: {expected_hash}", flush=True)
    print(DESTINATION, flush=True)


if __name__ == "__main__":
    main()
