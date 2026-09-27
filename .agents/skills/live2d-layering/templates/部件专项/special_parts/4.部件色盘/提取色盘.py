"""特殊部件色盘的默认展示；采样与分类由调用者决定。"""
from pathlib import Path
import runpy


DEFAULTS = {
    "title": "特殊部件色盘 / 原图颜色与层次",
    "region": "特殊部件",
    "footer": "按实际材料与位置组织颜色；隐藏补色和透明材料推断注明依据，投影保持独立归属。",
    "groups": [
        [
            "base",
            "本体 · 固有色"
        ],
        [
            "volume",
            "内外与前后 · 体积层次"
        ],
        [
            "detail",
            "纹理与边缘"
        ],
        [
            "reflection",
            "反光与透明材料"
        ],
        [
            "comparison",
            "投影与高光 · 对照色"
        ]
    ]
}


if __name__ == '__main__':
    core = runpy.run_path(str(Path(__file__).resolve().parents[4] / 'tools' / 'extract_palette.py'))
    core['main'](defaults=DEFAULTS)
