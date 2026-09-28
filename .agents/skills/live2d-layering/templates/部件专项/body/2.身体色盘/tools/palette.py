"""身体色盘的默认展示设置；取样方法和分类由调用者按原图决定。"""
from pathlib import Path
import runpy


DEFAULTS = {
    'title': '身体色盘 / 肤色、体积与承影',
    'region': '身体',
    'footer': '按原图位置区分身体自身明暗和外来投影；衣下补色注明推断，接口色供后续部件接续。',
    'groups': [('skin', '身体 · 基础肤色与冷暖'),
               ('volume', '身体 · 自身体积与柔和起伏'),
               ('junction', '连接面 · 底色与过渡参考'),
               ('contour', '轮廓 · 线色与虚实'),
               ('comparison', '承影与独立高光 · 对照色')],
}


if __name__ == '__main__':
    core = runpy.run_path(str(next(p / 'tools/extract_palette.py' for p in Path(__file__).resolve().parents if (p / 'SKILL.md').is_file())))
    core['main'](defaults=DEFAULTS)
