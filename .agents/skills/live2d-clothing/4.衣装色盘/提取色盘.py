"""衣装色盘的可覆盖展示设置；采样方法和颜色分类由调用者决定。"""
from pathlib import Path
import runpy


DEFAULTS = {
    "title": "衣装色盘 / 穿搭各层与材料",
    "region": "衣装与附属配饰",
    "footer": "注明衣层、空间变化与材质；透明合成像素和推断本色分开，投影保留来源与目标。",
}


if __name__ == "__main__":
    core = runpy.run_path(str(Path(__file__).resolve().parents[2] / "live2d-layering" / "tools" / "extract_palette.py"))
    core["main"](defaults=DEFAULTS)
