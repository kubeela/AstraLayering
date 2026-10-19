"""物理饰品色盘的默认展示；采样与分类由调用者决定。"""
from pathlib import Path
import runpy


DEFAULTS = {
    "title": "物理饰品色盘 / 原图颜色与层次",
    "region": "物理饰品",
    "footer": "按实际材料与位置组织颜色；隐藏补色和透明材料推断注明依据，投影保持独立归属。",
    "groups": [
        [
            "base",
            "本体 · 固有色"
        ],
        [
            "volume",
            "形体 · 体积与局部层次"
        ],
        [
            "reflection",
            "材质 · 反光与通透"
        ],
        [
            "contour",
            "边缘与纹样"
        ],
        [
            "comparison",
            "投影与高光 · 对照色"
        ]
    ]
}


if __name__ == '__main__':
    core = runpy.run_path(str(next(p / 'tools/extract_palette.py' for p in Path(__file__).resolve().parents if (p / 'SKILL.md').is_file())))
    core['main'](defaults=DEFAULTS)
