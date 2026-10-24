"""Verified, resumable HTTP range downloads for large public artifacts."""
import concurrent.futures
import hashlib
import time

from pip._vendor import requests


def verified_download(url, destination, size, expected_sha256, parts_dir, workers=8):
    def file_hash(path):
        with path.open("rb") as source:
            return hashlib.file_digest(source, "sha256").hexdigest()

    if destination.exists() and destination.stat().st_size == size:
        if file_hash(destination) == expected_sha256:
            print(f"Already verified: {destination.name}", flush=True)
            return
    destination.parent.mkdir(parents=True, exist_ok=True)
    parts_dir.mkdir(parents=True, exist_ok=True)
    chunk_size = 16 * 1024 * 1024
    jobs = [(index, start, min(size - 1, start + chunk_size - 1))
            for index, start in enumerate(range(0, size, chunk_size))]

    def download(job):
        index, start, end = job
        part = parts_dir / f"{index:04d}.part"
        length = end - start + 1
        if part.exists() and part.stat().st_size == length:
            return length
        for attempt in range(4):
            try:
                result = requests.get(url, headers={"Range": f"bytes={start}-{end}"}, timeout=(20, 90))
                result.raise_for_status()
                if (result.status_code != 206 or len(result.content) != length
                        or result.headers.get("Content-Range") != f"bytes {start}-{end}/{size}"):
                    raise RuntimeError("Range response mismatch")
                part.write_bytes(result.content)
                return length
            except Exception:
                if attempt == 3:
                    raise
                time.sleep(1 + attempt)

    completed = 0
    last_report = 0.0
    with concurrent.futures.ThreadPoolExecutor(max_workers=workers) as executor:
        for future in concurrent.futures.as_completed([executor.submit(download, job) for job in jobs]):
            completed += future.result()
            now = time.monotonic()
            if now - last_report > 10 or completed == size:
                print(f"{destination.name}: {completed / 1e6:.1f}/{size / 1e6:.1f} MB", flush=True)
                last_report = now
    digest = hashlib.sha256()
    with destination.open("wb") as output:
        for index, _, _ in jobs:
            with (parts_dir / f"{index:04d}.part").open("rb") as source:
                while data := source.read(4 * 1024 * 1024):
                    digest.update(data)
                    output.write(data)
    if digest.hexdigest() != expected_sha256:
        raise RuntimeError(f"SHA-256 mismatch: {destination.name}")
    print(f"Verified SHA-256: {expected_sha256}", flush=True)
