"""Keep this experiment's generated files inside sam_veirfy."""
import os
from pathlib import Path

ROOT = Path(__file__).resolve().parent
for key, relative in {
    "HF_HOME": "cache/huggingface",
    "HF_HUB_CACHE": "cache/huggingface/hub",
    "HF_XET_CACHE": "cache/huggingface/xet",
    "TORCH_HOME": "cache/torch",
    "PIP_CACHE_DIR": "cache/pip",
    "XDG_CACHE_HOME": "cache",
    "TEMP": "tmp",
    "TMP": "tmp",
}.items():
    destination = ROOT / relative
    destination.mkdir(parents=True, exist_ok=True)
    os.environ[key] = str(destination)
os.environ.setdefault("HF_HUB_DISABLE_TELEMETRY", "1")
