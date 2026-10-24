import local_env
import importlib.metadata
import json
import platform
import sys
from datetime import datetime, timezone

import torch
import torchvision
from transformers import Sam3Model, Sam3Processor

assert torch.cuda.is_available(), "CUDA unavailable"
x = torch.ones((64, 64), device="cuda")
assert (x @ x).mean().item() == 64.0
result = {
    "checked_at": datetime.now(timezone.utc).isoformat(),
    "python": platform.python_version(),
    "executable": sys.executable,
    "torch": torch.__version__,
    "torchvision": torchvision.__version__,
    "transformers": importlib.metadata.version("transformers"),
    "cuda_runtime": torch.version.cuda,
    "gpu": torch.cuda.get_device_name(0),
    "gpu_memory_bytes": torch.cuda.get_device_properties(0).total_memory,
    "gpu_matmul_passed": True,
    "sam3_classes_imported": True,
}
output = local_env.ROOT / "outputs" / "environment.json"
output.parent.mkdir(exist_ok=True)
output.write_text(json.dumps(result, indent=2), encoding="utf-8")
print(json.dumps(result, indent=2))
