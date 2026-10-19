"""手臂与手部色盘的默认展示；采样位置、分类与方法由调用者决定。"""
from pathlib import Path
import runpy


DEFAULTS = {
    'title': '手臂与手部色盘 / 肤色与局部层次',
    'region': '手臂与手部',
    'footer': '原图决定皮肤层次；肩口参照与隐藏补色注明来源，承影颜色保留用途。',
    'groups': [('skin', '皮肤 · 基础色与冷暖'),
               ('volume', '形体 · 手臂、掌面与指节'),
               ('junction', '连接面 · 肩肘腕与指根'),
               ('nail', '甲面 · 实际颜色与层次'),
               ('contour', '轮廓 · 线色与虚实'),
               ('comparison', '承影与独立高光 · 对照色')],
}


if __name__ == '__main__':
    core = runpy.run_path(str(next(p / 'tools/extract_palette.py' for p in Path(__file__).resolve().parents if (p / 'SKILL.md').is_file())))
    core['main'](defaults=DEFAULTS)
