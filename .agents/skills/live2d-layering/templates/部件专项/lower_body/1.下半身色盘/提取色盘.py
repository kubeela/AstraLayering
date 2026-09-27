"""下半身色盘的默认展示；采样位置、分类与方法由调用者决定。"""
from pathlib import Path
import runpy


DEFAULTS = {
    'title': '下半身色盘 / 肤色、连接与承影',
    'region': '下半身',
    'footer': '原图决定皮肤层次；上游腰口作为接口参考，隐藏补色注明推断，外来投影单独归属。',
    'groups': [('skin', '皮肤 · 基础色与冷暖'),
               ('volume', '形体 · 宽幅受光与局部起伏'),
               ('junction', '连接面 · 底色与过渡参考'),
               ('contour', '轮廓 · 线色与虚实'),
               ('comparison', '承影与独立高光 · 对照色')],
}


if __name__ == '__main__':
    core = runpy.run_path(str(Path(__file__).resolve().parents[4] / 'tools' / 'extract_palette.py'))
    core['main'](defaults=DEFAULTS)
