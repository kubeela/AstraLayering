"""独立对象色盘的默认展示；采样与分类由调用者决定。"""
from pathlib import Path
import runpy


DEFAULTS = {
    "title": "独立对象色盘 / 原图颜色与层次",
    "region": "独立对象",
    "footer": "按实际材料与位置组织颜色；隐藏补色和透明材料推断注明依据，投影保持独立归属。",
    "groups": [
        [
            "base",
            "本体 · 基础色"
        ],
        [
            "volume",
            "各面 · 体积与渐变"
        ],
        [
            "detail",
            "边缘与纹理"
        ],
        [
            "effect",
            "透明、反光与发光"
        ],
        [
            "comparison",
            "投影 · 对照色"
        ]
    ]
}


if __name__ == '__main__':
    core = runpy.run_path(str(Path(__file__).resolve().parents[1] / 'extract_palette.py'))
    core['main'](defaults=DEFAULTS)
