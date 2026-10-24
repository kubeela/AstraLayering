"""Fetch public SAM 3 files, validating against Meta's public file metadata."""
import local_env
import hashlib
import json
from datetime import datetime, timezone
from urllib.parse import quote

from pip._vendor import requests
from transfers import verified_download


def get_json(url):
    response = requests.get(url, timeout=30)
    response.raise_for_status()
    return response.json()


def main():
    official = get_json("https://huggingface.co/api/models/facebook/sam3?blobs=true")
    mirror = get_json("https://modelscope.cn/api/v1/models/facebook/sam3/repo/files?Revision=master&Recursive=true")
    if not mirror.get("Success"):
        raise RuntimeError("ModelScope metadata request failed")
    mirror_files = {item["Path"]: item for item in mirror["Data"]["Files"]}
    destination = local_env.ROOT / "models" / "sam3"
    destination.mkdir(parents=True, exist_ok=True)
    manifest = {"model_id": "facebook/sam3", "official_hf_revision": official["sha"],
                "download_source": "https://modelscope.cn/models/facebook/sam3",
                "downloaded_at": datetime.now(timezone.utc).isoformat(), "files": []}
    for item in official["siblings"]:
        name = item["rfilename"]
        if not (name.endswith((".json", ".txt", ".safetensors")) or name in {"README.md", "LICENSE"}):
            continue
        source = mirror_files[name]
        if source["Size"] != item["size"]:
            raise RuntimeError(f"Official/mirror size mismatch: {name}")
        upstream_sha256 = item.get("lfs", {}).get("sha256")
        if upstream_sha256 and upstream_sha256 != source["Sha256"]:
            raise RuntimeError(f"Official/mirror SHA-256 mismatch: {name}")
        url = f'https://modelscope.cn/models/facebook/sam3/resolve/{source["Revision"]}/{quote(name)}'
        path = destination / name
        if source["Size"] > 16 * 1024 * 1024:
            verified_download(url, path, source["Size"], source["Sha256"],
                              local_env.ROOT / "cache" / "model-parts" / source["Sha256"])
        else:
            response = requests.get(url, timeout=60)
            response.raise_for_status()
            path.write_bytes(response.content)
        with path.open("rb") as stream:
            digest = hashlib.file_digest(stream, "sha256").hexdigest()
        if digest != mirror_files[name]["Sha256"]:
            raise RuntimeError(f"Mirror SHA-256 mismatch: {name}")
        if not upstream_sha256:
            contents = path.read_bytes()
            blob_id = hashlib.sha1(f"blob {len(contents)}\0".encode() + contents).hexdigest()
            if blob_id != item["blobId"]:
                raise RuntimeError(f"Official Git blob mismatch: {name}")
        manifest["files"].append({"name": name, "bytes": path.stat().st_size,
                                  "sha256": digest, "source_url": url,
                                  "official_identity_verified": True})
        print(f"Verified official identity: {name}", flush=True)
    if not (destination / "model.safetensors").is_file():
        raise RuntimeError("Model weights missing")
    (destination / "download-manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(f"Model ready: {destination}", flush=True)


if __name__ == "__main__":
    main()
