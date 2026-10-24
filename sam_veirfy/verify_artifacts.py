"""Verify archived SAM results with Python's standard library only."""
import hashlib
import json
from pathlib import Path

root = Path(__file__).resolve().parent / "outputs"
manifest = json.loads((root / "artifact-manifest.json").read_text(encoding="utf-8"))
for item in manifest["files"]:
    path = (root / item["path"]).resolve()
    if not path.is_relative_to(root.resolve()):
        raise RuntimeError(f"Artifact outside outputs: {item['path']}")
    content = path.read_bytes()
    if len(content) != item["bytes"] or hashlib.sha256(content).hexdigest() != item["sha256"]:
        raise RuntimeError(f"Artifact mismatch: {item['path']}")
report = json.loads((root / "elf-parts-e271df62/report.json").read_text(encoding="utf-8"))
assert len(report["results"]) == 158
for case in ["references", "assembled"]:
    rows = [item for item in report["results"] if item["case"] == case]
    assert len(rows) == 79 and len({item["key"] for item in rows}) == 79
assert all(a["prompt"] == b["prompt"] for a, b in zip(report["results"][:79], report["results"][79:]))
print(f"Verified {len(manifest['files'])} archived files, 158 results and 79 prompt pairs.")
